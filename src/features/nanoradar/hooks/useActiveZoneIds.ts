import { useMemo, useEffect, useState } from "react";
import type { RadarTarget, RadarZone } from "../types";
import { isPointInPolygon } from "../components/map/utils/geoHelpers";
import { GEOFENCE } from "../config";


export function useActiveZoneIds(
  targets: RadarTarget[],
  zones: RadarZone[],
  activeMs = GEOFENCE.ACTIVE_MS,
): Set<string> {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(id);
  }, []);

  return useMemo(() => {
    const activeIds = new Set<string>();
    const activeTargets = targets.filter((t) => now - t.lastUpdate <= activeMs);

    for (const zone of zones) {
      const rawVertices = Array.isArray(zone.poligono.vertices)
        ? zone.poligono.vertices
        : Object.values(zone.poligono.vertices);

      const hasTarget = activeTargets.some((target) =>
        isPointInPolygon(
          target.lat,
          target.lon,
          rawVertices as [number, number][],
        ),
      );

      if (hasTarget) {
        activeIds.add(zone.id?.toString() ?? zone.nombre);
      }
    }

    return activeIds;
  }, [targets, zones, now, activeMs]);
}
