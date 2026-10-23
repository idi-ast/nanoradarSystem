import { useMemo, useState, useEffect } from "react";
import type { RadarTarget, RadarZone } from "../types";
import { isPointInPolygon } from "../components/map/utils/geoHelpers";
import { isTrackCategoryAllowed } from "../config/categories";
import { getAlertLevelAndType } from "../config/alerts";

export interface ZoneAutoTrack {
  /** Zona con mayor nivel que tiene targets activos y activarPtz=true */
  zone: RadarZone;
  /** Nivel de alerta de la zona (1-4) */
  level: number;
  /** Centroide de la zona {lat, lon} */
  center: { lat: number; lon: number };
}

/**
 * Determina cuál zona con `activarPtz` debe ser seguida por la cámara,
 * priorizando por nivel de criticidad (Crítico 4 -> Alto 3 -> Medio 2 -> Bajo 1).
 * Las zonas de ignorar detección nunca mueven la PTZ ni generan alertas.
 *
 * @returns La zona prioritaria a trackear, o null si ninguna zona tiene actividad.
 */
export function useZoneAutoTrack(
  targets: RadarTarget[],
  zones: RadarZone[],
  activeMs: number,
): ZoneAutoTrack | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(id);
  }, []);

  return useMemo(() => {
    const activeTargets = targets.filter(
      (t) => now - t.lastUpdate <= activeMs,
    );
    if (activeTargets.length === 0) return null;

    // Zonas de ignorar detección
    const ignoreZones = zones.filter((z) => getAlertLevelAndType(z).isIgnore);

    // Solo zonas de alerta con activarPtz (excluye ignorar detección)
    const ptzZones = zones.filter((z) => {
      if (!z.activarPtz) return false;
      const info = getAlertLevelAndType(z);
      return !info.isIgnore && info.level > 0;
    });
    if (ptzZones.length === 0) return null;

    // Filtrar targets que no caigan en zonas de ignorar detección
    const validTargets = activeTargets.filter((t) => {
      return !ignoreZones.some((iz) => {
        const rawVertices = Array.isArray(iz.poligono.vertices)
          ? iz.poligono.vertices
          : Object.values(iz.poligono.vertices);
        return isPointInPolygon(t.lat, t.lon, rawVertices as [number, number][]);
      });
    });
    if (validTargets.length === 0) return null;

    let best: ZoneAutoTrack | null = null;

    for (const zone of ptzZones) {
      const rawVertices = Array.isArray(zone.poligono.vertices)
        ? zone.poligono.vertices
        : Object.values(zone.poligono.vertices);

      let hasActiveTarget = false;
      for (const target of validTargets) {
        if (!isTrackCategoryAllowed(target.behaviorClass, zone.allowed_categories)) {
          continue;
        }
        if (isPointInPolygon(target.lat, target.lon, rawVertices as [number, number][])) {
          hasActiveTarget = true;
          break;
        }
      }

      if (!hasActiveTarget) continue;

      const { level } = getAlertLevelAndType(zone);

      // Priorizar mayor nivel de criticidad (Crítico 4 -> Alto 3 -> Medio 2 -> Bajo 1);
      // si empatan en nivel, se queda con el primero encontrado
      if (!best || level > best.level) {
        // Calcular centroide del polígono
        const pts = rawVertices as [number, number][];
        const sumLat = pts.reduce((acc, p) => acc + p[0], 0);
        const sumLon = pts.reduce((acc, p) => acc + p[1], 0);
        best = {
          zone,
          level,
          center: { lat: sumLat / pts.length, lon: sumLon / pts.length },
        };
      }
    }

    return best;
  }, [targets, zones, activeMs, now]);
}
