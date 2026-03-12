import { useMemo } from "react";
import { Source, Layer } from "react-map-gl";
import type { RadarConfig } from "../../types";
import { createCircleCoords } from "./utils/geoHelpers";

interface Props {
  config: RadarConfig;
}

/**
 * Anillos concéntricos de distancia + punto central del radar en Mapbox.
 */
export function RadarRings({ config }: Props) {
  const lat = Number(config.latitud);
  const lon = Number(config.longitud);
  const radio = Number(config.radio);
  const ringCount = Math.floor(radio / 100);

  const ringsData = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: Array.from({ length: ringCount }, (_, i) => ({
        type: "Feature" as const,
        geometry: {
          type: "LineString" as const,
          coordinates: createCircleCoords(lat, lon, (i + 1) * 100),
        },
        properties: { radius: (i + 1) * 100 },
      })),
    }),
    [lat, lon, ringCount],
  );

  const centerData = useMemo(
    () => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [lon, lat] },
      properties: {},
    }),
    [lat, lon],
  );

  const ringsLayer = {
    id: "radar-rings",
    type: "line" as const,
    paint: {
      "line-color": "#2dd4bf",
      "line-width": 2,
      "line-dasharray": [1, 2],
      "line-opacity": 1,
    },
  };

  const centerLayer = {
    id: "radar-center",
    type: "circle" as const,
    paint: {
      "circle-radius": 10,
      "circle-color": "#34d399",
      "circle-opacity": 0.9,
      "circle-stroke-width": 2,
      "circle-stroke-color": "#a7f3d0",
    },
  };

  return (
    <>
      <Source id="radar-rings" type="geojson" data={ringsData}>
        <Layer {...ringsLayer} />
      </Source>
      <Source id="radar-center" type="geojson" data={centerData}>
        <Layer {...centerLayer} />
      </Source>
    </>
  );
}
