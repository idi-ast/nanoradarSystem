import { apiSystem } from '@/apis/apiSystem';
import type { AnalysisFetchResult, AnalysisPoint } from '@/features/history/analysis';
import { analysisTrackKey, type TrackSummary } from '@/features/history/types';

interface ActivityResponse {
  listing: { tracks: TrackSummary[]; total: number; limited: boolean };
  spatial: Omit<AnalysisFetchResult, 'points'> & { pending?: boolean; points: (AnalysisPoint & { trackIndex: number })[] };
  timings: { summaryMs: number; spatialMs: number; totalMs: number };
}

export interface ActivityAnalysisData {
  listing: ActivityResponse['listing'];
  spatial: AnalysisFetchResult & { pending?: boolean };
  timings: ActivityResponse['timings'];
  range: { from: string; to: string };
  loadedAt: string;
}

export function activityTargets(tracks: TrackSummary[]) {
  const ordered = tracks.map((track, slot) => ({ track, slot }))
    .filter(({ track }) => track.first_seen && track.last_seen)
    .sort((a, b) => (a.track.first_seen ?? '').localeCompare(b.track.first_seen ?? '') ||
      a.track.tipo_radar.localeCompare(b.track.tipo_radar) || a.track.track_id.localeCompare(b.track.track_id));
  const selected = ordered.length <= 160 ? ordered : Array.from({ length: 160 }, (_, i) => ordered[Math.round(i * (ordered.length - 1) / 159)]);
  return selected.map(({ track, slot }) => ({ slot, track_id: track.track_id, tipo_radar: track.tipo_radar === 'unknown' ? null : track.tipo_radar,
    first_seen: track.first_seen, last_seen: track.last_seen }));
}

export async function fetchActivityAnalysis(
  range: { from: string; to: string }, radar: string, minPoints: number, signal: AbortSignal,
  onSummary?: (data: ActivityAnalysisData) => void,
): Promise<ActivityAnalysisData> {
  signal.throwIfAborted();
  const { data } = await apiSystem.get<ActivityResponse>('/analysis/activity', {
    ...range, tipo_radar: radar || undefined, min_points: minPoints,
    ...(onSummary ? { include_points: false } : {}),
  }, { signal });
  signal.throwIfAborted();
  const summary = normalizeActivity(data, range);
  if (!onSummary || !data.spatial.pending) return summary;
  onSummary(summary);
  signal.throwIfAborted();
  const targets = activityTargets(data.listing.tracks);
  if (!targets.length) return { ...summary, spatial: { ...summary.spatial, pending: false } };
  const result = await apiSystem.post<Pick<ActivityResponse, 'spatial' | 'timings'>>('/analysis/activity/points', {
    ...range, tracks: targets, total_tracks: data.listing.tracks.length,
  }, { signal });
  signal.throwIfAborted();
  return normalizeActivity({ ...data, spatial: result.data.spatial, timings: {
    summaryMs: data.timings.summaryMs, spatialMs: result.data.timings.spatialMs,
    totalMs: data.timings.totalMs + result.data.timings.totalMs,
  } }, range);
}

function normalizeActivity(data: ActivityResponse, range: { from: string; to: string }): ActivityAnalysisData {
  const keys = data.listing.tracks.map(analysisTrackKey);
  const from = new Date(range.from).getTime(), to = new Date(range.to).getTime();
  const seen = new Set<string>();
  let invalid = 0;
  const points: AnalysisPoint[] = [];
  for (const p of data.spatial.points) {
    const track = data.listing.tracks[p.trackIndex];
    const time = p.fecha ? new Date(p.fecha).getTime() : NaN;
    if (!track || !Number.isFinite(p.lat) || Math.abs(p.lat) > 90 || !Number.isFinite(p.lon) || Math.abs(p.lon) > 180 ||
        (p.lat === 0 && p.lon === 0) || !Number.isFinite(time) || time < from || time > to) { invalid++; continue; }
    const key = `${p.trackIndex}:${time}:${p.lat}:${p.lon}`;
    if (seen.has(key)) continue;
    seen.add(key);
    points.push({ lat: p.lat, lon: p.lon, fecha: p.fecha, zona: p.zona, speed: p.speed, confidence: p.confidence,
      trackKey: keys[p.trackIndex], trackId: track.track_id, radar: track.tipo_radar });
  }
  points.sort((a, b) => (a.fecha ?? '').localeCompare(b.fecha ?? '') || (a.trackKey ?? '').localeCompare(b.trackKey ?? ''));
  return { ...data, spatial: { ...data.spatial, points, invalidPoints: invalid }, range, loadedAt: new Date().toISOString() };
}
