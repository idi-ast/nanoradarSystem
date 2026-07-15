import { useMemo } from "react";
import { Source, Layer, Marker } from "react-map-gl";
import { IconRadar2 } from "@tabler/icons-react";
import { useRadarPolling } from "@/features/config-devices/nanoradar/hooks";
import type { ProcessedDetection } from "@/features/config-devices/nanoradar/types/radar-detection.types";

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

/** Colores para los tracks (se rotan) */
const TRACK_COLORS = [
  "#b6fa16", // verde lima
  "#22d3ee", // cyan
  "#f97316", // naranja
  "#a855f7", // violeta
  "#ec4899", // rosa
  "#06b6d4", // cyan oscuro
  "#eab308", // amarillo
  "#10b981", // esmeralda
];

/**
 * Offset de orientación del radar GPS en grados.
 * Editalo en el .env (`VITE_GPS_RADAR_BEARING_OFFSET`) para corregir
 * la desviación. Rota TODAS las posiciones de las detecciones
 * alrededor del radar.
 */
const GPS_RADAR_BEARING_OFFSET = 241;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Rota un punto (lat, lon) alrededor de un centro (centerLat, centerLon)
 * por `angleDeg` grados en sentido horario.
 */
function rotatePoint(
  lat: number,
  lon: number,
  centerLat: number,
  centerLon: number,
  angleDeg: number,
): { lat: number; lon: number } {
  if (angleDeg === 0) return { lat, lon };

  const angleRad = (angleDeg * Math.PI) / 180;
  const cosA = Math.cos(angleRad);
  const sinA = Math.sin(angleRad);

  const mPerDegLat = 111_320;
  const mPerDegLon = 111_320 * Math.cos((centerLat * Math.PI) / 180);

  const dx = (lon - centerLon) * mPerDegLon;
  const dy = (lat - centerLat) * mPerDegLat;

  return {
    lat: centerLat + (dx * sinA + dy * cosA) / mPerDegLat,
    lon: centerLon + (dx * cosA - dy * sinA) / mPerDegLon,
  };
}

/** Aplica rotación y offset de bearing a una detección */
function rotateDetection(
  det: ProcessedDetection,
  centerLat: number,
  centerLon: number,
  offsetDeg: number,
): ProcessedDetection {
  if (offsetDeg === 0) return det;
  const rotated = rotatePoint(det.latitude, det.longitude, centerLat, centerLon, offsetDeg);
  return {
    ...det,
    latitude: rotated.lat,
    longitude: rotated.lon,
    bearing: (det.bearing + offsetDeg + 360) % 360,
  };
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

const GPS_LAYER_SOURCE_ID = "gps-radar-points";

/**
 * Capa que renderiza las detecciones del radar GPS sobre el mapa.
 * - Usa polling cada 5s al endpoint `GET /api/radar/last-detection`.
 * - Dibuja puntos como markers con orientación (bearing).
 * - Aplica rotación global de todas las posiciones según VITE_GPS_RADAR_BEARING_OFFSET.
 */
export function GpsRadarLayer() {
  const { detections, lastPayload } = useRadarPolling({ interval: 1000 });

  const radarPos = lastPayload?.radarPosition ?? null;

  // Rotar todas las detecciones alrededor del radar
  const rotated = useMemo(() => {
    if (!radarPos) return detections;
    return detections.map((d) =>
      rotateDetection(d, radarPos.latitude, radarPos.longitude, GPS_RADAR_BEARING_OFFSET),
    );
  }, [detections, radarPos]);

  // GeoJSON de puntos (FeatureCollection)
  const pointsData = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: rotated.map((d, i) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [d.longitude, d.latitude],
        },
        properties: {
          id: i,
          color: TRACK_COLORS[i % TRACK_COLORS.length],
          bearing: d.bearing,
          snr: d.snr,
          range: d.range,
        },
      })),
    }),
    [rotated],
  );

  // Capa de puntos (círculos coloreados)
  const pointsLayer = useMemo(
    () => ({
      id: "gps-radar-points-layer",
      type: "circle" as const,
      paint: {
        "circle-radius": 5,
        "circle-color": ["get", "color"] as unknown as string,
        "circle-opacity": 0.85,
        "circle-stroke-width": 1.5,
        "circle-stroke-color": "#ffffff",
      },
    }),
    [],
  );

  if (rotated.length === 0) return null;

  return (
    <>
      {/* Capa de puntos GeoJSON */}
      <Source id={GPS_LAYER_SOURCE_ID} type="geojson" data={pointsData}>
        <Layer {...pointsLayer} />
      </Source>

      {/* Marcadores con flecha de orientación (bearing) */}
      {rotated.map((det, i) => {
        const color = TRACK_COLORS[i % TRACK_COLORS.length];
        const bearing = det.bearing;
        return (
          <Marker
            key={i}
            longitude={det.longitude}
            latitude={det.latitude}
            anchor="center"
          >
            <div
              className="relative flex items-center justify-center cursor-pointer"
              style={{
                width: 24,
                height: 24,
                transform: `rotate(${bearing}deg)`,
                transition: "transform 0.5s ease",
              }}
              title={`SNR: ${det.snr.toFixed(1)} | Range: ${det.range.toFixed(1)}m | ${bearing.toFixed(1)}°`}
            >
              {/* Punta de flecha */}
              <div
                style={{
                  width: 0,
                  height: 0,
                  borderLeft: "7px solid transparent",
                  borderRight: "7px solid transparent",
                  borderBottom: `14px solid ${color}`,
                  filter: "drop-shadow(0 0 4px rgba(0,0,0,0.5))",
                }}
              />
              {/* Círculo central */}
              <div
                className="absolute rounded-full"
                style={{
                  width: 6,
                  height: 6,
                  backgroundColor: color,
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -10%)",
                  boxShadow: `0 0 6px ${color}`,
                }}
              />
            </div>
          </Marker>
        );
      })}

      {/* Indicador del radar */}
      {radarPos && (
        <Marker
          longitude={radarPos.longitude}
          latitude={radarPos.latitude}
          anchor="center"
        >
          <div className="flex flex-col items-center">
            <IconRadar2
              size={28}
              className="text-sky-400 drop-shadow-[0_0_8px_rgba(14,165,233,0.8)] animate-pulse"
            />
            <span className="text-[10px] text-sky-300 font-mono mt-0.5 bg-black/60 px-1 rounded">
              GPS Radar
            </span>
          </div>
        </Marker>
      )}
    </>
  );
}
