import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { RadarTarget, RawRadarPayload, CamaraActividad } from "../types";
import { TARGET_TIMING } from "../config";
import type { TargetTimingConfig } from "../config";

/** Tiempo en ms que las actividades de cámara permanecen activas sin nuevo mensaje */
const ACTIVITY_TIMEOUT_MS = 15_000;
/** Intervalo de actualización de la UI */
const SET_TIME_INTERVAL_MS = 3000;
/** Backoff de reconexión: [1s, 2s, 4s, 8s, 16s, 30s] */
const RECONNECT_DELAYS_MS = [1000, 2000, 4000, 8000, 16000, 30000];

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
 * El backend envía `trackId` (ej: "T3") para identificar el vehículo,
 * junto con `trackColor` para colorear de forma estable en el frontend.
 * Todos los puntos de un mismo track en un barrido se agrupan en una sola trayectoria.
 */
function processMagosradarMessages(
  next: Map<string, RadarTarget>,
  messages: RawRadarPayload["magosradar"],
  now: number,
  historyMaxPoints: number,
) {
  // Agrupar por trackId (enviado por el backend)
  const byTrack = new Map<string, { points: RawRadarPayload["magosradar"]; color: string }>();
  for (const raw of messages) {
    const tid = raw.trackId ?? String(raw.id).split("_")[0];
    const color = raw.trackColor ?? "#f43f5e";
    if (!byTrack.has(tid)) byTrack.set(tid, { points: [], color });
    byTrack.get(tid)!.points.push(raw);
  }

  for (const [trackId, { points, color }] of byTrack) {
    const targetId = `magosradar_${trackId}`;

    // Todos los puntos del barrido actual van al historial
    const newPoints: [number, number, number][] = points.map((p) => [p.lat, p.lon, now]);

    const existing = next.get(targetId);
    const history: [number, number, number][] = existing
      ? [...existing.history, ...newPoints].slice(-historyMaxPoints)
      : newPoints;

    // Centroide como posición principal
    const centroidLat = points.reduce((s, p) => s + p.lat, 0) / points.length;
    const centroidLon = points.reduce((s, p) => s + p.lon, 0) / points.length;

    // Máximo nivel entre todos los puntos del track
    const maxNivel = Math.max(...points.map((p) => p.nivel));

    next.set(targetId, {
      id: targetId,
      lat: centroidLat,
      lon: centroidLon,
      nivel: maxNivel,
      zona: points[0].zona,
      deviceType: "magosradar",
      lastUpdate: now,
      history,
      trackColor: color,
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