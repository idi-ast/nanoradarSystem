import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { RadarTarget, RawRadarPayload, CamaraActividad } from "../types";
import { TARGET_TIMING } from "../config";
import type { TargetTimingConfig } from "../config";

/** Tiempo en ms que las actividades de cámara permanecen activas sin nuevo mensaje */
const ACTIVITY_TIMEOUT_MS = 15_000;
/** Intervalo de actualización de la UI (10 segundos según tu requerimiento) */
const SET_TIME_INTERVAL_MS = 3000;

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

export function useRadarWebSocket(
  url: string,
  timing: TargetTimingConfig = TARGET_TIMING,
) {
  const [targetsMap, setTargetsMap] = useState<Map<string, RadarTarget>>(new Map());
  const [cameraActivities, setCameraActivities] = useState<CamaraActividad[]>([]);

  // Buffer para acumular datos del WebSocket sin disparar re-renders constantes
  const bufferRef = useRef<{
    nanoRadar: RawRadarPayload["nanoRadar"];
    spotter: RawRadarPayload["spotter"];
    camaras: CamaraActividad[];
  }>({
    nanoRadar: [],
    spotter: [],
    camaras: [],
  });

  const clearTargets = useCallback(() => {
    setTargetsMap(new Map());
    bufferRef.current = { nanoRadar: [], spotter: [], camaras: [] };
  }, []);

  useEffect(() => {
    if (!url || !url.startsWith("ws")) return;

    const ws = new WebSocket(url);

    // 1. Escuchar el WebSocket y llenar el buffer
    ws.onmessage = (event: MessageEvent) => {
      try {
        const parsed = JSON.parse(event.data as string) as RawRadarPayload;
        
        if (parsed && typeof parsed === "object") {
          // Acumulamos o reemplazamos los datos en el buffer
          if (parsed.nanoRadar) bufferRef.current.nanoRadar = parsed.nanoRadar;
          if (parsed.spotter) bufferRef.current.spotter = parsed.spotter;
          if (parsed.actividad?.camaras) {
            bufferRef.current.camaras = parsed.actividad.camaras as CamaraActividad[];
          }
        }
      } catch (err) {
        console.error("[useRadarWebSocket] Error parseando mensaje:", err);
      }
    };

    // 2. Intervalo de Procesamiento: Actualiza el estado de React cada X tiempo
    const processingInterval = setInterval(() => {
      const { nanoRadar, spotter, camaras } = bufferRef.current;
      const now = Date.now();

      // Si no hay datos nuevos, no forzamos el render
      if (nanoRadar.length === 0 && spotter.length === 0 && camaras.length === 0) return;

      setTargetsMap((prev) => {
        const next = new Map(prev);
        processDeviceMessages(next, nanoRadar, "nanoRadar", now, timing.HISTORY_MAX_POINTS);
        processDeviceMessages(next, spotter, "spotter", now, timing.HISTORY_MAX_POINTS);
        return next;
      });

      if (camaras.length > 0) {
        setCameraActivities(camaras.map((a) => ({ ...a, timestamp: now })));
      }

      // Limpiamos el buffer tras procesar para no duplicar en el siguiente ciclo
      bufferRef.current = { nanoRadar: [], spotter: [], camaras: [] };
    }, SET_TIME_INTERVAL_MS);

    // 3. Intervalo de Limpieza: Elimina targets inactivos
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

    ws.onerror = (err) => console.error("[useRadarWebSocket] Error de conexión:", err);

    // Limpieza al desmontar el componente
    return () => {
      ws.close();
      clearInterval(processingInterval);
      clearInterval(cleanupInterval);
    };
  }, [url, timing.HISTORY_MAX_POINTS, timing.TARGET_TIMEOUT_MS]);

  const targets = useMemo(() => Array.from(targetsMap.values()), [targetsMap]);

  return {
    targets,
    clearTargets,
    cameraActivities,
  };
}