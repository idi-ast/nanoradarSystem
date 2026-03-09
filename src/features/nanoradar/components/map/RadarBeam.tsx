import { useMemo } from "react";
import { Source, Layer } from "react-map-gl";
import type { RadarConfig } from "../../types";
import { getGeoPoint } from "./utils/geoHelpers";

interface Props {
  config: RadarConfig;
}

/**
 * Haz de detección del radar como polígono GeoJSON en Mapbox.
 * El sector angular se calcula a partir del azimut, radio y apertura.
 */
export function RadarBeam({ config }: Props) {
  const lat = Number(config.latitud);
  const lon = Number(config.longitud);
  const azimut = Number(config.azimut);
  const radio = Number(config.radio);
  const apertura = Number(config.apertura);

  const data = useMemo(() => {
    const aperturaGrados = 2 * Math.atan(apertura / 2 / radio) * (180 / Math.PI);
    const startAngle = azimut - aperturaGrados / 2;
    const endAngle = azimut + aperturaGrados / 2;

    // GeoJSON usa [longitud, latitud]
    const coords: [number, number][] = [[lon, lat]];
    for (let angle = startAngle; angle <= endAngle; angle += 0.5) {
      coords.push(getGeoPoint(lat, lon, angle, radio));
    }
    coords.push([lon, lat]);

    return {
      type: "Feature" as const,
      geometry: {
        type: "Polygon" as const,
        coordinates: [coords],
      },
      properties: {},
    };
  }, [lat, lon, azimut, radio, apertura]);

  const fillLayer = {
    id: "radar-beam-fill",
    type: "fill" as const,
    paint: { "fill-color": "#10b981", "fill-opacity": 0.3 },
  };

  const lineLayer = {
    id: "radar-beam-line",
    type: "line" as const,
    paint: { "line-color": "#10b981", "line-width": 2 },
  };

  return (
    <Source id="radar-beam" type="geojson" data={data}>
      <Layer {...fillLayer} />
      <Layer {...lineLayer} />
    </Source>
  );
}
