import { useMemo, useEffect, useState } from "react";
import type { RadarTarget, RadarZone } from "../types";
import { isPointInPolygon } from "../components/map/utils/geoHelpers";
import { GEOFENCE } from "../config";

export interface GeofenceAlert {
  maxLevel: number;
  color: string;
  hasAlert: boolean;
  activeZoneIds: Set<string>;
}


export function useGeofenceDetection(
  targets: RadarTarget[],
  zones: RadarZone[],
  activeMs = GEOFENCE.ACTIVE_MS,
): GeofenceAlert {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(id);
  }, []);

  return useMemo(() => {
    let maxLevel = 0;
    let color = "#ff0000";
    const activeZoneIds = new Set<string>();

    const activeTargets = targets.filter(
      (t) => now - t.lastUpdate <= activeMs,
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
          activeZoneIds.add(zone.id?.toString() ?? zone.nombre);
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

    return { maxLevel, color, hasAlert: maxLevel > 0, activeZoneIds };
  }, [targets, zones, now]);
}
