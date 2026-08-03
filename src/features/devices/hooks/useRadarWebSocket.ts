import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { RadarTarget, RawRadarPayload, CamaraActividad } from "../types";
import { TARGET_TIMING } from "../config";
import type { TargetTimingConfig } from "../config";

/** Tiempo en ms que las actividades de cámara permanecen activas sin nuevo mensaje */
const ACTIVITY_TIMEOUT_MS = 10_000;
/** Intervalo de procesamiento del buffer WS (5 FPS ≈ 200ms) */
const SET_TIME_INTERVAL_MS = 2;
/** Backoff de reconexión: [1s, 2s, 4s, 8s, 16s, 30s] */
const RECONNECT_DELAYS_MS = [1000, 2000, 4000, 8000, 16000, 30000];

// ─────────────────────────────────────────────
// Suavizado y validación de tracks MagosRadar
// ─────────────────────────────────────────────

/** 1 grado de latitud ≈ 111,320 metros */
const METERS_PER_DEG_LAT = 111_320;
/** Ajuste por latitud para longitud (aproximado para ~41°S, latitud típica) */
const METERS_PER_DEG_LON = METERS_PER_DEG_LAT * Math.cos((-41.5 * Math.PI) / 180);

/** Velocidad máxima realista para tráfico denso en avenida (m/s).
 *  60 km/h ≈ 16.67 m/s. Por encima de esto, se aplica clamp. */
const MAX_REALISTIC_SPEED_MS = 16.67;

/** Factor de suavizado EMA para posición (0-1). Valores más bajos = más suavizado.
 *  0.25 significa que cada nuevo punto pesa 25% y el histórico 75%. */
const EMA_SMOOTH_FACTOR = 0.25;

/** Cada cuántos ciclos de procesamiento se limpian los tracks inactivos (~30s) */
const TRACK_STATE_CLEANUP_INTERVAL = 15_000;
/** Tiempo sin actividad para eliminar el estado de un track */
const TRACK_STATE_TTL_MS = 120_000;

/** Estado persistente por track para suavizado y validación de velocidad */
interface TrackKinematicState {
  /** Última posición suavizada (EMA) */
  smoothedLat: number;
  smoothedLon: number;
  /** Última posición cruda recibida */
  lastRawLat: number;
  lastRawLon: number;
  /** Timestamp de la última actualización */
  lastUpdateMs: number;
  /** Velocidad estimada en grados/ms (lat, lon) */
  velLat: number;
  velLon: number;
  /** Contador de puntos consecutivos clampados (para detectar tracks ruidosos) */
  clampCount: number;
}

/** Mapa global de estado cinemático por trackId. Persiste entre barridos. */
const trackKinematics = new Map<string, TrackKinematicState>();
let lastCleanupTime = Date.now();

/** Distancia aproximada en metros entre dos puntos (fórmula plana, suficiente para tracks cercanos) */
function distMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = (lat2 - lat1) * METERS_PER_DEG_LAT;
  const dLon = (lon2 - lon1) * METERS_PER_DEG_LON;
  return Math.sqrt(dLat * dLat + dLon * dLon);
}

/** Limpia tracks inactivos del mapa de estado cinemático */
function cleanupTrackStates(now: number): void {
  for (const [tid, state] of trackKinematics) {
    if (now - state.lastUpdateMs > TRACK_STATE_TTL_MS) {
      trackKinematics.delete(tid);
    }
  }
}

function processDeviceMessages(
  next: Map<string, RadarTarget>,
  messages: RawRadarPayload["nanoRadar"],
  deviceType: "nanoRadar" | "spotter",
  now: number,
  historyMaxPoints: number,
) {
  messages.forEach((raw) => {
    const id = `${deviceType}_${raw.id}`;
    const currentPos: [number, number, number] = [raw.lat, raw.lon, now];
    const existing = next.get(id);

    const history: [number, number, number][] = existing
      ? [...existing.history, currentPos].slice(-historyMaxPoints)
      : [currentPos];

    next.set(id, {
      id,
      lat: raw.lat,
      lon: raw.lon,
      nivel: raw.nivel,
      zona: raw.zona,
      deviceType,
      lastUpdate: now,
      history,
    });
  });
}

/**
 * Procesa detecciones de magosRadar agrupando por trackId.
 *
 * Mejoras de realismo:
 * - Suavizado EMA de posición para eliminar jitter.
 * - Validación de velocidad máxima: si un punto implicaría >60 km/h en tráfico
 *   denso, se aplica clamp a la posición máxima permitida por la velocidad realista.
 * - Estado cinemático persistente entre barridos (predicción por velocidad).
 *
 * El backend envía `trackId` (ej: "T182") para identificar el vehículo,
 * `trackPoints` para ordenar los puntos dentro del track,
 * `trackColor` para colorear de forma estable,
 * y `speed` para la velocidad de cada punto.
 * Todos los puntos de un mismo track en un barrido se agrupan en una sola trayectoria.
 */
function processMagosradarMessages(
  next: Map<string, RadarTarget>,
  messages: RawRadarPayload["magosradar"],
  now: number,
  historyMaxPoints: number,
) {
  // Limpieza periódica de estados inactivos
  if (now - lastCleanupTime > TRACK_STATE_CLEANUP_INTERVAL) {
    cleanupTrackStates(now);
    lastCleanupTime = now;
  }

  // Agrupar por trackId (enviado por el backend)
  const byTrack = new Map<string, { points: RawRadarPayload["magosradar"]; color: string }>();
  for (const raw of messages) {
    const tid = raw.trackId ?? String(raw.id).split("_")[0];
    const color = raw.trackColor ?? "#f43f5e";
    if (!byTrack.has(tid)) byTrack.set(tid, { points: [], color });
    byTrack.get(tid)!.points.push(raw);
  }

  for (const [trackId, { points, color }] of byTrack) {
    // Ordenar por trackPoints ascendente para mantener el trazo correcto
    points.sort((a, b) => (a.trackPoints ?? 0) - (b.trackPoints ?? 0));

    const targetId = `magosradar_${trackId}`;

    // ── Obtener o inicializar estado cinemático del track ──
    let kin = trackKinematics.get(trackId);
    if (!kin) {
      const first = points[0];
      kin = {
        smoothedLat: first.lat,
        smoothedLon: first.lon,
        lastRawLat: first.lat,
        lastRawLon: first.lon,
        lastUpdateMs: now,
        velLat: 0,
        velLon: 0,
        clampCount: 0,
      };
      trackKinematics.set(trackId, kin);
    }

    // ── Procesar cada punto con validación de velocidad y suavizado ──
    const dt = Math.max(now - kin.lastUpdateMs, 1); // al menos 1ms para evitar división por cero

    const smoothedPoints: typeof points = [];
    let totalClampedThisSweep = 0;

    for (const p of points) {
      // Distancia desde la última posición suavizada
      const d = distMeters(kin.smoothedLat, kin.smoothedLon, p.lat, p.lon);
      const impliedSpeedMs = d / (dt / 1000); // m/s

      let useLat: number;
      let useLon: number;

      if (impliedSpeedMs > MAX_REALISTIC_SPEED_MS && kin.clampCount < 3) {
        // ── CLAMP: el punto implicaría una velocidad irreal (>60 km/h) ──
        // Lo limitamos al desplazamiento máximo permitido desde la última posición suavizada
        const maxDistMeters = MAX_REALISTIC_SPEED_MS * (dt / 1000);
        const scale = d > 0 ? maxDistMeters / d : 0;

        const predictedLat = kin.smoothedLat + kin.velLat * dt;
        const predictedLon = kin.smoothedLon + kin.velLon * dt;

        useLat = predictedLat + (p.lat - predictedLat) * scale;
        useLon = predictedLon + (p.lon - predictedLon) * scale;

        kin.clampCount++;
        totalClampedThisSweep++;
      } else {
        // ── Suavizado EMA: mezclar posición cruda con la suavizada anterior ──
        useLat = kin.smoothedLat + EMA_SMOOTH_FACTOR * (p.lat - kin.smoothedLat);
        useLon = kin.smoothedLon + EMA_SMOOTH_FACTOR * (p.lon - kin.smoothedLon);

        // Resetear contador de clamp si el punto es válido
        if (kin.clampCount > 0 && impliedSpeedMs <= MAX_REALISTIC_SPEED_MS) {
          kin.clampCount = Math.max(0, kin.clampCount - 1);
        }
      }

      // Actualizar estado cinemático
      const prevSmoothedLat = kin.smoothedLat;
      const prevSmoothedLon = kin.smoothedLon;

      kin.smoothedLat = useLat;
      kin.smoothedLon = useLon;
      kin.lastRawLat = p.lat;
      kin.lastRawLon = p.lon;
      kin.lastUpdateMs = now;
      kin.velLat = (useLat - prevSmoothedLat) / dt;
      kin.velLon = (useLon - prevSmoothedLon) / dt;

      // Punto suavizado para el historial
      smoothedPoints.push({ ...p, lat: useLat, lon: useLon });
    }

    // Si más del 50% de los puntos fueron clampados, es un track ruidoso: usar solo el último válido
    const effectivePoints =
      totalClampedThisSweep > points.length * 0.5 && smoothedPoints.length > 1
        ? [smoothedPoints[smoothedPoints.length - 1]]
        : smoothedPoints;

    // Todos los puntos del barrido actual (ya suavizados) van al historial
    const newPoints: [number, number, number][] = effectivePoints.map((p) => [p.lat, p.lon, now]);

    const existing = next.get(targetId);
    const history: [number, number, number][] = existing
      ? [...existing.history, ...newPoints].slice(-historyMaxPoints)
      : newPoints;

    // Posición principal: última posición suavizada del track
    const mainLat = kin.smoothedLat;
    const mainLon = kin.smoothedLon;

    // Máximo nivel entre todos los puntos del track
    const maxNivel = Math.max(...points.map((p) => p.nivel));

    // Velocidad del último punto (mayor trackPoints)
    const lastPoint = points[points.length - 1];
    const speed = lastPoint.speed;
    const confidence = lastPoint.confidence;
    const isStationary = lastPoint.isStationary;
    // Tomar SNR, RCS, heading, trackState del punto con mejor SNR dentro del track
    let bestSnr = -Infinity;
    let snr = points[0].snr;
    let rcs = points[0].rcs;
    let heading = points[0].heading;
    let trackState = points[0].trackState;
    for (const p of points) {
      if ((p.snr ?? -Infinity) > bestSnr) {
        bestSnr = p.snr ?? -Infinity;
        snr = p.snr;
        rcs = p.rcs;
        heading = p.heading;
        trackState = p.trackState;
      }
    }

    next.set(targetId, {
      id: targetId,
      lat: mainLat,
      lon: mainLon,
      nivel: maxNivel,
      zona: points[0].zona,
      deviceType: "magosradar",
      lastUpdate: now,
      history,
      trackColor: color,
      speed,
      snr,
      rcs,
      heading,
      trackState,
      confidence,
      isStationary,
    });
  }
}

export type WsStatus = "connecting" | "connected" | "disconnected" | "reconnecting";

export function useRadarWebSocket(
  url: string,
  timing: TargetTimingConfig = TARGET_TIMING,
) {
  const [targetsMap, setTargetsMap] = useState<Map<string, RadarTarget>>(new Map());
  const [cameraActivities, setCameraActivities] = useState<CamaraActividad[]>([]);
  const [wsStatus, setWsStatus] = useState<WsStatus>("connecting");

  const bufferRef = useRef<{
    nanoRadar: RawRadarPayload["nanoRadar"];
    magosRadar: RawRadarPayload["magosradar"];
    spotter: RawRadarPayload["spotter"];
    camaras: CamaraActividad[];
  }>({
    nanoRadar: [],
    magosRadar: [],
    spotter: [],
    camaras: [],
  });

  const clearTargets = useCallback(() => {
    setTargetsMap(new Map());
    bufferRef.current = { nanoRadar: [], magosRadar: [], spotter: [], camaras: [] };
  }, []);

  useEffect(() => {
    if (!url || !url.startsWith("ws")) return;

    let destroyed = false;
    let retryCount = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let ws: WebSocket | null = null;

    const processingInterval = setInterval(() => {
      const { nanoRadar, magosRadar, spotter, camaras } = bufferRef.current;
      const now = Date.now();

      if (nanoRadar.length === 0 && magosRadar.length === 0 && spotter.length === 0 && camaras.length === 0) return;

      setTargetsMap((prev) => {
        const next = new Map(prev);
        processDeviceMessages(next, nanoRadar, "nanoRadar", now, timing.HISTORY_MAX_POINTS);
        processMagosradarMessages(next, magosRadar, now, timing.HISTORY_MAX_POINTS);
        processDeviceMessages(next, spotter, "spotter", now, timing.HISTORY_MAX_POINTS);
        return next;
      });

      if (camaras.length > 0) {
        setCameraActivities(camaras.map((a) => ({ ...a, timestamp: now })));
      }

      bufferRef.current = { nanoRadar: [], magosRadar: [], spotter: [], camaras: [] };
    }, SET_TIME_INTERVAL_MS);

    const cleanupInterval = setInterval(() => {
      const now = Date.now();

      setTargetsMap((prev) => {
        const next = new Map(prev);
        let changed = false;
        for (const [id, target] of next.entries()) {
          if (now - target.lastUpdate > timing.TARGET_TIMEOUT_MS) {
            next.delete(id);
            changed = true;
          }
        }
        return changed ? next : prev;
      });

      setCameraActivities((prev) => {
        const active = prev.filter(
          (a) => now - (a.timestamp ?? 0) < ACTIVITY_TIMEOUT_MS,
        );
        return active.length === prev.length ? prev : active;
      });
    }, timing.TARGET_TIMEOUT_MS);

    function connect() {
      if (destroyed) return;
      setWsStatus(retryCount === 0 ? "connecting" : "reconnecting");

      ws = new WebSocket(url);

      ws.onopen = () => {
        if (destroyed) { ws?.close(); return; }
        retryCount = 0;
        setWsStatus("connected");
      };

      ws.onmessage = (event: MessageEvent) => {
        try {
          const parsed = JSON.parse(event.data as string) as RawRadarPayload & { magosRadar?: RawRadarPayload["magosradar"] };
          if (parsed && typeof parsed === "object") {
            if (parsed.nanoRadar) bufferRef.current.nanoRadar = parsed.nanoRadar;
            if (parsed.magosRadar) bufferRef.current.magosRadar = parsed.magosRadar;
            if (parsed.spotter) bufferRef.current.spotter = parsed.spotter;
            if (parsed.actividad?.camaras) {
              bufferRef.current.camaras = parsed.actividad.camaras as CamaraActividad[];
            }
          }
        } catch (err) {
          console.error("[useRadarWebSocket] Error parseando mensaje:", err);
        }
      };

      ws.onerror = () => {
        // El error ya dispara onclose; solo logueamos en desarrollo
        if (import.meta.env.DEV) {
          console.warn("[useRadarWebSocket] Error de conexión con", url);
        }
      };

      ws.onclose = () => {
        if (destroyed) return;
        setWsStatus("disconnected");
        const delay = RECONNECT_DELAYS_MS[Math.min(retryCount, RECONNECT_DELAYS_MS.length - 1)];
        retryCount += 1;
        if (import.meta.env.DEV) {
          console.info(`[useRadarWebSocket] Reconectando en ${delay / 1000}s (intento ${retryCount})…`);
        }
        retryTimer = setTimeout(connect, delay);
      };
    }

    connect();

    return () => {
      destroyed = true;
      if (retryTimer !== null) clearTimeout(retryTimer);
      ws?.close();
      clearInterval(processingInterval);
      clearInterval(cleanupInterval);
    };
  }, [url, timing.HISTORY_MAX_POINTS, timing.TARGET_TIMEOUT_MS]);

  const targets = useMemo(() => Array.from(targetsMap.values()), [targetsMap]);

  return {
    targets,
    clearTargets,
    cameraActivities,
    wsStatus,
  };
}