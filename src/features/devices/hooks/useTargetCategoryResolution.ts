import { useMemo, useEffect, useState } from "react";
import type { RadarTarget, RadarZone } from "../types";
import { isPointInPolygon } from "../components/map/utils/geoHelpers";
import { GEOFENCE } from "../config";

/**
 * Para cada target activo, resuelve el id de categoría a mostrar:
 *  - Si el target está dentro de una zona con categoriaDeteccion → usa esa
 *  - Si no → usa el defaultCategoriaDeteccion del store
 *
 * Retorna un Map<targetId, categoriaDeteccionId>
 */
export function useTargetCategoryResolution(
  targets: RadarTarget[],
  zones: RadarZone[],
  defaultCategoria: number,
  activeMs = GEOFENCE.ACTIVE_MS,
): Map<string, number> {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(id);
  }, []);

  return useMemo(() => {
    const result = new Map<string, number>();
    const activeTargets = targets.filter(
      (t) => now - t.lastUpdate <= activeMs,
    );

    for (const target of activeTargets) {
      let resolved = defaultCategoria;

      for (const zone of zones) {
        if (!zone.categoriaDeteccion) continue;
        const rawVertices = Array.isArray(zone.poligono.vertices)
          ? zone.poligono.vertices
          : Object.values(zone.poligono.vertices);

        const inside = isPointInPolygon(
          target.lat,
          target.lon,
          rawVertices as [number, number][],
        );

        if (inside) {
          resolved = zone.categoriaDeteccion;
          break;
        }
      }

      result.set(target.id, resolved);
    }

    // Targets fuera del activeMs mantienen el default
    for (const target of targets) {
      if (!result.has(target.id)) {
        result.set(target.id, defaultCategoria);
      }
    }

    return result;
  }, [targets, zones, now, activeMs, defaultCategoria]);
}
