import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import type { TrackSummary, TrackSummaryFilters } from "./types";
import { analysisTrackKey } from "./types";
import type { AnalysisPoint, AnalysisZone, AnalysisFetchResult } from "./analysis";
import { computeOperationalAnalysis, DEFAULT_REPORT_SETTINGS, filterReportTracks, isValidAnalysisZone, reportCategoryLabel, localParts, isNight, type ReportSettings } from "./reportAnalytics";
import { hourlyChart, activityMatrix, spatialChart } from "./reportCharts";
import { computeTrackMovements, rankTrackMovements, type TrackMovement } from './reportMovement';

export interface ReportRange { from: Date; to: Date; filtered: boolean }
export interface TrackReportOptions {
  tracks: TrackSummary[]; total: number; filters: TrackSummaryFilters;
  onlyWithZones?: boolean; onlyFavorites?: boolean; defaultHours?: number; limited?: boolean;
  points?: AnalysisPoint[]; zones?: AnalysisZone[]; tracksAnalyzed?: number; pointsLimited?: boolean;
  settings?: Partial<ReportSettings>; quality?: Partial<AnalysisFetchResult>;
  demonstration?: boolean;
}
export function resolveReportRange(filters: TrackSummaryFilters, defaultHours = 12): ReportRange {
  const to = filters.to ? new Date(filters.to) : new Date();
  const from = filters.from ? new Date(filters.from) : new Date(to.getTime() - defaultHours * 3600000);
  if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime()) || from > to) throw new Error("Selecciona un período de fechas válido");
  return { from, to, filtered: Boolean(filters.from || filters.to) };
}
export function initializeReportFonts() {
  const fonts = pdfFonts as unknown as Record<string, unknown> & { pdfMake?: { vfs?: Record<string, string> } };
  const vfs = fonts.pdfMake?.vfs ?? fonts;
  if (typeof vfs["Roboto-Regular.ttf"] !== "string") throw new Error("No se pudieron cargar las fuentes del informe");
  pdfMake.addVirtualFileSystem(vfs as Record<string, string>);
}
const C = { ink: '#0f172a', muted: '#64748b', blue: '#0369a1', teal: '#0f766e', amber: '#b45309', red: '#be123c', pale: '#f1f5f9' };
const num = (n: number) => n.toLocaleString('es-CL', { maximumFractionDigits: 1 });
const pct = (a: number, b: number) => b ? `${(100 * a / b).toFixed(1)}%` : 'N/D';
const hour = (n: number) => `${String(n).padStart(2, '0')}:00`;
const dateTime = (value: string | Date | null, timeZone: string) => {
  if (!value || !Number.isFinite(new Date(value).getTime())) return 'N/D';
  return new Intl.DateTimeFormat('es-CL', { timeZone, dateStyle: 'short', timeStyle: 'medium', hourCycle: 'h23' }).format(new Date(value));
};
function title(kicker: string, heading: string, description: string, pageBreak = false): Content[] {
  return [{ text: kicker.toUpperCase(), color: C.teal, bold: true, fontSize: 8, characterSpacing: 1, ...(pageBreak ? { pageBreak: 'before' as const } : {}) }, { text: heading, fontSize: 23, bold: true, color: C.ink, margin: [0, 5, 0, 7] }, { text: description, fontSize: 9, color: C.muted, margin: [0, 0, 0, 15] }];
}
const heading = (text: string): Content => ({ text, bold: true, fontSize: 12, color: C.ink, margin: [0, 12, 0, 6] });
const note = (text: string): Content => ({ text, color: C.muted, fontSize: 8, margin: [0, 5, 0, 7], lineHeight: 1.25 });
function table(headers: string[], rows: (string | number)[][], widths?: (number | string)[], small = false, highlightedRows = new Set<number>()): Content {
  return { table: { headerRows: 1, widths: widths ?? headers.map(() => '*'), dontBreakRows: true, body: [headers.map(text => ({ text, bold: true, color: '#ffffff', fillColor: C.ink, fontSize: small ? 7 : 8 })), ...(rows.length ? rows : [headers.map((_, i) => i ? '' : 'Sin registros disponibles')]).map((row, i) => row.map(value => ({ text: String(value), ...(highlightedRows.has(i) ? { color: C.red, bold: true } : {}), fillColor: i % 2 ? '#ffffff' : '#f1f5f9', fontSize: small ? 7 : 8 })))] }, layout: { hLineWidth: () => .3, vLineWidth: () => 0, hLineColor: () => '#e2e8f0', paddingLeft: () => 6, paddingRight: () => 6, paddingTop: () => small ? 3 : 5, paddingBottom: () => small ? 3 : 5 }, margin: [0, 3, 0, 8] };
}
function cards(items: [string, string][]): Content {
  return { columns: items.map(([value, label]) => ({ width: '*', stack: [{ text: value, bold: true, color: C.blue, fontSize: 24, margin: [0, 0, 0, 5] }, { text: label, color: C.muted, fontSize: 8 }], margin: [0, 0, 8, 8] })), columnGap: 8, margin: [0, 8, 0, 10] };
}
const traveled = (m: TrackMovement) => m.distanceM == null ? 'N/D' : m.distanceM > 0 ? `${m.distanceM < .1 ? '<0,1' : num(m.distanceM)} m${m.source === 'sample' ? ' ~' : ''}` : 'Sin desplazamiento';
const trackTime = (seconds: number | null) => seconds != null && seconds > 0 ? seconds >= 3600 ? `${(seconds / 3600).toFixed(2)} h` : seconds >= 60 ? `${(seconds / 60).toFixed(1)} min` : `${seconds < .1 ? '<0,1' : num(seconds)} s` : '—';
const movementSource = (m: TrackMovement) => m.source === 'full' ? 'Historial completo' : m.source === 'sample' ? 'Muestra (~)' : 'Sin trayectoria';
const movementOrder = (settings: ReportSettings) => settings.movementSort === 'duration' ? 'mayor tiempo de seguimiento' : settings.movementSort === 'points' ? 'más puntos registrados' : 'mayor distancia recorrida';
const movementMethod = (settings: ReportSettings) => `Recorrido: suma geodésica entre posiciones consecutivas separadas por hasta ${settings.maxGapSeconds} s, sin unir huecos largos. Trackeo: primera a última detección dentro del período; puede incluir interrupciones. Tiempo enlazado: suma de intervalos válidos. Historial completo: métricas antes de muestrear; ~: estimación sobre la muestra, que puede subestimar el recorrido. N/D no equivale a cero.`;

function reportDocument(opts: TrackReportOptions, settings: ReportSettings, content: Content[]): TDocumentDefinitions {
  return {
    pageSize: 'A4', pageMargins: [40, 48, 40, 44],
    info: { title: 'Informe operativo de actividad y proximidad a módulos', author: 'WISENSOR / AST', subject: 'Tráfico observado, recorrido y zonas críticas' },
    defaultStyle: { font: 'Roboto', fontSize: 9, color: C.ink },
    header: page => ({ text: opts.demonstration ? 'DEMOSTRACIÓN / DATOS SINTÉTICOS' : `WISENSOR / AST     |     INFORME OPERATIVO DE HISTORIAL`, color: page === 1 ? C.teal : C.muted, fontSize: 7, margin: [40, 22, 40, 0] }),
    footer: (page, totalPages) => ({ columns: [{ text: `${settings.timeZone} | Generado ${dateTime(new Date(), settings.timeZone)}`, fontSize: 7, color: C.muted }, { text: `${page} / ${totalPages}`, alignment: 'right', fontSize: 8, color: C.muted }], margin: [40, 15, 40, 0] }),
    content,
  };
}

export function buildTrackActivityReport(opts: TrackReportOptions): { docDefinition: TDocumentDefinitions; range: ReportRange } {
  const range = resolveReportRange(opts.filters, opts.defaultHours);
  const settings = { ...DEFAULT_REPORT_SETTINGS, ...opts.settings };
  if (!Number.isSafeInteger(settings.minApproachPoints) || settings.minApproachPoints < 1) throw new Error("El mínimo de puntos para rankings debe ser un entero mayor o igual a 1");
  const zones = (opts.zones ?? []).filter(isValidAnalysisZone);
  const selectedTracks = filterReportTracks(opts.tracks, settings.category);
  const selectedKeys = new Set(selectedTracks.map(analysisTrackKey));
  const selectedPoints = settings.category ? (opts.points ?? []).filter(p => p.trackKey && selectedKeys.has(p.trackKey)) : opts.points ?? [];
  const analysis = computeOperationalAnalysis({ tracks: selectedTracks, points: selectedPoints, zones, from: range.from, to: range.to, settings });
  const { tracks, hourly, days, points } = analysis;
  const quality = opts.quality ?? {};
  const analyzed = opts.tracksAnalyzed ?? quality.tracksAnalyzed ?? new Set(points.map(p => p.trackKey)).size;
  const nightLabel = `${hour(settings.nightStart)} - ${hour(settings.nightEnd)}`;
  const movements = computeTrackMovements(tracks, points, range.from, range.to, settings.maxGapSeconds, quality.movements);
  const eligible = movements.filter(m => m.track.point_count >= settings.minApproachPoints);
  const ranked = rankTrackMovements(eligible, settings.movementSort, settings.minApproachPoints);
  const rankedKeys = new Set(ranked.map(m => m.key));
  // Retain tracks without trajectory metrics so the table can explicitly show N/D.
  const ordered = [...ranked, ...eligible.filter(m => !rankedKeys.has(m.key)).sort((a, b) => a.key.localeCompare(b.key))];
  const coverageNote = `${num(analyzed)} historiales solicitados correctamente; ${num(points.length)} posiciones válidas analizadas. ${opts.limited || opts.pointsLimited || quality.failedTracks ? 'Cobertura parcial o muestreada.' : 'Sin recorte declarado.'}`;
  const content: Content[] = [
    { text: 'Actividad y vigilancia operativa del centro', bold: true, fontSize: 11, margin: [0, 0, 0, 10] },
    ...title('02 / Vigilancia nocturna', 'Actividad durante la noche', `Franja ${nightLabel}. Horario local ${settings.timeZone}.`),
    ...(opts.demonstration ? [note('DEMOSTRACIÓN - DATOS SINTÉTICOS. NO CORRESPONDE A UN CENTRO REAL.')] : []),
    { text: `${dateTime(range.from, settings.timeZone)}  a  ${dateTime(range.to, settings.timeZone)}`, bold: true, fontSize: 10 },
    note(`Categoría de actividad: ${reportCategoryLabel(settings.category)}. Radar: ${opts.filters.tipoRadar || 'todos'}. Zona: ${opts.filters.zone || 'todas'}.`),
    cards([[num(tracks.length), 'Tracks del período'], [num(analysis.nightTracks), 'Tracks observados de noche'], [num(analysis.nearNightTracks), 'Tracks próximos de noche'], [pct(analysis.nearNightTracks, analysis.nightTracks), 'Proporción nocturna próxima']]),
    heading('Lectura ejecutiva'),
    note(analysis.peakNightHour ? `Mayor proximidad nocturna a las ${hour(analysis.peakNightHour.hour)}: ${num(analysis.peakNightHour.near)} tracks distintos próximos a zonas críticas.` : 'No se observaron posiciones nocturnas próximas a las zonas críticas seleccionadas.'),
    note(`Proximidad: hasta ${settings.proximityM} m al perímetro. Zonas críticas: ${settings.criticalZones.join(', ') || 'ninguna seleccionada'}. ${coverageNote}`),
    { svg: hourlyChart(hourly, settings, 'near'), width: 515 },
  ];
  const trackMap = new Map(tracks.map(t => [analysisTrackKey(t), t]));
  const nightPoints = points.filter(p => isNight(localParts(p.fecha!, settings.timeZone)!.hour, settings));
  const nightKeys = [...new Set(nightPoints.map(p => p.trackKey))];
  // Small groups keep track identifiers legible, without dropping trajectories.
  for (let i = 0; i < Math.max(1, nightKeys.length); i += 8) {
    const keys = new Set(nightKeys.slice(i, i + 8));
    content.push(
      ...title('02 / Vigilancia nocturna', 'Mapa de actividad en la zona', `Trayectorias nocturnas e identificadores de track. Grupo ${Math.floor(i / 8) + 1} de ${Math.max(1, Math.ceil(nightKeys.length / 8))}.`, true),
      { svg: spatialChart(nightPoints.filter(p => keys.has(p.trackKey)).map(p => ({ ...p, trackId: trackMap.get(p.trackKey!)?.track_id ?? p.trackId })), zones, settings, false, true), width: 515 },
      note('Cada color corresponde a un track. No se enlazan huecos superiores al máximo configurado. Un track no equivale a una embarcación física identificada.'),
      note(`Polígonos: ${zones.map((z, n) => `${n + 1}: ${z.nombre}`).join(' | ') || 'sin zonas disponibles'}. Contorno rojo: zona crítica.`),
      ...(!nightKeys.length ? [note('Sin posiciones nocturnas válidas para representar trazados.')] : []),
    );
  }
  const byHour = new Map<number, TrackMovement[]>();
  const undated: TrackMovement[] = [];
  for (const m of ordered) {
    const start = Math.max(range.from.getTime(), Date.parse(m.track.first_seen ?? ''));
    const parts = localParts(start, settings.timeZone);
    if (!parts) { undated.push(m); continue; }
    if (!byHour.has(parts.hour)) byHour.set(parts.hour, []);
    byHour.get(parts.hour)!.push(m);
  }
  const rows: string[][] = [];
  const highlightedRows = new Set<number>();
  const maxAccumulatedSeconds = eligible.reduce((max, m) => Math.max(max, m.trackedSeconds ?? 0), 0);
  const addRows = (label: string, entries: TrackMovement[]) => entries.forEach((m, i) => {
    const index = String(i + 1).padStart(2, '0');
    if (maxAccumulatedSeconds > 0 && m.trackedSeconds === maxAccumulatedSeconds) highlightedRows.add(rows.length);
    rows.push([i === 0 ? label : '', `${index} - ${m.track.track_id} / ${m.track.tipo_radar}\n${dateTime(new Date(Math.max(range.from.getTime(), Date.parse(m.track.first_seen ?? ''))), settings.timeZone)}`, traveled(m), trackTime(m.elapsedSeconds), trackTime(m.trackedSeconds), num(m.track.point_count), movementSource(m)]);
  });
  for (const [h, entries] of [...byHour].sort((a, b) => a[0] - b[0])) addRows(hour(h), entries);
  addRows('Sin fecha', undated);
  content.push(
    ...title('05 / Recorrido y seguimiento', 'Distancia recorrida y tiempo de trackeo', `Agrupado por hora de inicio dentro del período (todas las fechas). Orden dentro de cada hora: ${movementOrder(settings)}. Mínimo ${settings.minApproachPoints} puntos.`, true),
    table(['Horario', 'Track / radar', 'Recorrido (m)', 'Trackeo', 'Tiempo enlazado', 'Puntos', 'Base'], rows, [31, 119, 58, 42, 48, 33, '*'], true, highlightedRows),
    note('Rojo: tracks con el mayor tiempo enlazado acumulado del listado, incluidos los empates.'),
    note(movementMethod(settings)), note(coverageNote),
  );
  for (let i = 0; i < Math.max(1, days.length); i += 28) {
    content.push(...title('03 / Distribución temporal', 'Calendario de actividad observada', `Tiempo de trackeo acumulado por fecha y hora, en minutos. Se suman intervalos entre posiciones consecutivas separados por hasta ${settings.maxGapSeconds} s, repartidos entre las horas que atraviesan.`, true),
      { svg: activityMatrix(days.slice(i, i + 28), settings), width: 515 },
      note('Verde: menor tiempo; rojo: mayor tiempo. Se suman los tiempos de todos los tracks, incluso cuando coinciden: una celda puede superar 60 min. Base: posiciones analizadas (muestra), sin extrapolar huecos ni usar el número de embarcaciones.'),
    );
  }
  if (settings.showHeatmap) content.push(
    ...title('04 / Distribución geográfica', 'Dónde se concentran las detecciones', 'Densidad de posiciones analizadas por celda. Mapa esquemático con polígonos de zonas, orientación, coordenadas y escala.', true),
    { svg: spatialChart(points, zones, settings), width: 515 },
    heading('Detalle del entorno de las zonas críticas'),
    { svg: spatialChart(points, zones, settings, true), width: 515 },
    note(`Polígonos del mapa general: ${zones.map((z, i) => `${i + 1}: ${z.nombre}`).join(' | ') || 'No hay zonas disponibles'}. Contorno rojo: zona crítica. La densidad depende de la frecuencia de registro y del muestreo.`),
  );
  return { range, docDefinition: reportDocument(opts, settings, content) };
}

export function downloadTrackActivityReport(opts: TrackReportOptions): ReportRange {
  initializeReportFonts();
  const { docDefinition, range } = buildTrackActivityReport(opts);
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  pdfMake.createPdf(docDefinition).download(`informe-operativo-${stamp}.pdf`);
  return range;
}
