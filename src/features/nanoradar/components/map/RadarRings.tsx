import { useMemo } from "react";
import { Source, Layer, Marker } from "react-map-gl";
import type { RadarConfig } from "../../types";
import { createCircleCoords } from "./utils/geoHelpers";
import { useRadarContext } from "../../context/useRadarContext";

interface Props {
  config: RadarConfig;
}

/**
 * Anillos concéntricos de distancia + punto central del radar en Mapbox.
 */
export function RadarRings({ config }: Props) {
  const { instanceConfig } = useRadarContext();
  const { colors } = instanceConfig;
  const id = instanceConfig.id;
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
    id: `radar-rings-${id}`,
    type: "line" as const,
    paint: {
      "line-color": colors.pulse,
      "line-width": 2,
      "line-dasharray": [1, 2],
      "line-opacity": 1,
    },
  };

  const centerLayer = {
    id: `radar-center-${id}`,
    type: "circle" as const,
    paint: {
      "circle-radius": 15,
      "circle-color": colors.center,
      "circle-opacity": 0.2,
      "circle-stroke-width": 2,
      "circle-stroke-color": colors.primary,
    },
  };

  return (
    <>
      <Source id={`radar-rings-${id}`} type="geojson" data={ringsData}>
        <Layer {...ringsLayer} />
      </Source>
      {/* Centro del radar con ícono SVG */}
      <Marker longitude={lon} latitude={lat} anchor="center">
        <div className="relative flex items-center justify-center">
          {/* Pulso animado */}
          <span className="absolute w-10 h-10 rounded-full animate-ping" style={{ backgroundColor: `${colors.primary}33` }} />
          <span className="absolute w-7 h-7 rounded-full" style={{ backgroundColor: `${colors.primary}1a`, border: `1px solid ${colors.primary}66` }} />
          {/* Ícono radar SVG */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="33"
            height="33"
            fill="none"
            stroke={colors.primary}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="relative z-10" style={{ filter: `drop-shadow(0 0 4px ${colors.primary})` }}
          >
            {/* Anillos estáticos */}
            <circle cx="12" cy="12" r="9" />
            <circle cx="12" cy="12" r="5.5" strokeOpacity="0.6" />
            <circle cx="12" cy="12" r="2" strokeOpacity="0.4" />
            {/* Barrido giratorio */}
            <g style={{ transformOrigin: "12px 12px", animation: "radar-spin 3s linear infinite" }}>
              <path d="M12 12 L12 3" />
              {/* Sector cónico de barrido */}
              <path d="M12 12 L17.2 4.8" strokeOpacity="0.4" />
              <path d="M12 12 L19.5 7.5" strokeOpacity="0.2" />
            </g>
            {/* Punto central */}
            <circle cx="12" cy="12" r="1" fill="#b6fa16" stroke="none" />
            {/* Blip de detección */}
            <circle cx="15.5" cy="7.5" r="1" fill="#b6fa16" stroke="none" />
          </svg>
          <style>{`
            @keyframes radar-spin {
              from { transform: rotate(0deg); }
              to   { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </Marker>
      {/* Source vacía para no romper el layer anterior si existía */}
      <Source id={`radar-center-${id}`} type="geojson" data={centerData}>
        <Layer {...centerLayer}  />
      </Source>
    </>
  );
}
