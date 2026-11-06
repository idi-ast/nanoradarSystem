import { apiSystem } from '@/apis/apiSystem';
import type { AnalysisFetchResult, AnalysisPoint } from '@/features/history/analysis';
import { analysisTrackKey, type TrackSummary } from '@/features/history/types';

interface ActivityResponse {
  listing: { tracks: TrackSummary[]; total: number; limited: boolean };
  spatial: Omit<AnalysisFetchResult, 'points'> & { points: (AnalysisPoint & { trackIndex: number })[] };
  timings: { summaryMs: number; spatialMs: number; totalMs: number };
}

export async function fetchActivityAnalysis(
  range: { from: string; to: string }, radar: string, minPoints: number, signal: AbortSignal,
) {
  signal.throwIfAborted();
  const { data } = await apiSystem.get<ActivityResponse>('/analysis/activity', {
    ...range, tipo_radar: radar || undefined, min_points: minPoints,
  }, { signal });
  signal.throwIfAborted();
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
