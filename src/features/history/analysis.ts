import { fetchTrackHistory } from "@/features/devices/services/radarService";
import type { TrackHistoryPoint } from "@/features/devices/types";
import type { TrackSummary } from "./types";

/**
 * Carga acotada de posiciones geográficas para el informe analítico.
 *
 * El listado del historial solo entrega resúmenes (sin lat/lon), por lo que el
 * mapa de calor necesita pedir el historial de puntos de una muestra de tracks.
 * Para no saturar el backend se limita la cantidad de tracks y de puntos por
 * track, repartiendo un presupuesto total de posiciones.
 */

export interface AnalysisPoint {
  lat: number;
  lon: number;
  fecha: string | null;
  zona: string | null;
}

export interface AnalysisZone {
  nombre: string;
  vertices: [number, number][];
  color?: string;
}

export interface AnalysisFetchResult {
  points: AnalysisPoint[];
  tracksAnalyzed: number;
  tracksTotal: number;
  /** true si se recortó la muestra (tracks o puntos por track). */
  pointsLimited: boolean;
}

export interface AnalysisOptions {
  /** Tracks como máximo a consultar (los de más puntos primero). */
  maxTracks?: number;
  /** Presupuesto total aproximado de posiciones a recolectar. */
  targetPoints?: number;
  maxPointsPerTrack?: number;
  minPointsPerTrack?: number;
  /** Peticiones simultáneas al endpoint de historial. */
  concurrency?: number;
}

const DEFAULTS: Required<AnalysisOptions> = {
  maxTracks: 80,
  targetPoints: 30_000,
  maxPointsPerTrack: 2_000,
  minPointsPerTrack: 150,
  concurrency: 6,
};

/** Prioriza tracks con zonas y luego los de mayor cantidad de puntos. */
function pickTracks(tracks: TrackSummary[], maxTracks: number): TrackSummary[] {
  return [...tracks]
    .filter((t) => Boolean(t.track_id))
    .sort((a, b) => {
      const zoneA = a.zones?.length ? 1 : 0;
      const zoneB = b.zones?.length ? 1 : 0;
      if (zoneA !== zoneB) return zoneB - zoneA;
      return (b.point_count ?? 0) - (a.point_count ?? 0);
    })
    .slice(0, Math.max(0, maxTracks));
}

function toAnalysisPoints(raw: TrackHistoryPoint[]): AnalysisPoint[] {
  const out: AnalysisPoint[] = [];
  for (const p of raw) {
    if (!Number.isFinite(p.lat) || !Number.isFinite(p.lon)) continue;
    // (0, 0) suele ser un punto sin fix de GPS.
    if (p.lat === 0 && p.lon === 0) continue;
    out.push({
      lat: p.lat,
      lon: p.lon,
      fecha: p.fecha ?? null,
      zona: p.zona ?? null,
    });
  }
  return out;
}

export async function fetchAnalysisPoints(
  tracks: TrackSummary[],
  options: AnalysisOptions = {},
): Promise<AnalysisFetchResult> {
  const cfg: Required<AnalysisOptions> = { ...DEFAULTS, ...options };
  const selected = pickTracks(tracks, cfg.maxTracks);

  if (selected.length === 0) {
    return {
      points: [],
      tracksAnalyzed: 0,
      tracksTotal: tracks.length,
      pointsLimited: false,
    };
  }

  const perTrack = Math.min(
    cfg.maxPointsPerTrack,
    Math.max(
      cfg.minPointsPerTrack,
      Math.floor(cfg.targetPoints / selected.length),
    ),
  );

  const collected: AnalysisPoint[] = [];
  let limited = selected.length < tracks.length;
  let cursor = 0;

  const worker = async () => {
    while (cursor < selected.length) {
      const track = selected[cursor];
      cursor += 1;
      try {
        const res = await fetchTrackHistory(track.track_id, {
          tipo_radar: track.tipo_radar,
          from: track.first_seen
            ? new Date(track.first_seen).toISOString()
            : undefined,
          to: track.last_seen
            ? new Date(track.last_seen).toISOString()
            : undefined,
          session_ref: track.last_seen
            ? new Date(track.last_seen).toISOString()
            : undefined,
          limit: perTrack,
        });
        const raw = res.points ?? [];
        if (raw.length >= perTrack) limited = true;
        collected.push(...toAnalysisPoints(raw));
      } catch {
        // Un track sin historial disponible no invalida el análisis global.
      }
    }
  };

  await Promise.all(
    Array.from(
      { length: Math.min(cfg.concurrency, selected.length) },
      () => worker(),
    ),
  );

  return {
    points: collected,
    tracksAnalyzed: selected.length,
    tracksTotal: tracks.length,
    pointsLimited: limited,
  };
}
