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
export interface TrackAnalysisCoverage {
  trackKey: string;
  status: 'available' | 'empty' | 'failed' | 'not-requested';
  pointCount: number;
  attempts: number;
  reason?: string;
}
export interface AnalysisFetchResult {
  trackCoverage?: TrackAnalysisCoverage[];
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
  hourStart?: number; hourEnd?: number; timeZone?: string;
}
export interface AnalysisOptions {
  priorityTrackKeys?: string[];
  retryAttempts?: number;
  retryDelayMs?: number;
  hourStart?: number; hourEnd?: number; timeZone?: string;
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

class ReportWindowError extends Error { readonly status = 422; }
async function retryDelay(ms: number, signal?: AbortSignal) {
  signal?.throwIfAborted();
  if (ms <= 0) return;
  await new Promise<void>((resolve, reject) => {
    const finish = () => { signal?.removeEventListener('abort', aborted); resolve(); };
    const aborted = () => { clearTimeout(timer); signal?.removeEventListener('abort', aborted); reject(signal?.reason ?? new Error('Operación cancelada')); };
    const timer = setTimeout(finish, ms);
    signal?.addEventListener('abort', aborted, { once: true });
    if (signal?.aborted) aborted();
  });
}

/** Selección repartida por todo el período, sin favorecer los tracks más largos. */
export async function fetchAnalysisPoints(tracks: TrackSummary[], options: AnalysisOptions = {}): Promise<AnalysisFetchResult> {
  const hourFormatter = options.hourStart !== undefined ? new Intl.DateTimeFormat('en-GB', {
    timeZone: options.timeZone ?? 'America/Santiago', hour: '2-digit', hourCycle: 'h23',
  }) : null;
  const maxTracks = Math.max(1, options.maxTracks ?? 160);
  const candidates = [...tracks].sort((a, b) => (a.first_seen ?? "").localeCompare(b.first_seen ?? ""));
  const spread = (items: TrackSummary[], count: number) => items.length <= count ? items :
    Array.from({ length: count }, (_, i) => items[Math.round(i * (items.length - 1) / Math.max(1, count - 1))]);
  const priorityKeys = new Set(options.priorityTrackKeys ?? []);
  const priority = candidates.filter(t => priorityKeys.has(analysisTrackKey(t)));
  const selectedPriority = spread(priority, Math.min(maxTracks, priority.length));
  const selected = [...selectedPriority, ...spread(candidates.filter(t => !priorityKeys.has(analysisTrackKey(t))), maxTracks - selectedPriority.length)];
  const coverage = new Map<string, TrackAnalysisCoverage>(tracks.map(t => [analysisTrackKey(t), {
    trackKey: analysisTrackKey(t), status: 'not-requested', pointCount: 0, attempts: 0,
    reason: 'Fuera del límite de trayectorias analizadas.',
  }]));
  const retries = Math.max(0, Math.min(2, options.retryAttempts ?? 0));
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
        let res: Awaited<ReturnType<typeof fetchTrackHistory>> | undefined;
        const key = analysisTrackKey(track);
        for (let attempt = 0; attempt <= retries; attempt++) {
          coverage.get(key)!.attempts = attempt + 1;
          try {
            res = await fetchTrackHistory(track.track_id, {
              tipo_radar: track.tipo_radar,
              from: Number.isFinite(from) ? new Date(from).toISOString() : undefined,
              to: Number.isFinite(to) ? new Date(to).toISOString() : undefined,
              hour_start: options.hourStart, hour_end: options.hourEnd, time_zone: options.timeZone,
              limit: perTrack, sample: true,
              include_metrics: options.includeMovement || undefined,
              max_gap_seconds: options.includeMovement ? options.maxGapSeconds ?? 120 : undefined,
            }, options.signal);
            options.signal?.throwIfAborted();
            const windowMatches = options.hourStart === undefined ||
              (res.time_window?.hour_start === options.hourStart && res.time_window?.hour_end === options.hourEnd && res.time_window?.time_zone === (options.timeZone ?? 'America/Santiago'));
            if (!windowMatches) throw new ReportWindowError('La API no confirmó el horario solicitado.');
            break;
          } catch (error) {
            if (options.signal?.aborted) throw error;
            const status = typeof error === 'object' && error !== null && 'status' in error ? Number(error.status) : 0;
            if (attempt === retries || (status && status !== 408 && status !== 429 && status < 500)) throw error;
            await retryDelay(options.retryDelayMs ?? 250, options.signal);
          }
        }
        if (!res) throw new Error('Sin respuesta de trayectoria');
        successful++;
        if (res.movement) movements.push({ trackKey: analysisTrackKey(track), distanceM: res.movement.distance_m,
          trackedSeconds: res.movement.tracked_seconds, segmentCount: res.movement.segment_count,
          gapCount: res.movement.gap_count, maxGapSeconds: res.movement.max_gap_seconds,
          hourStart: options.hourStart, hourEnd: options.hourEnd, timeZone: options.hourStart !== undefined ? options.timeZone ?? 'America/Santiago' : undefined });
        available += res.total_points ?? res.points.length;
        if (res.sampled || res.points.length >= perTrack) limited = true;
        if (res.total_points == null) { uniform = false; limited = true; }
        const before = points.length;
        const seen = new Set<string>();
        for (const p of res.points ?? []) {
          const time = p.fecha ? new Date(p.fecha).getTime() : NaN;
          if (!Number.isFinite(p.lat) || Math.abs(p.lat) > 90 || !Number.isFinite(p.lon) || Math.abs(p.lon) > 180 || (p.lat === 0 && p.lon === 0) || !Number.isFinite(time) || time < from || time > to) { invalid++; continue; }
          if (hourFormatter) {
            const hour = Number(hourFormatter.format(new Date(time)));
            const start = options.hourStart!, end = options.hourEnd!;
            if (!(start > end ? hour >= start || hour < end : hour >= start && hour < end)) { invalid++; continue; }
          }
          const key = `${time}:${p.lat}:${p.lon}`;
          if (seen.has(key)) continue;
          seen.add(key);
          points.push({ lat: p.lat, lon: p.lon, fecha: p.fecha, zona: p.zona, trackKey: analysisTrackKey(track), trackId: track.track_id, radar: track.tipo_radar, speed: p.speed, confidence: p.confidence });
        }
        const count = points.length - before;
        if (!count) limited = true;
        coverage.set(analysisTrackKey(track), { trackKey: analysisTrackKey(track),
          status: count ? 'available' : 'empty', pointCount: count,
          attempts: coverage.get(analysisTrackKey(track))!.attempts,
          reason: count ? undefined : 'Sin posiciones válidas en el horario solicitado.',
        });
      } catch (error) {
        if (options.signal?.aborted) throw error;
        failed++; limited = true;
        const status = typeof error === 'object' && error !== null && 'status' in error ? Number(error.status) : 0;
        const item = coverage.get(analysisTrackKey(track))!;
        coverage.set(item.trackKey, { ...item, status: 'failed',
          reason: error instanceof ReportWindowError ? error.message : status ? `Consulta fallida (HTTP ${status}).` : 'No se pudo cargar la trayectoria.',
        });
      }
      finally { done++; options.onProgress?.(done, selected.length); }
    }
  };
  await Promise.all(Array.from({ length: Math.min(options.concurrency ?? 4, selected.length) }, worker));
  points.sort((a, b) => (a.fecha ?? "").localeCompare(b.fecha ?? "") || (a.trackKey ?? "").localeCompare(b.trackKey ?? ""));
  return { points, movements, trackCoverage: [...coverage.values()], tracksAnalyzed: successful, tracksTotal: tracks.length, pointsLimited: limited, tracksRequested: selected.length, failedTracks: failed, invalidPoints: invalid, availablePoints: available, uniformSampling: uniform };
}
