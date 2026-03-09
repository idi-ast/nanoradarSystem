import { useMemo } from "react";
import { Source, Layer } from "react-map-gl";
import { toGeoCoord } from "./utils/geoHelpers";

interface Props {
  points: [number, number][];
  color: string;
}

/**
 * Capa de previsualización del polígono mientras se dibujan los vértices
 * de una nueva zona de alerta. Solo se muestra cuando hay puntos activos.
 */
export function DrawingPreviewLayer({ points, color }: Props) {
  const data = useMemo(() => {
    if (points.length === 0) return null;

    // Convertir de [lat, lon] a [lon, lat] para GeoJSON
    const geoCoords = points.map(toGeoCoord);

    if (points.length === 1) {
      return {
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: geoCoords[0] },
        properties: {},
      };
    }

    // Cerrar el polígono para la previsualización
    const closed = [...geoCoords, geoCoords[0]];
    return {
      type: "Feature" as const,
      geometry: { type: "Polygon" as const, coordinates: [closed] },
      properties: {},
    };
  }, [points]);

  if (!data) return null;

  if (points.length === 1) {
    const pointLayer = {
      id: "drawing-preview-point",
      type: "circle" as const,
      paint: { "circle-radius": 5, "circle-color": color, "circle-opacity": 0.9 },
    };
    return (
      <Source id="drawing-preview" type="geojson" data={data}>
        <Layer {...pointLayer} />
      </Source>
    );
  }

  const fillLayer = {
    id: "drawing-preview-fill",
    type: "fill" as const,
    paint: { "fill-color": color, "fill-opacity": 0.2 },
  };

  const lineLayer = {
    id: "drawing-preview-line",
    type: "line" as const,
    paint: {
      "line-color": color,
      "line-width": 2,
      "line-dasharray": [5, 5],
    },
  };

  return (
    <Source id="drawing-preview" type="geojson" data={data}>
      <Layer {...fillLayer} />
      <Layer {...lineLayer} />
    </Source>
  );
}
