import { fetchTrackHistory } from "@/features/devices/services/radarService";
import { analysisTrackKey, type TrackSummary } from "./types";
export { analysisTrackKey } from "./types";

export interface AnalysisPoint {
  lat: number;
  lon: number;
  fecha: string | null;
  zona: string | null;
  trackKey?: string;
  trackId?: string;
  radar?: string;
  speed?: number | null;
  confidence?: number | null;
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
  pointsLimited: boolean;
  tracksRequested?: number;
  failedTracks?: number;
  invalidPoints?: number;
  availablePoints?: number;
  uniformSampling?: boolean;
  movements?: MovementObservation[];
}
export interface MovementObservation {
  trackKey: string; distanceM: number | null; trackedSeconds: number;
  segmentCount: number; gapCount: number; maxGapSeconds: number;
}
export interface AnalysisOptions {
  maxTracks?: number;
  targetPoints?: number;
  maxPointsPerTrack?: number;
  minPointsPerTrack?: number;
  concurrency?: number;
  from?: string;
  to?: string;
  onProgress?: (done: number, total: number) => void;
  signal?: AbortSignal;
  includeMovement?: boolean;
  maxGapSeconds?: number;
}

/** Selección repartida por todo el período, sin favorecer los tracks más largos. */
export async function fetchAnalysisPoints(tracks: TrackSummary[], options: AnalysisOptions = {}): Promise<AnalysisFetchResult> {
  const maxTracks = Math.max(1, options.maxTracks ?? 160);
  const candidates = [...tracks].sort((a, b) => (a.first_seen ?? "").localeCompare(b.first_seen ?? ""));
  const selected = candidates.length <= maxTracks ? candidates : Array.from({ length: maxTracks }, (_, i) => candidates[Math.round(i * (candidates.length - 1) / Math.max(1, maxTracks - 1))]);
  const budget = options.targetPoints ?? 60000;
  const perTrack = Math.max(2, Math.min(options.maxPointsPerTrack ?? 2000, Math.floor(budget / Math.max(1, selected.length))));
  const points: AnalysisPoint[] = [];
  const movements: MovementObservation[] = [];
  let cursor = 0, done = 0, successful = 0, failed = 0, invalid = 0, available = 0;
  let limited = selected.length < tracks.length, uniform = true;
  const worker = async () => {
    while (cursor < selected.length) {
      options.signal?.throwIfAborted();
      const track = selected[cursor++];
      try {
        const from = Math.max(options.from ? new Date(options.from).getTime() : -Infinity, track.first_seen ? new Date(track.first_seen).getTime() : -Infinity);
        const to = Math.min(options.to ? new Date(options.to).getTime() : Infinity, track.last_seen ? new Date(track.last_seen).getTime() : Infinity);
        const res = await fetchTrackHistory(track.track_id, {
          tipo_radar: track.tipo_radar,
          from: Number.isFinite(from) ? new Date(from).toISOString() : undefined,
          to: Number.isFinite(to) ? new Date(to).toISOString() : undefined,
          limit: perTrack, sample: true,
          include_metrics: options.includeMovement || undefined,
          max_gap_seconds: options.includeMovement ? options.maxGapSeconds ?? 120 : undefined,
        }, options.signal);
        options.signal?.throwIfAborted();
        successful++;
        if (res.movement) movements.push({ trackKey: analysisTrackKey(track), distanceM: res.movement.distance_m,
          trackedSeconds: res.movement.tracked_seconds, segmentCount: res.movement.segment_count,
          gapCount: res.movement.gap_count, maxGapSeconds: res.movement.max_gap_seconds });
        available += res.total_points ?? res.points.length;
        if (res.sampled || res.points.length >= perTrack) limited = true;
        if (res.total_points == null) { uniform = false; limited = true; }
        const seen = new Set<string>();
        for (const p of res.points ?? []) {
          const time = p.fecha ? new Date(p.fecha).getTime() : NaN;
          if (!Number.isFinite(p.lat) || Math.abs(p.lat) > 90 || !Number.isFinite(p.lon) || Math.abs(p.lon) > 180 || (p.lat === 0 && p.lon === 0) || !Number.isFinite(time) || time < from || time > to) { invalid++; continue; }
          const key = `${time}:${p.lat}:${p.lon}`;
          if (seen.has(key)) continue;
          seen.add(key);
          points.push({ lat: p.lat, lon: p.lon, fecha: p.fecha, zona: p.zona, trackKey: analysisTrackKey(track), trackId: track.track_id, radar: track.tipo_radar, speed: p.speed, confidence: p.confidence });
        }
      } catch (error) {
        if (options.signal?.aborted) throw error;
        failed++; limited = true;
      }
      finally { done++; options.onProgress?.(done, selected.length); }
    }
  };
  await Promise.all(Array.from({ length: Math.min(options.concurrency ?? 4, selected.length) }, worker));
  points.sort((a, b) => (a.fecha ?? "").localeCompare(b.fecha ?? "") || (a.trackKey ?? "").localeCompare(b.trackKey ?? ""));
  return { points, movements, tracksAnalyzed: successful, tracksTotal: tracks.length, pointsLimited: limited, tracksRequested: selected.length, failedTracks: failed, invalidPoints: invalid, availablePoints: available, uniformSampling: uniform };
}
