import { useMemo } from "react";
import { Source, Layer } from "react-map-gl";
import type { RadarZone } from "../../types";
import { toGeoCoord } from "./utils/geoHelpers";

interface Props {
  zones: RadarZone[];
}

export function RadarZonesLayer({ zones }: Props) {
  const data = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: zones.map((zone, idx) => {
        const rawVertices = Array.isArray(zone.poligono.vertices)
          ? zone.poligono.vertices
          : Object.values(zone.poligono.vertices);
        const coords = rawVertices.map(toGeoCoord);
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
