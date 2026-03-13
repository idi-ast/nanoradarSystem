import { useMemo } from "react";
import { Source, Layer } from "react-map-gl";
import { toGeoCoord } from "./utils/geoHelpers";
import { useRadarContext } from "../../context/useRadarContext";

interface Props {
  points: [number, number][];
  color: string;
}


export function DrawingPreviewLayer({ points, color }: Props) {
  const { instanceConfig } = useRadarContext();
  const id = instanceConfig.id;
  const polygonData = useMemo(() => {
    if (points.length < 2) return null;
    const geoCoords = points.map(toGeoCoord);
    const closed = [...geoCoords, geoCoords[0]];
    return {
      type: "Feature" as const,
      geometry: { type: "Polygon" as const, coordinates: [closed] },
      properties: {},
    };
  }, [points]);

  const verticesData = useMemo(() => ({
    type: "FeatureCollection" as const,
    features: points.map((p, i) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: toGeoCoord(p) },
      properties: { index: i + 1, isFirst: i === 0, isLast: i === points.length - 1 },
    })),
  }), [points]);

  if (points.length === 0) return null;

  return (
    <>
      {polygonData && (
        <Source id={`drawing-preview-poly-${id}`} type="geojson" data={polygonData}>
          <Layer
            id={`drawing-preview-fill-${id}`}
            type="fill"
            paint={{ "fill-color": color, "fill-opacity": 0.15 }}
          />
          <Layer
            id={`drawing-preview-line-${id}`}
            type="line"
            paint={{ "line-color": color, "line-width": 2, "line-dasharray": [5, 4] }}
          />
        </Source>
      )}
      <Source id={`drawing-preview-vertices-${id}`} type="geojson" data={verticesData}>
        {/* Halo exterior del vértice */}
        <Layer
          id={`drawing-vertices-halo-${id}`}
          type="circle"
          paint={{
            "circle-radius": 9,
            "circle-color": "#000000",
            "circle-opacity": 0.5,
          }}
        />
        {/* Círculo del vértice con color de zona */}
        <Layer
          id={`drawing-vertices-circle-${id}`}
          type="circle"
          paint={{
            "circle-radius": 6,
            "circle-color": color,
            "circle-opacity": 0.95,
            "circle-stroke-width": 2,
            "circle-stroke-color": "#ffffff",
          }}
        />
        {/* Número del vértice */}
        <Layer
          id={`drawing-vertices-label-${id}`}
          type="symbol"
          layout={{
            "text-field": ["to-string", ["get", "index"]],
            "text-size": 9,
            "text-offset": [0, -1.6],
            "text-anchor": "bottom",
          }}
          paint={{
            "text-color": "#ffffff",
            "text-halo-color": "#000000",
            "text-halo-width": 1.5,
          }}
        />
      </Source>
    </>
  );
}
