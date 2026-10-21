import { useMemo, useEffect, useState } from "react";
import type { RadarTarget, RadarZone } from "../types";
import { isPointInPolygon } from "../components/map/utils/geoHelpers";
import { GEOFENCE } from "../config";
import { isTrackCategoryAllowed } from "../config/categories";
import { getAlertLevelAndType } from "../config/alerts";

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

    // Separar zonas de ignorar detección y zonas de alerta
    const ignoreZones = zones.filter((z) => getAlertLevelAndType(z).isIgnore);
    const alertZones = zones.filter((z) => {
      const info = getAlertLevelAndType(z);
      return !info.isIgnore && info.level > 0;
    });

    for (const target of activeTargets) {
      // Si el blanco cae dentro de alguna zona de ignorar detección, se ignora completamente
      const isIgnored = ignoreZones.some((zone) => {
        const rawVertices = Array.isArray(zone.poligono.vertices)
          ? zone.poligono.vertices
          : Object.values(zone.poligono.vertices);
        return isPointInPolygon(
          target.lat,
          target.lon,
          rawVertices as [number, number][],
        );
      });

      if (isIgnored) {
        continue;
      }

      for (const zone of alertZones) {
        // Optimización CPU: Verificar categoría permitida antes del test geométrico
        if (!isTrackCategoryAllowed(target.behaviorClass, zone.allowed_categories)) {
          continue;
        }

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
          const { level } = getAlertLevelAndType(zone);
          if (level > maxLevel) {
            maxLevel = level;
            color = zone.poligono.color;
          }
        }
      }
    }

    return { maxLevel, color, hasAlert: maxLevel > 0, activeZoneIds };
  }, [targets, zones, now, activeMs]);
}
