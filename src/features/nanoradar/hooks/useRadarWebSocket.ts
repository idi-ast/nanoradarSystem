import { useState, useEffect, useCallback, useMemo } from "react";
import type { RadarTarget, RawRadarPayload, CamaraActividad } from "../types";
import { TARGET_TIMING } from "../config";
import type { TargetTimingConfig } from "../config";

/** Tiempo en ms que las actividades de cámara permanecen activas sin nuevo mensaje */
const ACTIVITY_TIMEOUT_MS = 15_000;

function processDeviceMessages(
  next: Map<string, RadarTarget>,
  messages: RawRadarPayload["nanoRadar"],
  deviceType: "nanoRadar" | "spotter",
  now: number,
  historyMaxPoints: number
) {
  messages.forEach((raw) => {
    // Prefijo por tipo para evitar colisiones entre dispositivos
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
  timing: TargetTimingConfig = TARGET_TIMING
) {
  const [targetsMap, setTargetsMap] = useState<Map<string, RadarTarget>>(
    new Map()
  );
  const [cameraActivities, setCameraActivities] = useState<CamaraActividad[]>([]);

  const clearTargets = useCallback(() => {
    setTargetsMap(new Map());
  }, []);

  useEffect(() => {
    if (!url || !url.startsWith("ws")) return;
    const ws = new WebSocket(url);

    ws.onmessage = (event: MessageEvent) => {
      try {
        const parsed = JSON.parse(event.data as string);
        const now = Date.now();

        setTargetsMap((prev) => {
          const next = new Map(prev);

          // Nuevo formato: { nanoRadar: [], spotter: [], actividad?: {...} }
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            const payload = parsed as RawRadarPayload;
            processDeviceMessages(next, payload.nanoRadar ?? [], "nanoRadar", now, timing.HISTORY_MAX_POINTS);
            processDeviceMessages(next, payload.spotter ?? [], "spotter", now, timing.HISTORY_MAX_POINTS);
          }

          return next;
        });

        // Procesar actividades de cámara
        if (parsed?.actividad?.camaras && Array.isArray(parsed.actividad.camaras)) {
          const now = Date.now();
          const activities: CamaraActividad[] = (parsed.actividad.camaras as CamaraActividad[]).map(
            (a) => ({ ...a, timestamp: now })
          );
          setCameraActivities(activities);
        }
      } catch (err) {
        console.error("[useRadarWebSocket] Error procesando mensaje:", err);
      }
    };

    ws.onerror = (err) => {
      console.error("[useRadarWebSocket] Error de conexión:", err);
    };

    // Limpiar objetivos que ya no son reportados por el radar
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

      // Expirar actividades de cámara
      setCameraActivities((prev) => {
        if (prev.length === 0) return prev;
        const active = prev.filter((a) => now - (a.timestamp ?? 0) < ACTIVITY_TIMEOUT_MS);
        return active.length === prev.length ? prev : active;
      });
    }, timing.TARGET_TIMEOUT_MS);

    return () => {
      ws.close();
      clearInterval(cleanupInterval);
    };
  }, [url]);

  const targets = useMemo(() => Array.from(targetsMap.values()), [targetsMap]);

  return {
    targets,
    clearTargets,
    cameraActivities,
  };
}
