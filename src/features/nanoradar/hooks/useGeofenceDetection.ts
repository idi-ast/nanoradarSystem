import { useMemo, useEffect, useState } from "react";
import type { RadarTarget, RadarZone } from "../types";
import { isPointInPolygon } from "../components/map/utils/geoHelpers";

/** Un target se considera activo si recibió datos hace menos de este tiempo. */
const ACTIVE_MS = 4_000;

export interface GeofenceAlert {
  /** Nivel de alerta máximo activo (1–4). 0 = sin alertas. */
  maxLevel: number;
  /** Color de la zona más crítica con targets dentro. */
  color: string;
  /** Hay al menos un target activo dentro de alguna zona. */
  hasAlert: boolean;
}

/**
 * Detecta si alguno de los targets *activos* (actualizados recientemente) se
 * encuentra dentro de alguna zona configurada. Prioriza siempre el nivel más
 * crítico (4 > 3 > 2 > 1). La alerta se apaga sola cuando el target deja de
 * ser activo.
 */
export function useGeofenceDetection(
  targets: RadarTarget[],
  zones: RadarZone[],
): GeofenceAlert {
  // Refresco cada segundo para detectar cuando un target pasa a inactivo
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(id);
  }, []);

  return useMemo(() => {
    let maxLevel = 0;
    let color = "#ff0000";

    // Solo targets con datos recientes
    const activeTargets = targets.filter(
      (t) => now - t.lastUpdate <= ACTIVE_MS,
    );

    for (const target of activeTargets) {
      for (const zone of zones) {
        const rawVertices = Array.isArray(zone.poligono.vertices)
          ? zone.poligono.vertices
          : Object.values(zone.poligono.vertices);

        const inside = isPointInPolygon(
          target.lat,
          target.lon,
          rawVertices as [number, number][],
        );

        if (inside) {
          // El nivel de alerta es el mayor entre la zona y el propio target
          const level = Math.max(
            Number(zone.idTipoAlerta ?? 1),
            Number(target.nivel ?? 1),
          ) as 1 | 2 | 3 | 4;
          if (level > maxLevel) {
            maxLevel = level;
            color = zone.poligono.color;
          }
        }
      }
    }

    return { maxLevel, color, hasAlert: maxLevel > 0 };
  }, [targets, zones, now]);
}
