import { useMemo } from "react";
import { Source, Layer } from "react-map-gl";
import type { RadarZone } from "../../types";
import { toGeoCoord } from "./utils/geoHelpers";

interface Props {
  zones: RadarZone[];
}

/**
 * Zonas de alerta como polígonos GeoJSON con color por zona en Mapbox.
 * Usa data-driven styling para pintar cada zona con su color configurado.
 */
export function RadarZonesLayer({ zones }: Props) {
  const data = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: zones.map((zone, idx) => {
        // La API puede devolver vertices como array [[lat,lon],...] u objeto {pt0:[lat,lon],...}
        const rawVertices = Array.isArray(zone.poligono.vertices)
          ? zone.poligono.vertices
          : Object.values(zone.poligono.vertices);
        // Convertir de [lat, lon] a [lon, lat] (GeoJSON/Mapbox)
        const coords = rawVertices.map(toGeoCoord);
        // Cerrar el polígono
        if (coords.length > 0) coords.push(coords[0]);

        return {
          type: "Feature" as const,
          geometry: {
            type: "Polygon" as const,
            coordinates: [coords],
          },
          properties: {
            color: zone.poligono.color,
            name: zone.nombre,
            id: idx,
          },
        };
      }),
    }),
    [zones]
  );

  const fillLayer = {
    id: "alert-zones-fill",
    type: "fill" as const,
    paint: {
      "fill-color": ["get", "color"] as unknown as string,
      "fill-opacity": 0.3,
    },
  };

  const lineLayer = {
    id: "alert-zones-line",
    type: "line" as const,
    paint: {
      "line-color": ["get", "color"] as unknown as string,
      "line-width": 2,
    },
  };

  if (zones.length === 0) return null;

  return (
    <Source id="alert-zones" type="geojson" data={data}>
      <Layer {...fillLayer} />
      <Layer {...lineLayer} />
    </Source>
  );
}
