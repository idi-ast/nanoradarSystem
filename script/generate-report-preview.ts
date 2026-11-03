import fs from 'node:fs';
import pdfMake from 'pdfmake/build/pdfmake';
import { buildTrackActivityReport, initializeReportFonts } from '../src/features/history/report';
import { analysisTrackKey, type TrackSummary } from '../src/features/history/types';
import type { AnalysisPoint, AnalysisZone } from '../src/features/history/analysis';

const tracks: TrackSummary[] = [], points: AnalysisPoint[] = [];
const zones: AnalysisZone[] = [
  { nombre: 'modulo', vertices: [[-41.5, -73.001], [-41.5, -73], [-41.4993, -73], [-41.4993, -73.001]] },
  { nombre: 'Acceso norte', vertices: [[-41.498, -73.003], [-41.496, -73.003], [-41.496, -72.999], [-41.498, -72.999]] },
];
const start = Date.parse('2026-11-01T00:00:00-03:00');
for (let i = 0; i < 28; i++) {
  const first = start + i * 85 * 60000;
  const t: TrackSummary = { track_id: `T${String(i + 1).padStart(4, '0')}`, tipo_radar: i % 4 ? 'magos' : 'nano', first_seen: new Date(first).toISOString(), last_seen: new Date(first + 40 * 60000).toISOString(), point_count: 241, nivel_max: i % 5, zones: ['modulo'], behavior_class: i % 5 ? 'lancha' : 'sin_clasificar', behavior_confidence: .87, avg_speed: 1.2 + i / 10, max_speed: 6.2, duration_seconds: 2400 };
  tracks.push(t);
  for (let n = 0; n <= 80; n++) {
    const offset = (n - 40) / 40;
    points.push({ trackKey: analysisTrackKey(t), trackId: t.track_id, radar: t.tipo_radar, fecha: new Date(first + n * 30000).toISOString(), lat: -41.49965 + offset * .002, lon: -73.0005 + (i % 6 - 2) * .0003, zona: null, speed: 2 });
  }
}
initializeReportFonts();
const { docDefinition } = buildTrackActivityReport({ tracks, points, zones, filters: { minPoints: 2, from: '2026-11-01T00:00:00-03:00', to: '2026-11-03T00:00:00-03:00' }, total: tracks.length, tracksAnalyzed: tracks.length, pointsLimited: true, quality: { tracksRequested: tracks.length, failedTracks: 0, uniformSampling: true }, demonstration: true });
const output = process.argv[2] ?? 'output/pdf/informe-operativo-demostracion.pdf';
pdfMake.createPdf(docDefinition).getBuffer(buffer => { fs.writeFileSync(output, buffer); console.log(output); });
