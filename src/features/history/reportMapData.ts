import type { AnalysisPoint } from './analysis';
import { analysisTrackKey, type TrackSummary } from './types';
import { isNight, localParts, type ReportSettings } from './reportAnalytics';

export interface ReportMapGroup { trackKeys: string[]; points: AnalysisPoint[]; colors?: Record<string, string> }
const REPORT_COLORS = ['#0369a1', '#be123c', '#15803d', '#7e22ce', '#c2410c', '#0f766e', '#a16207', '#475569'];
function reportColor(index: number): string {
  if (REPORT_COLORS[index]) return REPORT_COLORS[index];
  // Hex colors work in both Mapbox and PDFMake's SVG renderer.
  const hue = ((index * 137.508) % 360) / 60;
  const c = .55, x = c * (1 - Math.abs(hue % 2 - 1)), m = .12;
  const channels = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]][Math.floor(hue)];
  return `#${channels.map(value => Math.round((value + m) * 255).toString(16).padStart(2, '0')).join('')}`;
}
export interface ReportMapCapture { trackKeys: string[]; image: string; width: number; height: number }
/** PDF pages and satellite captures share exactly the same historical observations. */
export function nightMapGroups(tracks: TrackSummary[], points: AnalysisPoint[], from: Date, to: Date, settings: ReportSettings): ReportMapGroup[] {
  const trackMap = new Map(tracks.filter(t => t.point_count >= settings.minApproachPoints).map(t => [analysisTrackKey(t), t]));
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
  return [{
    trackKeys: keys,
    points: keys.flatMap(key => grouped.get(key)!),
    colors: Object.fromEntries(keys.map((key, i) => [key,
      reportColor(i),
    ])),
  }];
}

/** Individual panels distinguish coincident paths without moving their coordinates. */
export function reportMapDetails(groups: ReportMapGroup[]): ReportMapGroup[] {
  return groups.filter(group => group.trackKeys.length > 1).flatMap(group => group.trackKeys.map(key => ({
    trackKeys: [key], points: group.points.filter(p => p.trackKey === key), colors: group.colors,
  })));
}
