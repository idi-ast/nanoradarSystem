import { useState, useEffect, useCallback } from "react";
import type { RadarTarget, RawRadarMessage } from "../types";

const WS_URL = import.meta.env.VITE_SOCKET_URL as string;
const TARGET_TIMEOUT_MS = 10_000; // 2 minutos sin actualización = eliminar

/**
 * Hook que conecta al WebSocket nativo del backend del radar
 * y mantiene el mapa de objetivos detectados en tiempo real.
 */
export function useRadarWebSocket(url: string = WS_URL) {
  const [targetsMap, setTargetsMap] = useState<Map<string, RadarTarget>>(
    new Map()
  );

  const clearTargets = useCallback(() => {
    setTargetsMap(new Map());
  }, []);

  useEffect(() => {
    if (!url || !url.startsWith("ws")) return;
    const ws = new WebSocket(url);

    ws.onmessage = (event: MessageEvent) => {
      try {
        const parsed: RawRadarMessage | RawRadarMessage[] = JSON.parse(event.data as string);
        const payload: RawRadarMessage[] = Array.isArray(parsed) ? parsed : [parsed];
        const now = Date.now();

        setTargetsMap((prev) => {
          const next = new Map(prev);

          payload.forEach((raw) => {
            const id = String(raw.id);
            const currentPos: [number, number] = [raw.lat, raw.lon];
            const existing = next.get(id);

            const history: [number, number][] = existing
              ? [...existing.history, currentPos].slice(-500)
              : [currentPos];

            next.set(id, {
              id,
              lat: raw.lat,
              lon: raw.lon,
              nivel: raw.nivel,
              zona: raw.zona,
              lastUpdate: now,
              history,
            });
          });

          return next;
        });
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
          if (now - target.lastUpdate > TARGET_TIMEOUT_MS) {
            next.delete(id);
            changed = true;
          }
        }

        return changed ? next : prev;
      });
    }, TARGET_TIMEOUT_MS);

    return () => {
      ws.close();
      clearInterval(cleanupInterval);
    };
  }, [url]);

  return {
    targets: Array.from(targetsMap.values()),
    clearTargets,
  };
}
