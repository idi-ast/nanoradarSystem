import { useState, useEffect, useCallback } from "react";
import type { RadarTarget, RawRadarPayload } from "../types";

const WS_URL = import.meta.env.VITE_SOCKET_URL as string;
const TARGET_TIMEOUT_MS = 120_000; // 2 minutos sin actualización = eliminar

function processDeviceMessages(
  next: Map<string, RadarTarget>,
  messages: RawRadarPayload["nanoRadar"],
  deviceType: "nanoRadar" | "spotter",
  now: number
) {
  messages.forEach((raw) => {
    // Prefijo por tipo para evitar colisiones entre dispositivos
    const id = `${deviceType}_${raw.id}`;
    const currentPos: [number, number, number] = [raw.lat, raw.lon, now];
    const existing = next.get(id);

    const history: [number, number, number][] = existing
      ? [...existing.history, currentPos].slice(-500)
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
 * Hook que conecta al WebSocket nativo del backend del radar
 * y mantiene el mapa de objetivos detectados en tiempo real.
 * Soporta el nuevo formato: { nanoRadar: [...], spotter: [...] }
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
        const parsed = JSON.parse(event.data as string);
        const now = Date.now();

        setTargetsMap((prev) => {
          const next = new Map(prev);

          // Nuevo formato: { nanoRadar: [], spotter: [] }
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            const payload = parsed as RawRadarPayload;
            processDeviceMessages(next, payload.nanoRadar ?? [], "nanoRadar", now);
            processDeviceMessages(next, payload.spotter ?? [], "spotter", now);
          }

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
