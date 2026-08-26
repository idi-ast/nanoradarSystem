import { useMemo, useState, useEffect } from "react";
import type { RadarTarget, RadarZone } from "../types";
import { isPointInPolygon } from "../components/map/utils/geoHelpers";

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
 * priorizando el mayor `idTipoAlerta` entre las que tienen targets activos.
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

    const ptzZones = zones.filter((z) => z.activarPtz);
    if (ptzZones.length === 0) return null;

    let best: ZoneAutoTrack | null = null;

    for (const zone of ptzZones) {
      const rawVertices = Array.isArray(zone.poligono.vertices)
        ? zone.poligono.vertices
        : Object.values(zone.poligono.vertices);

      let hasActiveTarget = false;
      for (const target of activeTargets) {
        if (isPointInPolygon(target.lat, target.lon, rawVertices as [number, number][])) {
          hasActiveTarget = true;
          break;
        }
      }

      if (!hasActiveTarget) continue;

      const level = Number(zone.idTipoAlerta ?? 1);

      // Priorizar mayor nivel; si empatan, quedarse con el primero (ya existente)
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
