import { useRef, useMemo } from "react";
import { Source, Layer, Marker } from "react-map-gl";
import { IconRadar2 } from "@tabler/icons-react";
import { useRadarPolling } from "@/features/config-devices/nanoradar/hooks";
import type { ProcessedDetection } from "@/features/config-devices/nanoradar/types/radar-detection.types";

// ---------------------------------------------------------------------------
// Tipos internos para tracking de detecciones entre polls
// ---------------------------------------------------------------------------

/** Una detección con historial acumulado entre polls */
interface GpsTrack {
  /** ID único asignado localmente */
  id: string;
  /** Historial de posiciones: [lat, lon, timestamp] */
  history: [number, number, number][];
  /** Última detección recibida */
  last: ProcessedDetection;
  /** Color asignado al track */
  color: string;
}

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

/** Distancia máxima (metros) para considerar que dos detecciones son el mismo track */
const TRACK_MATCH_THRESHOLD_M = 50;

/** Tiempo máximo (ms) sin actualizar antes de eliminar un track */
const TRACK_TTL_MS = 30_000;

/** Máximo de puntos en el historial de un track */
const MAX_HISTORY_POINTS = 100;

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _colorIdx = 0;
function nextColor(): string {
  const c = TRACK_COLORS[_colorIdx % TRACK_COLORS.length];
  _colorIdx++;
  return c;
}

/** Distancia aproximada entre dos puntos (fórmula de Haversine simplificada) */
function haversineMeters(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Empareja las nuevas detecciones con los tracks existentes por proximidad.
 * - Si una detección está cerca de un track existente → se añade a su historial.
 * - Si no coincide con ningún track → se crea un track nuevo.
 * - Los tracks sin actualización en `TRACK_TTL_MS` se eliminan.
 */
function matchTracks(
  prev: GpsTrack[],
  detections: ProcessedDetection[],
  now: number,
): GpsTrack[] {
  const unmatched = new Set(detections.map((_, i) => i));
  const next: GpsTrack[] = [];

  for (const track of prev) {
    let bestIdx = -1;
    let bestDist = Infinity;

    for (const i of unmatched) {
      const d = detections[i];
      const dist = haversineMeters(track.last.latitude, track.last.longitude, d.latitude, d.longitude);
      if (dist < TRACK_MATCH_THRESHOLD_M && dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }

    if (bestIdx !== -1) {
      unmatched.delete(bestIdx);
      const det = detections[bestIdx];
      const history = [...track.history, [det.latitude, det.longitude, now] as [number, number, number]];
      if (history.length > MAX_HISTORY_POINTS) history.shift();
      next.push({ ...track, last: det, history });
    } else if (now - track.last.sendTimestamp * 1000 < TRACK_TTL_MS) {
      next.push(track); // mantener track sin actualización
    }
    // else: track expirado, se descarta
  }

  // Nuevos tracks para detecciones no emparejadas
  for (const i of unmatched) {
    const det = detections[i];
    next.push({
      id: `gps-${Date.now()}-${i}`,
      history: [[det.latitude, det.longitude, now]],
      last: det,
      color: nextColor(),
    });
  }

  return next;
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

const GPS_LAYER_SOURCE_ID = "gps-radar-trails";

/**
 * Capa que renderiza las detecciones del radar GPS sobre el mapa.
 * - Usa polling cada 5s al endpoint `GET /api/radar/last-detection`.
 * - Dibuja trails (estelas) y markers con orientación (bearing).
 */
export function GpsRadarLayer() {
  const { detections, lastPayload } = useRadarPolling({ interval: 5000 });

  const tracksRef = useRef<GpsTrack[]>([]);
  const now = Date.now();

  // Actualizar tracks con las nuevas detecciones
  const tracks = useMemo(() => {
    tracksRef.current = matchTracks(tracksRef.current, detections, now);
    return tracksRef.current;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detections, now]);

  // GeoJSON para los trails
  const trailsData = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: tracks
        .filter((t) => t.history.length > 1)
        .map((t) => ({
          type: "Feature" as const,
          geometry: {
            type: "LineString" as const,
            coordinates: t.history.map(([lat, lon]) => [lon, lat]),
          },
          properties: {
            id: t.id,
            color: t.color,
          },
        })),
    }),
    [tracks],
  );

  // Capa de trails estilo "estela" (mismo patrón que RadarTargetsLayer)
  const trailLayer = useMemo(
    () => ({
      id: "gps-radar-trails-layer",
      type: "line" as const,
      paint: {
        "line-color": ["get", "color"],
        "line-width": 3,
        "line-opacity": 0.65,
        "line-blur": 0.5,
      },
    }),
    [],
  );

  return (
    <>
      {/* Trails (estelas) */}
      <Source id={GPS_LAYER_SOURCE_ID} type="geojson" data={trailsData}>
        <Layer {...trailLayer} />
      </Source>

      {/* Marcadores con orientación (bearing) */}
      {tracks.map((track) => {
        const { latitude, longitude, bearing } = track.last;
        return (
          <Marker
            key={track.id}
            longitude={longitude}
            latitude={latitude}
            anchor="center"
          >
            <div
              className="relative flex items-center justify-center cursor-pointer"
              style={{
                width: 22,
                height: 22,
                transform: `rotate(${bearing}deg)`,
                transition: "transform 0.5s ease",
              }}
              title={`SNR: ${track.last.snr.toFixed(1)} | Range: ${track.last.range.toFixed(1)}m | ${bearing.toFixed(1)}°`}
            >
              {/* Punta de flecha */}
              <div
                style={{
                  width: 0,
                  height: 0,
                  borderLeft: "7px solid transparent",
                  borderRight: "7px solid transparent",
                  borderBottom: `14px solid ${track.color}`,
                  filter: "drop-shadow(0 0 4px rgba(0,0,0,0.5))",
                }}
              />
              {/* Círculo central */}
              <div
                className="absolute rounded-full"
                style={{
                  width: 6,
                  height: 6,
                  backgroundColor: track.color,
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -10%)",
                  boxShadow: `0 0 6px ${track.color}`,
                }}
              />
            </div>
          </Marker>
        );
      })}

      {/* Indicador de posición del radar (si hay payload) */}
      {lastPayload?.radarPosition && (
        <Marker
          longitude={lastPayload.radarPosition.longitude}
          latitude={lastPayload.radarPosition.latitude}
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
