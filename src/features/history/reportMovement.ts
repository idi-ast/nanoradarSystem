import { analysisTrackKey, type TrackSummary } from './types';
import type { AnalysisPoint, MovementObservation } from './analysis';

export type MovementSort = 'distance' | 'duration' | 'points';
export interface TrackMovement {
  key: string; track: TrackSummary; distanceM: number | null; trackedSeconds: number | null;
  elapsedSeconds: number | null; samplePoints: number; gapCount: number;
  source: 'full' | 'sample' | 'unavailable';
}
const radians = (v: number) => v * Math.PI / 180;
function stepDistance(a: AnalysisPoint, b: AnalysisPoint) {
  const h = Math.sin(radians(b.lat - a.lat) / 2) ** 2 + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(radians(b.lon - a.lon) / 2) ** 2;
  return 2 * 6371008.8 * Math.asin(Math.sqrt(Math.max(0, Math.min(1, h))));
}
export function computeTrackMovements(tracks: TrackSummary[], points: AnalysisPoint[], from: Date, to: Date, maxGapSeconds: number, observations: MovementObservation[] = []): TrackMovement[] {
  const grouped = new Map<string, AnalysisPoint[]>();
  const fromMs = from.getTime(), toMs = to.getTime();
  for (const p of points) {
    const time = new Date(p.fecha ?? '').getTime();
    if (!p.trackKey || !Number.isFinite(time) || time < fromMs || time > toMs || !Number.isFinite(p.lat) || !Number.isFinite(p.lon) || Math.abs(p.lat) > 90 || Math.abs(p.lon) > 180 || (!p.lat && !p.lon)) continue;
    if (!grouped.has(p.trackKey)) grouped.set(p.trackKey, []);
    grouped.get(p.trackKey)!.push(p);
  }
  const full = new Map(observations.filter(m => m.maxGapSeconds === maxGapSeconds && Number.isInteger(m.segmentCount) && m.segmentCount >= 0 && Number.isFinite(m.trackedSeconds) && m.trackedSeconds >= 0 && (m.distanceM == null || (Number.isFinite(m.distanceM) && m.distanceM >= 0))).map(m => [m.trackKey, m]));
  return tracks.map(track => {
    const key = analysisTrackKey(track);
    const positions = (grouped.get(key) ?? []).sort((a, b) => Date.parse(a.fecha!) - Date.parse(b.fecha!));
    let distance = 0, tracked = 0, segments = 0, gaps = 0;
    for (let i = 1; i < positions.length; i++) {
      const a = positions[i - 1], b = positions[i];
      const dt = (Date.parse(b.fecha!) - Date.parse(a.fecha!)) / 1000;
      if (dt > maxGapSeconds) { gaps++; continue; }
      if (dt <= 0) continue;
      distance += stepDistance(a, b); tracked += dt; segments++;
    }
    const start = Math.max(fromMs, Date.parse(track.first_seen ?? ''));
    const end = Math.min(toMs, Date.parse(track.last_seen ?? ''));
    const observation = full.get(key);
    return { key, track, distanceM: observation ? observation.distanceM : segments ? distance : null,
      trackedSeconds: observation ? observation.trackedSeconds : segments ? tracked : null,
      elapsedSeconds: Number.isFinite(start) && Number.isFinite(end) && end >= start ? (end - start) / 1000 : null,
      samplePoints: positions.length, gapCount: observation ? observation.gapCount : gaps,
      source: observation ? 'full' : segments ? 'sample' : 'unavailable' };
  });
}
export function rankTrackMovements(rows: TrackMovement[], sort: MovementSort = 'distance', minPoints = 100) {
  const value = (r: TrackMovement) => sort === 'distance' ? r.distanceM : sort === 'duration' ? r.elapsedSeconds : r.track.point_count;
  return rows.filter(r => r.track.point_count >= minPoints && (value(r) ?? 0) > 0).sort((a, b) =>
    (value(b) ?? 0) - (value(a) ?? 0) || (b.distanceM ?? 0) - (a.distanceM ?? 0) ||
    (b.elapsedSeconds ?? 0) - (a.elapsedSeconds ?? 0) || b.track.point_count - a.track.point_count || a.key.localeCompare(b.key));
}
