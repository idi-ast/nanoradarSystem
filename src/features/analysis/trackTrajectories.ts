import type { FeatureCollection, MultiLineString, Point } from 'geojson';
import type { AnalysisPoint } from '@/features/history/analysis';

const colors = ['#38bdf8', '#2dd4bf', '#fbbf24', '#c084fc', '#fb7185', '#a3e635', '#fb923c', '#818cf8'];
/** Keep radar/session identities separate and never draw through unobserved gaps. */
export function buildTrackTrajectories(points: AnalysisPoint[], maxGapSeconds: number, options: { markers?: 'segment-ends' | 'track-ends' } = {}) {
  const grouped = new Map<string, AnalysisPoint[]>();
  for (const p of points) {
    if (!p.trackKey || !Number.isFinite(Date.parse(p.fecha ?? '')) || !Number.isFinite(p.lat) || Math.abs(p.lat) > 90 || !Number.isFinite(p.lon) || Math.abs(p.lon) > 180 || (!p.lat && !p.lon)) continue;
    if (!grouped.has(p.trackKey)) grouped.set(p.trackKey, []);
    grouped.get(p.trackKey)!.push(p);
  }
  const lines: FeatureCollection<MultiLineString> = { type: 'FeatureCollection', features: [] };
  const markers: FeatureCollection<Point> = { type: 'FeatureCollection', features: [] };
  for (const [key, raw] of grouped) {
    const series = [...new Map(raw.map(p => [`${Date.parse(p.fecha!)}:${p.lat}:${p.lon}`, p])).values()].sort((a, b) => Date.parse(a.fecha!) - Date.parse(b.fecha!));
    let hash = 0;
    for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) | 0;
    const color = colors[(hash >>> 0) % colors.length];
    const last = series[series.length - 1];
    const properties = { trackKey: key, trackId: last.trackId ?? key, radar: last.radar ?? '', color };
    const segments: number[][][] = [];
    let segment: number[][] = [];
    series.forEach((p, i) => {
      const prev = series[i - 1];
      if (prev && Date.parse(p.fecha!) === Date.parse(prev.fecha!) && p.lon === prev.lon && p.lat === prev.lat) return;
      if (prev && (Date.parse(p.fecha!) <= Date.parse(prev.fecha!) || (Date.parse(p.fecha!) - Date.parse(prev.fecha!)) / 1000 > maxGapSeconds)) {
        if (segment.length > 1) segments.push(segment);
        segment = [];
      }
      segment.push([p.lon, p.lat]);
      const next = series[i + 1];
      const endOfSegment = !next || Date.parse(next.fecha!) <= Date.parse(p.fecha!) || (Date.parse(next.fecha!) - Date.parse(p.fecha!)) / 1000 > maxGapSeconds;
      if (options.markers !== 'track-ends' && (segment.length === 1 || endOfSegment)) markers.features.push({ type: 'Feature', properties: { ...properties, label: p === last ? properties.trackId : '' }, geometry: { type: 'Point', coordinates: [p.lon, p.lat] } });
    });
    if (options.markers === 'track-ends') {
      const first = series[0];
      const endpoints = first === last ? [{ point: first, endpoint: 'single', title: 'Inicio / fin' }] : [
        { point: first, endpoint: 'start', title: 'Inicio' }, { point: last, endpoint: 'end', title: 'Fin' },
      ];
      for (const { point, endpoint, title } of endpoints) markers.features.push({ type: 'Feature',
        properties: { ...properties, endpoint, label: `${properties.trackId} · ${title}` },
        geometry: { type: 'Point', coordinates: [point.lon, point.lat] } });
    }
    if (segment.length > 1) segments.push(segment);
    if (segments.length) lines.features.push({ type: 'Feature', properties, geometry: { type: 'MultiLineString', coordinates: segments } });
  }
  return { lines, markers };
}
