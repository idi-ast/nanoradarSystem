import { useMemo, useEffect, useState } from "react";
import type { RadarTarget, RadarZone } from "../types";
import { isPointInPolygon } from "../components/map/utils/geoHelpers";

const ACTIVE_MS = 4_000;

export interface GeofenceAlert {
  maxLevel: number;
  color: string;
  hasAlert: boolean;
}


export function useGeofenceDetection(
  targets: RadarTarget[],
  zones: RadarZone[],
): GeofenceAlert {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(id);
  }, []);

  return useMemo(() => {
    let maxLevel = 0;
    let color = "#ff0000";

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
