import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import type { TrackSummary, TrackSummaryFilters } from "./types";
import { analysisTrackKey } from "./types";
import type { AnalysisPoint, AnalysisZone, AnalysisFetchResult } from "./analysis";
import { computeOperationalAnalysis, DEFAULT_REPORT_SETTINGS, filterReportApproaches, filterReportTracks, isBoat, isValidAnalysisZone, normalizeZone, reportCategoryLabel, type ReportSettings, type Approach } from "./reportAnalytics";
import { hourlyChart, activityMatrix, spatialChart, weekdayChart } from "./reportCharts";
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
const meters = (n: number | null | undefined) => n == null || !Number.isFinite(n) ? 'N/D' : n >= 1000 ? `${(n / 1000).toFixed(2)} km` : `${n.toFixed(1)} m`;
const minutes = (n: number) => `${(n / 60).toFixed(1)} min`;
const shortTime = (value: string | null, timeZone: string) => value ? new Intl.DateTimeFormat('es-CL', { timeZone, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(new Date(value)) : 'N/D';
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
function table(headers: string[], rows: (string | number)[][], widths?: (number | string)[], small = false): Content {
  return { table: { headerRows: 1, widths: widths ?? headers.map(() => '*'), dontBreakRows: true, body: [headers.map(text => ({ text, bold: true, color: '#ffffff', fillColor: C.ink, fontSize: small ? 7 : 8 })), ...(rows.length ? rows : [headers.map((_, i) => i ? '' : 'Sin registros disponibles')]).map((row, i) => row.map(value => ({ text: String(value), fillColor: i % 2 ? '#ffffff' : '#f1f5f9', fontSize: small ? 7 : 8 })))] }, layout: { hLineWidth: () => .3, vLineWidth: () => 0, hLineColor: () => '#e2e8f0', paddingLeft: () => 6, paddingRight: () => 6, paddingTop: () => small ? 3 : 5, paddingBottom: () => small ? 3 : 5 }, margin: [0, 3, 0, 8] };
}
function cards(items: [string, string][]): Content {
  return { columns: items.map(([value, label]) => ({ width: '*', stack: [{ text: value, bold: true, color: C.blue, fontSize: 24, margin: [0, 0, 0, 5] }, { text: label, color: C.muted, fontSize: 8 }], margin: [0, 0, 8, 8] })), columnGap: 8, margin: [0, 8, 0, 10] };
}
const reason = (a: Approach) => a.reasons.length ? a.reasons.join('; ') : 'Acercamiento diurno; revisar contexto operativo';
const traveled = (m: TrackMovement) => m.distanceM == null ? 'N/D' : m.distanceM > 0 ? `${m.distanceM < .1 ? '<0,1' : num(m.distanceM)} m${m.source === 'sample' ? ' ~' : ''}` : 'Sin desplazamiento';
const trackTime = (seconds: number | null) => seconds != null && seconds > 0 ? seconds >= 3600 ? `${(seconds / 3600).toFixed(2)} h` : seconds >= 60 ? `${(seconds / 60).toFixed(1)} min` : `${seconds < .1 ? '<0,1' : num(seconds)} s` : '—';
const movementSource = (m: TrackMovement) => m.source === 'full' ? 'Historial completo' : m.source === 'sample' ? 'Muestra (~)' : 'Sin trayectoria';
const movementOrder = (settings: ReportSettings) => settings.movementSort === 'duration' ? 'mayor tiempo de seguimiento' : settings.movementSort === 'points' ? 'más puntos registrados' : 'mayor distancia recorrida';
const movementMethod = (settings: ReportSettings) => `Recorrido: suma geodésica entre posiciones consecutivas separadas por hasta ${settings.maxGapSeconds} s, sin unir huecos largos. Trackeo: primera a última detección dentro del período; puede incluir interrupciones. Tiempo enlazado: suma de intervalos válidos. Historial completo: métricas antes de muestrear; ~: estimación sobre la muestra, que puede subestimar el recorrido. N/D no equivale a cero. El cero de distancia al módulo indica interior o borde y se conserva.`;

function reportDocument(opts: TrackReportOptions, settings: ReportSettings, content: Content[]): TDocumentDefinitions {
  const summary = settings.format === 'summary';
  return {
    pageSize: 'A4', pageMargins: [40, 48, 40, 44],
    info: { title: summary ? 'Resumen visual de actividad y recorrido de tracks' : 'Informe operativo de actividad y proximidad a módulos', author: 'WISENSOR / AST', subject: 'Tráfico observado, recorrido y zonas críticas' },
    defaultStyle: { font: 'Roboto', fontSize: 9, color: C.ink },
    header: page => ({ text: opts.demonstration ? 'DEMOSTRACIÓN / DATOS SINTÉTICOS' : `WISENSOR / AST     |     ${summary ? 'RESUMEN VISUAL' : 'INFORME OPERATIVO DE HISTORIAL'}`, color: page === 1 ? C.teal : C.muted, fontSize: 7, margin: [40, 22, 40, 0] }),
    footer: (page, totalPages) => ({ columns: [{ text: `${settings.timeZone} | Generado ${dateTime(new Date(), settings.timeZone)}`, fontSize: 7, color: C.muted }, { text: `${page} / ${totalPages}`, alignment: 'right', fontSize: 8, color: C.muted }], margin: [40, 15, 40, 0] }),
    content,
  };
}

export function buildTrackActivityReport(opts: TrackReportOptions): { docDefinition: TDocumentDefinitions; range: ReportRange } {
  const range = resolveReportRange(opts.filters, opts.defaultHours);
  const settings = { ...DEFAULT_REPORT_SETTINGS, ...opts.settings };
  const zones = (opts.zones ?? []).filter(isValidAnalysisZone);
  const selectedTracks = filterReportTracks(opts.tracks, settings.category);
  const selectedKeys = new Set(selectedTracks.map(analysisTrackKey));
  const selectedPoints = settings.category ? (opts.points ?? []).filter(p => p.trackKey && selectedKeys.has(p.trackKey)) : opts.points ?? [];
  const analysis = computeOperationalAnalysis({ tracks: selectedTracks, points: selectedPoints, zones, from: range.from, to: range.to, settings });
  const { tracks, hourly, days, points } = analysis;
  const approaches = filterReportApproaches(analysis.approaches, settings.minApproachPoints);
  const quality = opts.quality ?? {};
  const analyzed = opts.tracksAnalyzed ?? quality.tracksAnalyzed ?? new Set(points.map(p => p.trackKey)).size;
  const closest = approaches.filter(a => a.nearPoints > 0);
  const priorityOrder = { Alta: 0, Media: 1, Observación: 2 };
  const priorities = [...closest].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority] || b.nightSeconds - a.nightSeconds || a.minDistanceM - b.minDistanceM);
  const boatPeak = [...hourly].filter(h => h.boatStarts > 0).sort((a, b) => b.boatStarts - a.boatStarts)[0];
  const peak = analysis.peakHour;
  const nightLabel = `${hour(settings.nightStart)} - ${hour(settings.nightEnd)}`;
  const criticalZones = zones.filter(z => settings.criticalZones.map(normalizeZone).includes(normalizeZone(z.nombre)));
  const closestBoat = approaches.find(a => isBoat(a.track));
  const classCounts = new Map<string, number>(), radarCounts = new Map<string, number>();
  for (const t of tracks) { const name = t.behavior_class || 'sin clasificar'; classCounts.set(name, (classCounts.get(name) ?? 0) + 1); radarCounts.set(t.tipo_radar || 'sin radar', (radarCounts.get(t.tipo_radar || 'sin radar') ?? 0) + 1); }
  const complete = !opts.limited && !opts.pointsLimited && !quality.failedTracks && analyzed === tracks.length;
  const coverageLabel = `${num(analyzed)} / ${num(tracks.length)} tracks con historial solicitado correctamente`;
  const movements = computeTrackMovements(tracks, points, range.from, range.to, settings.maxGapSeconds, quality.movements);
  const movementMap = new Map(movements.map(m => [m.key, m]));
  const movementRanking = rankTrackMovements(movements, settings.movementSort, settings.minApproachPoints);
  const coverageNote = `${coverageLabel}; ${num(points.length)} posiciones analizadas. ${complete ? 'Sin recorte declarado.' : 'Cobertura parcial o muestreada.'} Los rankings de distancia cubren solo tracks con recorrido calculable; ${movements.filter(m => m.source === 'full').length} con métricas del historial completo.`;
  if (settings.format === 'summary') {
    const content: Content[] = [
      ...title('WISENSOR / RADAR AST', 'Actividad del centro\nResumen visual', 'Gráficos del período, mapas de calor y tracks destacados'),
      ...(opts.demonstration ? [note('DEMOSTRACIÓN - DATOS SINTÉTICOS. NO CORRESPONDE A UN CENTRO REAL.')] : []),
      { text: `${dateTime(range.from, settings.timeZone)}  a  ${dateTime(range.to, settings.timeZone)}`, bold: true, fontSize: 10 },
      note(`Categoría de actividad: ${reportCategoryLabel(settings.category)}. Radar: ${opts.filters.tipoRadar || 'todos'}. Zona: ${opts.filters.zone || 'todas'}. Noche ${nightLabel}, ${settings.timeZone}. ${num(tracks.length)} tracks. Solo favoritos: ${opts.onlyFavorites ? 'sí' : 'no'}; solo con zonas: ${opts.onlyWithZones ? 'sí' : 'no'}.`),
      heading('Actividad por hora'), { svg: hourlyChart(hourly, settings), width: 515 },
      heading('Proximidad durante la noche'), { svg: hourlyChart(hourly, settings, 'near'), width: 515 },
      note(coverageNote),
      ...title('02 / Mapas de calor', 'Concentración de actividad', 'Densidad de posiciones de la categoría seleccionada. Rojo: polígonos críticos; no representa probabilidad de robo.', true),
      { svg: spatialChart(points, zones, settings), width: 515 },
      heading('Entorno de zonas críticas'), { svg: spatialChart(points, zones, settings, true), width: 515 },
      note(`Zonas: ${zones.map(z => z.nombre).join(', ') || 'sin polígonos'}. La densidad depende de la frecuencia de registro y del muestreo.`),
      ...title('03 / Tracks destacados', 'Patrones y mayores recorridos', `Orden por ${movementOrder(settings)}. Mínimo ${settings.minApproachPoints} puntos; se omiten ceros y valores ausentes del criterio de orden.`, true),
      { svg: weekdayChart(days), width: 515 },
      heading('Hasta 10 tracks para revisar'),
      table(['Track / radar', 'Recorrido (m)', 'Trackeo', 'Puntos'], movementRanking.slice(0, 10).map(m => [`${m.track.track_id} / ${m.track.tipo_radar}`, traveled(m), trackTime(m.elapsedSeconds), num(m.track.point_count)]), [150, 110, 110, '*'], true),
      ...(!movementRanking.length ? [note('No hay tracks que cumplan el mínimo de puntos y tengan un valor positivo para el criterio seleccionado.')] : []),
      note(movementMethod(settings)), note(coverageNote),
    ];
    return { range, docDefinition: reportDocument(opts, settings, content) };
  }
  const content: Content[] = [
    ...title('WISENSOR / RADAR AST', 'Actividad y vigilancia\noperativa del centro', 'Informe de historial | Tráfico, actividad nocturna y proximidad a zonas críticas'),
    ...(opts.demonstration ? [{ text: 'DEMOSTRACIÓN - DATOS SINTÉTICOS. NO CORRESPONDE A UN CENTRO REAL.', color: C.red, bold: true, fontSize: 10, margin: [0, 0, 0, 12] } as Content] : []),
    { text: `${dateTime(range.from, settings.timeZone)}  a  ${dateTime(range.to, settings.timeZone)}`, bold: true, fontSize: 11 },
    note(`Zona horaria: ${settings.timeZone}. Noche operativa: ${nightLabel}. Zonas críticas: ${criticalZones.map(z => z.nombre).join(', ') || 'ninguna seleccionada/disponible'}. Umbral de proximidad: ${settings.proximityM} m al perímetro.`),
    note(`Categoría de actividad: ${reportCategoryLabel(settings.category)}. Todos los indicadores, gráficos, mapas y registros de este informe corresponden a esta selección.`),
    cards([[num(tracks.length), 'Tracks del período'], [num(analysis.boats.length), 'Clasificados como embarcación'], [num(analysis.nightTracks), 'Tracks observados de noche*'], [num(analysis.nearNightTracks), 'Próximos a zona crítica de noche*']]),
    heading('Lectura ejecutiva'),
    {
      ul: [
        peak ? `Mayor cantidad de inicios: ${hour(peak.hour)} - ${hour((peak.hour + 1) % 24)}, con ${num(peak.starts)} tracks (${peak.startsPerHour == null ? 'sin exposición calculable' : `${peak.startsPerHour.toFixed(2)} inicios/hora de calendario cubierta`}).` : 'No hay horas de inicio válidas dentro del período.',
        boatPeak ? `Mayor inicio de tracks clasificados como embarcación: ${hour(boatPeak.hour)}, ${num(boatPeak.boatStarts)} tracks.` : 'No se dispone de tracks clasificados como embarcación para identificar su hora pico.',
        analysis.peakNightHour ? `Franja nocturna con más proximidad observada: ${hour(analysis.peakNightHour.hour)}, ${analysis.peakNightHour.near} tracks distintos cerca de zonas críticas.` : 'No se observaron puntos nocturnos próximos a las zonas críticas en los historiales analizados.',
        closestBoat ? `Embarcación clasificada con menor distancia observada (mínimo ${num(settings.minApproachPoints)} puntos registrados en el período): ${closestBoat.track.track_id} (${closestBoat.track.tipo_radar}), ${meters(closestBoat.minDistanceM)} respecto de ${closestBoat.zone}, ${dateTime(closestBoat.closestAt, settings.timeZone)}.` : `No hay posiciones de embarcaciones clasificadas que cumplan el mínimo de ${num(settings.minApproachPoints)} puntos registrados en el período para el ranking de acercamientos.`,
        `${priorities.filter(a => a.priority === 'Alta').length} combinaciones track-zona de prioridad Alta para revisión. Es una regla operativa explicable, no una conclusión de robo.`,
      ], fontSize: 9, lineHeight: 1.35, margin: [0, 0, 0, 8]
    },
    heading('Cobertura y alcance'),
    note(`${coverageLabel}. ${num(points.length)} posiciones válidas analizadas. ${complete ? 'Sin recorte declarado.' : 'Análisis espacial parcial o muestreado: los mínimos observados pueden ser mayores que los acercamientos reales y los tiempos no representan permanencia total.'} *Indicadores basados en posiciones analizadas, no en toda la flota.`),
    note('Un track es un identificador de seguimiento del radar en el período devuelto por el sistema. Puede reiniciarse, fragmentarse o reutilizarse; no equivale a una lancha física identificada, matrícula o propietario. Actividad nocturna y proximidad requieren corroboración con cámaras, autorizaciones y bitácora.'),
    heading('Prioridades inmediatas de revisión'),
    note(`El ranking, los episodios y los casos de revisión incluyen solo tracks con al menos ${num(settings.minApproachPoints)} puntos registrados en el período. El umbral usa el resumen del track, no el número de posiciones muestreadas. Los indicadores y gráficos generales respetan la categoría seleccionada y los filtros del historial.`),
    table(['Track / radar', 'Zona', 'Prioridad', 'Distancia mín.*', 'Motivo'], priorities.slice(0, 5).map(a => [`${a.track.track_id}\n${a.track.tipo_radar}`, a.zone, a.priority, meters(a.minDistanceM), reason(a)]), [70, 62, 47, 65, '*'], true),
    ...title('01 / Patrones de tránsito', '¿A qué hora aumenta la actividad?', 'Comparación entre todos los tracks y los clasificados como embarcación. Los inicios usan todos los resúmenes descargados; no cuentan cada pulso del radar como una embarcación nueva.', true),
    { svg: hourlyChart(hourly, settings), width: 515, margin: [0, 0, 0, 10] },
    table(['Hora', 'Inicios', 'Embarc.', 'Inicios/h*', 'Presencia**', 'Cerca módulo**'], hourly.map(h => [hour(h.hour), h.starts, h.boatStarts, h.startsPerHour == null ? 'N/D' : h.startsPerHour.toFixed(2), h.present, h.near]), [44, 53, 55, 65, 70, '*'], true),
    note('*Por hora de calendario efectivamente incluida en el filtro, no por hora de disponibilidad del sensor. **Tracks distintos con posiciones en esa hora, sobre los historiales analizados. Un track puede aparecer en varias horas; no sumar estas columnas como embarcaciones únicas.'),
    ...title('02 / Vigilancia nocturna', 'Actividad durante la noche', `Franja ${nightLabel}. Los contadores nocturnos usan marcas de tiempo de posiciones reales, convertidas a ${settings.timeZone}.`, true),
    cards([[num(analysis.nightTracks), 'Tracks con posiciones nocturnas'], [num(analysis.nightBoats), 'Embarcaciones clasificadas de noche'], [num(analysis.nearNightTracks), 'Tracks próximos de noche'], [pct(analysis.nearNightTracks, analysis.nightTracks), 'Proporción nocturna próxima*']]),
    { svg: hourlyChart(hourly, settings, 'near'), width: 515 },
    note(`*Denominador: ${analysis.nightTracks} tracks de la muestra con posiciones nocturnas. Proximidad: distancia al perímetro menor o igual a ${settings.proximityM} m. Si el denominador es cero, se informa N/D.`),
    heading('Noches y fechas que requieren atención'),
    table(['Fecha local', 'Inicios totales', 'Embarcaciones', 'Tracks nocturnos*', 'Cerca de noche*'], [...days].sort((a, b) => b.nearNight - a.nearNight || b.nightPresent - a.nightPresent).slice(0, 15).map(d => [d.day, d.starts, d.boatStarts, d.nightPresent, d.nearNight]), [72, 80, 85, 92, '*'], true),
    note('Las fechas son días civiles: los registros entre 00:00 y 07:00 se asignan al día de la marca de tiempo. Esta tabla no agrupa por turno iniciado la noche anterior.'),
  ];
  for (let i = 0; i < Math.max(1, days.length); i += 28) {
    content.push(...title('03 / Distribución temporal', 'Calendario de actividad observada', `Lectura por fecha y hora. Cada celda muestra tracks distintos con posiciones, evitando que un emisor de mayor frecuencia domine el conteo. Fechas ${i + 1}-${Math.min(days.length, i + 28)} de ${days.length}.`, true));
    content.push({ svg: activityMatrix(days.slice(i, i + 28), settings), width: 515 });
    content.push(note('Una celda intensa refleja presencia observada, no intención ni autorización. El muestreo puede omitir actividad breve. Los colores resaltados en las cabeceras indican la franja nocturna.'));
    if (i === 0 && days.length <= 14) content.push(heading('Patrón semanal del período'), { svg: weekdayChart(days), width: 515 }, note('El número de fechas incluidas evita comparar un lunes observado una vez con varios martes como si tuvieran la misma exposición. “Embarc.” corresponde a la clasificación del sistema.'));
  }
  content.push(
    ...title('04 / Distribución geográfica', 'Dónde se concentran las detecciones', 'Mapa esquemático con proporción métrica local, polígonos de zonas, orientación, coordenadas y escala. Los colores representan posiciones por celda; no miden probabilidad de robo.', true),
    { svg: spatialChart(points, zones, settings), width: 515 },
    heading('Detalle del entorno de las zonas críticas'),
    { svg: spatialChart(points, zones, settings, true), width: 515 },
    note(`Leyenda de polígonos del mapa general: ${zones.map((z, i) => `${i + 1}: ${z.nombre}`).join(' | ') || 'No hay zonas disponibles'}. En el detalle, la numeración comienza nuevamente con las zonas críticas. Contorno rojo: zona crítica seleccionada.`),
    ...title('05 / Recorrido y seguimiento', 'Distancia recorrida y tiempo de trackeo', `Ranking por ${movementOrder(settings)}. Mínimo ${settings.minApproachPoints} puntos. Se omiten valores cero o ausentes del criterio de orden. Se muestran hasta 100 tracks.`, true),
    table(['Track / radar', 'Recorrido (m)', 'Trackeo', 'Tiempo enlazado', 'Puntos', 'Base'], movementRanking.slice(0, 100).map(m => [`${m.track.track_id} / ${m.track.tipo_radar}`, traveled(m), trackTime(m.elapsedSeconds), trackTime(m.trackedSeconds), num(m.track.point_count), movementSource(m)]), [90, 80, 65, 75, 45, '*'], true),
    ...(!movementRanking.length ? [note('No hay tracks que cumplan el mínimo de puntos y tengan un valor positivo para el criterio seleccionado.')] : []),
    note(movementMethod(settings)), note(coverageNote),
    ...title('06 / Acercamientos', 'Qué tracks se acercaron más a “modulo”', `Orden por menor distancia observada a los polígonos críticos. Cero significa posición dentro del polígono o en su borde. Un mínimo muestreado no prueba que el track nunca se acercó más.`, true),
    ...(!criticalZones.length ? [note('No se encontró un polígono válido para la zona crítica seleccionada. No es posible calcular acercamientos; configura o selecciona la zona antes de interpretar este apartado.')] : []),
    note(`Mínimo requerido: ${num(settings.minApproachPoints)} puntos registrados por track en el período. Se muestran ${approaches.length} combinaciones track-zona que cumplen este criterio; ${analysis.approaches.length - approaches.length} combinaciones se excluyen por no cumplirlo. Orden por distancia, incluidas las que permanecen fuera de ${settings.proximityM} m. “Puntos” es el total del resumen; “Noct. cerca” cuenta posiciones de la muestra, no visitas.`),
    heading('Reglas de prioridad para revisar registros'),
    note('Alta: proximidad nocturna y al menos una posición interior nocturna, dos episodios observados o cinco minutos de presencia enlazable. Media: proximidad nocturna o posición interior. Observación: otros acercamientos. Estas reglas ordenan la revisión y no constituyen detección automática de delito.'),
    table(['Track / radar', 'Clase', 'Zona', 'Puntos', 'Mínimo*', 'Fecha del mínimo', 'Noct. cerca', 'Prioridad'], approaches.map(a => [`${a.track.track_id} / ${a.track.tipo_radar}`, a.track.behavior_class ?? 'sin clasificar', a.zone, num(a.track.point_count), meters(a.minDistanceM), dateTime(a.closestAt, settings.timeZone), a.nightPoints, a.priority]), [60, 54, 48, 35, 47, 90, 40, '*'], true),
    ...(!approaches.length && criticalZones.length ? [note(`No hay acercamientos con posiciones analizadas de tracks que cumplan el mínimo de ${num(settings.minApproachPoints)} puntos. Puedes ajustar este valor antes de generar el informe.`)] : []),
    ...title('07 / Presencia y episodios', 'Detalle de actividad próxima a zonas críticas', 'Tiempos observados entre posiciones consecutivas próximas. No se interpolan huecos largos ni se confunden puntos repetidos con visitas independientes.', true),
    note(`Solo se suma un intervalo si ambos extremos están a ≤${settings.proximityM} m y separados por ≤${settings.maxGapSeconds} s. Un nuevo episodio comienza al volver a observar proximidad después de una posición lejana o de un hueco superior al umbral. Son episodios del mismo identificador, no retornos confirmados de una misma lancha.`),
    table(['Track / radar', 'Zona', 'Primera / última proximidad', 'Tiempo obs.', 'De noche', 'Episodios', 'Interior'], priorities.map(a => [`${a.track.track_id} / ${a.track.tipo_radar}`, a.zone, `${shortTime(a.firstNear, settings.timeZone)} / ${shortTime(a.lastNear, settings.timeZone)}`, minutes(a.observedSeconds), minutes(a.nightSeconds), a.episodes, a.insidePoints]), [68, 60, 143, 56, 49, 46, '*'], true),
    heading('Tráfico interior por zona'),
    table(['Zona', 'Tracks observados', 'Embarc. clasificadas', 'Tracks de noche', 'Posiciones interiores'], analysis.zones.map(z => [z.name, z.tracks, z.boats, z.nightTracks, z.insidePoints]), [130, '*', '*', '*', '*'], true),
    note('Las zonas se evalúan geométricamente con sus polígonos actuales. Si se superponen, un track puede contarse en más de una. El informe no reconstruye versiones históricas de polígonos.'),
    ...title('08 / Casos para revisión', 'Registros prioritarios y evidencia', 'Extracto de hasta 12 combinaciones track-zona próximas. Identificadores, fechas y coordenadas permiten contrastar los registros con cámaras y bitácora.', true),
  );
  if (!priorities.length) content.push(note(`No hay casos con posiciones próximas a las zonas críticas que cumplan el mínimo de ${num(settings.minApproachPoints)} puntos registrados en el período. Esto no acredita ausencia de actividad en tracks excluidos o fuera de la cobertura analizada.`));
  for (const [i, a] of priorities.slice(0, 12).entries()) {
    const movement = movementMap.get(a.key);
    content.push({
      unbreakable: true, stack: [
        { text: `${String(i + 1).padStart(2, '0')} | ${a.track.track_id} / ${a.track.tipo_radar} | ${a.priority}`, bold: true, fontSize: 11, margin: [0, 8, 0, 5] },
        {
          columns: [
            { width: 128, text: `Zona: ${a.zone}\nClase: ${a.track.behavior_class ?? 'sin clasificar'}\nMínimo observado: ${meters(a.minDistanceM)}`, fontSize: 8, lineHeight: 1.2 },
            { width: 180, text: `${dateTime(a.closestAt, settings.timeZone)}\n${a.closest.lat.toFixed(6)}, ${a.closest.lon.toFixed(6)}\n${minutes(a.observedSeconds)} enlazables; ${a.episodes} episodios`, fontSize: 8, lineHeight: 1.2 },
            { width: '*', text: `${a.nearPoints} posiciones próximas\n${a.nightPoints} nocturnas\n${a.insidePoints} interiores`, fontSize: 8, lineHeight: 1.2 },
          ], columnGap: 10
        },
        { text: reason(a), fontSize: 8, color: C.muted, margin: [0, 5, 0, 8] },
        ...(movement ? [note(`Recorrido: ${traveled(movement)}; trackeo: ${trackTime(movement.elapsedSeconds)}; enlazado: ${trackTime(movement.trackedSeconds)}; ${num(movement.track.point_count)} puntos. Base: ${movementSource(movement)}.`)] : []),
      ]
    } as Content);
  }
  content.push(
    ...title('09 / Caracterización del período', 'Composición y calidad de los datos', 'Información para interpretar los indicadores y diferenciar volumen de registros, objetivos seguidos y embarcaciones clasificadas.', true),
    table(['Clasificación del sistema', 'Tracks', 'Proporción'], [...classCounts].sort((a, b) => b[1] - a[1]).map(([name, count]) => [name.replace(/_/g, ' '), count, pct(count, tracks.length)]), [290, '*', '*']),
    table(['Fuente radar', 'Tracks'], [...radarCounts].map(([name, count]) => [name, count]), [350, '*']),
    table(['Indicador de cobertura', 'Resultado'], [
      ['Resúmenes del filtro base / total informado por servidor', `${opts.tracks.length} / ${opts.total}`],
      ['Tracks incluidos tras filtrar por categoría', num(tracks.length)],
      ['Listado recortado', opts.limited ? 'Sí; interpretar como período parcial' : 'No declarado'],
      ['Historiales correctos / solicitados', `${analyzed} / ${quality.tracksRequested ?? analyzed}`],
      ['Historiales fallidos', String(quality.failedTracks ?? 0)],
      ['Posiciones válidas analizadas', num(points.length)],
      ['Posiciones descartadas por fecha/coordenadas', num((quality.invalidPoints ?? 0) + analysis.rejectedPoints)],
      ['Muestra acotada', opts.pointsLimited ? 'Sí' : 'No declarada'],
      ['Muestreo uniforme del intervalo soportado por servidor', quality.uniformSampling === true ? 'Sí' : 'No confirmado; puede haber sesgo temporal'],
      ['Tracks sin clasificación reconocida', num(analysis.missingClassification)],
      ['Tracks sin fecha de inicio válida', num(analysis.missingDates)],
    ], [350, '*']),
    heading('Velocidades y continuidad del seguimiento'),
    table(['Variable', 'Valor', 'Base de cálculo'], [
      ['Velocidad media entre tracks con dato', (() => { const values = tracks.map(t => t.avg_speed).filter((v): v is number => v != null && Number.isFinite(v) && v >= 0); return values.length ? `${(values.reduce((a, b) => a + b, 0) / values.length * 3.6).toFixed(1)} km/h` : 'N/D'; })(), 'Media de medias por track; no ponderada por duración'],
      ['Mayor velocidad reportada', (() => { const values = tracks.map(t => t.max_speed).filter((v): v is number => v != null && Number.isFinite(v) && v >= 0); return values.length ? `${(Math.max(...values) * 3.6).toFixed(1)} km/h` : 'N/D'; })(), 'Máximo de los resúmenes, sujeto a ruido del sensor'],
      ['Duración mediana de los resúmenes', (() => { const values = tracks.map(t => t.duration_seconds).filter((v): v is number => v != null && Number.isFinite(v) && v >= 0).sort((a, b) => a - b); return values.length ? minutes((values[Math.floor((values.length - 1) / 2)] + values[Math.ceil((values.length - 1) / 2)]) / 2) : 'N/D'; })(), 'Intervalo entre primera y última detección, no permanencia continua'],
      ['Distancia observada acumulada', (() => { const values = movements.map(m => m.distanceM).filter((v): v is number => v != null && v > 0); return values.length ? `${num(values.reduce((a, b) => a + b, 0))} m` : 'N/D'; })(), 'Suma solo recorridos positivos calculables; cobertura parcial, sin extrapolar al total de tracks'],
    ], [165, 80, '*'], true),
    note(`Filtros: categoría ${reportCategoryLabel(settings.category)}; radar ${opts.filters.tipoRadar || 'todos'}; zona ${opts.filters.zone || 'todas'}; mínimo ${opts.filters.minPoints} puntos; búsqueda ${opts.filters.search || 'ninguna'}; solo favoritos ${opts.onlyFavorites ? 'sí' : 'no'}; solo con zonas ${opts.onlyWithZones ? 'sí' : 'no'}.`),
    ...title('10 / Criterio operativo', 'Interpretación y acciones sugeridas', 'Plan de revisión basado en los indicadores del período; sin atribuir autorización, intención o identidad física a un track.', true),
    {
      ol: [
        analysis.nearNightTracks ? `Priorizar la revisión de cámaras y bitácora para los ${analysis.nearNightTracks} tracks observados próximos de noche. Empezar por la tabla de prioridad Alta y las fechas de acercamiento mínimo.` : 'Mantener vigilancia nocturna. La muestra no aporta proximidades nocturnas a la zona crítica; verificar primero cobertura, disponibilidad del radar y calidad de polígonos.',
        boatPeak ? `Usar ${hour(boatPeak.hour)} como franja de referencia para contrastar tránsito habitual de embarcaciones clasificadas y los registros autorizados del centro.` : 'Mejorar la clasificación de los tracks antes de inferir patrones específicos de lanchas.',
        'Contrastar cada episodio próximo con horarios de servicio, cosecha, abastecimiento, turnos y rutas autorizadas. Una operación legítima puede cumplir las mismas reglas de proximidad.',
        'Para investigación de un caso concreto, consultar la trayectoria completa del track y preservar el video original. El mínimo del informe es el mínimo observado en una muestra, no una distancia mínima garantizada.',
        'Repetir el informe para períodos comparables y con los mismos umbrales. Las tasas se normalizan por horas de calendario cubiertas; no se dispone aquí de telemetría de disponibilidad del radar para corregir caídas.',
      ], fontSize: 10, lineHeight: 1.4
    },
    heading('Método y límites de interpretación'),
    note('Distancia: proyección plana local al segmento más próximo de cada polígono (metros aproximados); interior y borde se expresan como cero. Solo se evalúan posiciones registradas; no se infieren cruces entre dos puntos exteriores ni rutas durante huecos.'),
    note(`Tiempo: ${settings.timeZone}, con sus cambios de horario. Los episodios usan un máximo de ${settings.maxGapSeconds} s entre registros. Los tiempos nocturnos se suman solo si ambos extremos son nocturnos; los intervalos que cruzan un borde de noche quedan fuera de ese subtotal.`),
  );
  return { range, docDefinition: reportDocument(opts, settings, content) };
}
export function downloadTrackActivityReport(opts: TrackReportOptions): ReportRange {
  initializeReportFonts();
  const { docDefinition, range } = buildTrackActivityReport(opts);
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  pdfMake.createPdf(docDefinition).download(`informe-${opts.settings?.format === 'summary' ? 'resumido' : 'operativo'}-${stamp}.pdf`);
  return range;
}
