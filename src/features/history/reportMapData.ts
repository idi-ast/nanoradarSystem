import type { AnalysisPoint } from './analysis';
import { analysisTrackKey, type TrackSummary } from './types';
import { isNight, localParts, type ReportSettings } from './reportAnalytics';

export interface ReportMapGroup { trackKeys: string[]; points: AnalysisPoint[] }
export interface ReportMapCapture { trackKeys: string[]; image: string; width: number; height: number }
/** PDF pages and satellite captures share exactly the same historical observations. */
export function nightMapGroups(tracks: TrackSummary[], points: AnalysisPoint[], from: Date, to: Date, settings: ReportSettings): ReportMapGroup[] {
  const trackMap = new Map(tracks.map(t => [analysisTrackKey(t), t]));
  const grouped = new Map<string, AnalysisPoint[]>();
  const seen = new Set<string>();
  for (const p of points) {
    const time = Date.parse(p.fecha ?? '');
    const track = p.trackKey ? trackMap.get(p.trackKey) : undefined;
    if (!track || !p.trackKey || !Number.isFinite(time) || time < +from || time > +to || !Number.isFinite(p.lat) || !Number.isFinite(p.lon) || Math.abs(p.lat) > 90 || Math.abs(p.lon) > 180 || (!p.lat && !p.lon)) continue;
    const parts = localParts(time, settings.timeZone);
    if (!parts || !isNight(parts.hour, settings)) continue;
    const unique = `${p.trackKey}:${time}:${p.lat}:${p.lon}`;
    if (seen.has(unique)) continue;
    seen.add(unique);
    if (!grouped.has(p.trackKey)) grouped.set(p.trackKey, []);
    grouped.get(p.trackKey)!.push({ ...p, trackId: track.track_id, radar: track.tipo_radar });
  }
  const keys = [...grouped.keys()].sort();
  const groups: ReportMapGroup[] = [];
  for (let i = 0; i < keys.length; i += 8) {
    const trackKeys = keys.slice(i, i + 8);
    groups.push({ trackKeys, points: trackKeys.flatMap(key => grouped.get(key)!) });
  }
  return groups.length ? groups : [{ trackKeys: [], points: [] }];
}
