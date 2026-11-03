import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import type { TrackSummary, TrackSummaryFilters } from "./types";
import type { AnalysisPoint, AnalysisZone, AnalysisFetchResult } from "./analysis";
import { computeOperationalAnalysis, DEFAULT_REPORT_SETTINGS, isBoat, isValidAnalysisZone, normalizeZone, type ReportSettings, type Approach } from "./reportAnalytics";
import { hourlyChart, activityMatrix, spatialChart, weekdayChart } from "./reportCharts";

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

export function buildTrackActivityReport(opts: TrackReportOptions): { docDefinition: TDocumentDefinitions; range: ReportRange } {
  const range = resolveReportRange(opts.filters, opts.defaultHours);
  const settings = { ...DEFAULT_REPORT_SETTINGS, ...opts.settings };
  const zones = (opts.zones ?? []).filter(isValidAnalysisZone);
  const analysis = computeOperationalAnalysis({ tracks: opts.tracks, points: opts.points ?? [], zones, from: range.from, to: range.to, settings });
  const { tracks, hourly, days, approaches, points } = analysis;
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
  const content: Content[] = [
    ...title('WISENSOR / RADAR AST', 'Actividad y vigilancia\noperativa del centro', 'Informe de historial | Tráfico, actividad nocturna y proximidad a zonas críticas'),
    ...(opts.demonstration ? [{ text: 'DEMOSTRACIÓN - DATOS SINTÉTICOS. NO CORRESPONDE A UN CENTRO REAL.', color: C.red, bold: true, fontSize: 10, margin: [0, 0, 0, 12] } as Content] : []),
    { text: `${dateTime(range.from, settings.timeZone)}  a  ${dateTime(range.to, settings.timeZone)}`, bold: true, fontSize: 11 },
    note(`Zona horaria: ${settings.timeZone}. Noche operativa: ${nightLabel}. Zonas críticas: ${criticalZones.map(z => z.nombre).join(', ') || 'ninguna seleccionada/disponible'}. Umbral de proximidad: ${settings.proximityM} m al perímetro.`),
    cards([[num(tracks.length), 'Tracks del período'], [num(analysis.boats.length), 'Clasificados como embarcación'], [num(analysis.nightTracks), 'Tracks observados de noche*'], [num(analysis.nearNightTracks), 'Próximos a zona crítica de noche*']]),
    heading('Lectura ejecutiva'),
    { ul: [
      peak ? `Mayor cantidad de inicios: ${hour(peak.hour)} - ${hour((peak.hour + 1) % 24)}, con ${num(peak.starts)} tracks (${peak.startsPerHour == null ? 'sin exposición calculable' : `${peak.startsPerHour.toFixed(2)} inicios/hora de calendario cubierta`}).` : 'No hay horas de inicio válidas dentro del período.',
      boatPeak ? `Mayor inicio de tracks clasificados como embarcación: ${hour(boatPeak.hour)}, ${num(boatPeak.boatStarts)} tracks.` : 'No se dispone de tracks clasificados como embarcación para identificar su hora pico.',
      analysis.peakNightHour ? `Franja nocturna con más proximidad observada: ${hour(analysis.peakNightHour.hour)}, ${analysis.peakNightHour.near} tracks distintos cerca de zonas críticas.` : 'No se observaron puntos nocturnos próximos a las zonas críticas en los historiales analizados.',
      closestBoat ? `Embarcación clasificada con menor distancia observada: ${closestBoat.track.track_id} (${closestBoat.track.tipo_radar}), ${meters(closestBoat.minDistanceM)} respecto de ${closestBoat.zone}, ${dateTime(closestBoat.closestAt, settings.timeZone)}.` : 'No hay posiciones de embarcaciones clasificadas que permitan calcular una distancia a la zona crítica.',
      `${priorities.filter(a => a.priority === 'Alta').length} combinaciones track-zona de prioridad Alta para revisión. Es una regla operativa explicable, no una conclusión de robo.`,
    ], fontSize: 9, lineHeight: 1.35, margin: [0, 0, 0, 8] },
    heading('Cobertura y alcance'),
    note(`${coverageLabel}. ${num(points.length)} posiciones válidas analizadas. ${complete ? 'Sin recorte declarado.' : 'Análisis espacial parcial o muestreado: los mínimos observados pueden ser mayores que los acercamientos reales y los tiempos no representan permanencia total.'} *Indicadores basados en posiciones analizadas, no en toda la flota.`),
    note('Un track es un identificador de seguimiento del radar en el período devuelto por el sistema. Puede reiniciarse, fragmentarse o reutilizarse; no equivale a una lancha física identificada, matrícula o propietario. Actividad nocturna y proximidad requieren corroboración con cámaras, autorizaciones y bitácora.'),
    heading('Prioridades inmediatas de revisión'),
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
    ...title('05 / Acercamientos', 'Qué tracks se acercaron más a “modulo”', `Orden por menor distancia observada a los polígonos críticos. Cero significa posición dentro del polígono o en su borde. Un mínimo muestreado no prueba que el track nunca se acercó más.`, true),
    ...(!criticalZones.length ? [note('No se encontró un polígono válido para la zona crítica seleccionada. No es posible calcular acercamientos; configura o selecciona la zona antes de interpretar este apartado.')] : []),
    note(`Se muestran las ${approaches.length} combinaciones track-zona analizadas, ordenadas por distancia, incluidas las que permanecen fuera del umbral de ${settings.proximityM} m. “Noct. cerca” cuenta posiciones de la muestra, no visitas.`),
    heading('Reglas de prioridad para revisar registros'),
    note('Alta: proximidad nocturna y al menos una posición interior nocturna, dos episodios observados o cinco minutos de presencia enlazable. Media: proximidad nocturna o posición interior. Observación: otros acercamientos. Estas reglas ordenan la revisión y no constituyen detección automática de delito.'),
    table(['Track / radar', 'Clase', 'Zona', 'Mínimo*', 'Fecha del mínimo', 'Noct. cerca', 'Prioridad'], approaches.map(a => [`${a.track.track_id} / ${a.track.tipo_radar}`, a.track.behavior_class ?? 'sin clasificar', a.zone, meters(a.minDistanceM), dateTime(a.closestAt, settings.timeZone), a.nightPoints, a.priority]), [66, 62, 55, 47, 100, 48, '*'], true),
    ...title('06 / Presencia y episodios', 'Detalle de actividad próxima a zonas críticas', 'Tiempos observados entre posiciones consecutivas próximas. No se interpolan huecos largos ni se confunden puntos repetidos con visitas independientes.', true),
    note(`Solo se suma un intervalo si ambos extremos están a ≤${settings.proximityM} m y separados por ≤${settings.maxGapSeconds} s. Un nuevo episodio comienza al volver a observar proximidad después de una posición lejana o de un hueco superior al umbral. Son episodios del mismo identificador, no retornos confirmados de una misma lancha.`),
    table(['Track / radar', 'Zona', 'Primera / última proximidad', 'Tiempo obs.', 'De noche', 'Episodios', 'Interior'], priorities.map(a => [`${a.track.track_id} / ${a.track.tipo_radar}`, a.zone, `${shortTime(a.firstNear, settings.timeZone)} / ${shortTime(a.lastNear, settings.timeZone)}`, minutes(a.observedSeconds), minutes(a.nightSeconds), a.episodes, a.insidePoints]), [68, 60, 143, 56, 49, 46, '*'], true),
    heading('Tráfico interior por zona'),
    table(['Zona', 'Tracks observados', 'Embarc. clasificadas', 'Tracks de noche', 'Posiciones interiores'], analysis.zones.map(z => [z.name, z.tracks, z.boats, z.nightTracks, z.insidePoints]), [130, '*', '*', '*', '*'], true),
    note('Las zonas se evalúan geométricamente con sus polígonos actuales. Si se superponen, un track puede contarse en más de una. El informe no reconstruye versiones históricas de polígonos.'),
    ...title('07 / Casos para revisión', 'Registros prioritarios y evidencia', 'Extracto de hasta 12 combinaciones track-zona próximas. Identificadores, fechas y coordenadas permiten contrastar los registros con cámaras y bitácora.', true),
  );
  if (!priorities.length) content.push(note('No se observaron posiciones próximas a las zonas críticas en la muestra. Esto no acredita ausencia de actividad fuera de la cobertura analizada.'));
  for (const [i, a] of priorities.slice(0, 12).entries()) {
    content.push({ unbreakable: true, stack: [
      { text: `${String(i + 1).padStart(2, '0')} | ${a.track.track_id} / ${a.track.tipo_radar} | ${a.priority}`, bold: true, fontSize: 11, margin: [0, 8, 0, 5] },
      { columns: [
        { width: 128, text: `Zona: ${a.zone}\nClase: ${a.track.behavior_class ?? 'sin clasificar'}\nMínimo observado: ${meters(a.minDistanceM)}`, fontSize: 8, lineHeight: 1.2 },
        { width: 180, text: `${dateTime(a.closestAt, settings.timeZone)}\n${a.closest.lat.toFixed(6)}, ${a.closest.lon.toFixed(6)}\n${minutes(a.observedSeconds)} enlazables; ${a.episodes} episodios`, fontSize: 8, lineHeight: 1.2 },
        { width: '*', text: `${a.nearPoints} posiciones próximas\n${a.nightPoints} nocturnas\n${a.insidePoints} interiores`, fontSize: 8, lineHeight: 1.2 },
      ], columnGap: 10 },
      { text: reason(a), fontSize: 8, color: C.muted, margin: [0, 5, 0, 8] },
    ] } as Content);
  }
  content.push(
    ...title('08 / Caracterización del período', 'Composición y calidad de los datos', 'Información para interpretar los indicadores y diferenciar volumen de registros, objetivos seguidos y embarcaciones clasificadas.', true),
    table(['Clasificación del sistema', 'Tracks', 'Proporción'], [...classCounts].sort((a, b) => b[1] - a[1]).map(([name, count]) => [name.replace(/_/g, ' '), count, pct(count, tracks.length)]), [290, '*', '*']),
    table(['Fuente radar', 'Tracks'], [...radarCounts].map(([name, count]) => [name, count]), [350, '*']),
    table(['Indicador de cobertura', 'Resultado'], [
      ['Resúmenes incluidos / total informado por servidor', `${tracks.length} / ${opts.total}`],
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
      ['Distancia acumulada disponible', (() => { const values = tracks.map(t => t.distance_m).filter((v): v is number => v != null && Number.isFinite(v) && v >= 0); return values.length ? meters(values.reduce((a, b) => a + b, 0)) : 'N/D'; })(), 'Solo métricas suministradas por el servidor; no se reconstruye a través de huecos'],
    ], [165, 80, '*'], true),
    note(`Filtros: radar ${opts.filters.tipoRadar || 'todos'}; zona ${opts.filters.zone || 'todas'}; mínimo ${opts.filters.minPoints} puntos; búsqueda ${opts.filters.search || 'ninguna'}; solo favoritos ${opts.onlyFavorites ? 'sí' : 'no'}; solo con zonas ${opts.onlyWithZones ? 'sí' : 'no'}.`),
    ...title('09 / Criterio operativo', 'Interpretación y acciones sugeridas', 'Plan de revisión basado en los indicadores del período; sin atribuir autorización, intención o identidad física a un track.', true),
    { ol: [
      analysis.nearNightTracks ? `Priorizar la revisión de cámaras y bitácora para los ${analysis.nearNightTracks} tracks observados próximos de noche. Empezar por la tabla de prioridad Alta y las fechas de acercamiento mínimo.` : 'Mantener vigilancia nocturna. La muestra no aporta proximidades nocturnas a la zona crítica; verificar primero cobertura, disponibilidad del radar y calidad de polígonos.',
      boatPeak ? `Usar ${hour(boatPeak.hour)} como franja de referencia para contrastar tránsito habitual de embarcaciones clasificadas y los registros autorizados del centro.` : 'Mejorar la clasificación de los tracks antes de inferir patrones específicos de lanchas.',
      'Contrastar cada episodio próximo con horarios de servicio, cosecha, abastecimiento, turnos y rutas autorizadas. Una operación legítima puede cumplir las mismas reglas de proximidad.',
      'Para investigación de un caso concreto, consultar la trayectoria completa del track y preservar el video original. El mínimo del informe es el mínimo observado en una muestra, no una distancia mínima garantizada.',
      'Repetir el informe para períodos comparables y con los mismos umbrales. Las tasas se normalizan por horas de calendario cubiertas; no se dispone aquí de telemetría de disponibilidad del radar para corregir caídas.',
    ], fontSize: 10, lineHeight: 1.4 },
    heading('Método y límites de interpretación'),
    note('Fuentes: endpoint de resúmenes del historial, endpoint de posiciones por track y polígonos configurados. Los inicios se cuentan por la primera detección del resumen dentro del filtro; la presencia horaria y la proximidad usan posiciones con identificador de track. Las categorías son las entregadas por el sistema y no verificadas visualmente.'),
    note('Los historiales se seleccionan de forma repartida por el período cuando se alcanza el presupuesto. En el servidor actualizado se muestrean uniformemente los índices de la trayectoria, conservando primer y último registro; no es un muestreo estadístico de flota ni permite intervalos de confianza. La densidad espacial sigue siendo sensible a la frecuencia de registro.'),
    note('Distancia: proyección plana local al segmento más próximo de cada polígono (metros aproximados); interior y borde se expresan como cero. Solo se evalúan posiciones registradas; no se infieren cruces entre dos puntos exteriores ni rutas durante huecos.'),
    note(`Tiempo: ${settings.timeZone}, con sus cambios de horario. Los episodios usan un máximo de ${settings.maxGapSeconds} s entre registros. Los tiempos nocturnos se suman solo si ambos extremos son nocturnos; los intervalos que cruzan un borde de noche quedan fuera de ese subtotal.`),
    note('Marco de interpretación: Cope et al., “Coastal radar as a tool for continuous and fine-scale monitoring of vessel activities...” (2022), distingue métricas de tracks y esfuerzo de observación. https://repository.library.noaa.gov/view/noaa/50713/noaa_50713_DS1.pdf'),
    note('Identificación: US Coast Guard, “AIS Frequently Asked Questions”. La identidad de una embarcación requiere datos de identificación adicionales; este informe no incorpora AIS/MMSI. https://www.navcen.uscg.gov/ais-frequently-asked-questions'),
  );
  return { range, docDefinition: {
    pageSize: 'A4', pageMargins: [40, 48, 40, 44],
    info: { title: 'Informe operativo de actividad y proximidad a módulos', author: 'WISENSOR / AST', subject: 'Tráfico observado, vigilancia nocturna y zonas críticas' },
    defaultStyle: { font: 'Roboto', fontSize: 9, color: C.ink },
    header: page => ({ text: opts.demonstration ? 'DEMOSTRACIÓN / DATOS SINTÉTICOS' : 'WISENSOR / AST     |     INFORME OPERATIVO DE HISTORIAL', color: C.muted, fontSize: 7, margin: [40, 22, 40, 0], ...(page === 1 ? { color: C.teal } : {}) }),
    footer: (page, totalPages) => ({ columns: [{ text: `${settings.timeZone} | Generado ${dateTime(new Date(), settings.timeZone)}`, fontSize: 7, color: C.muted }, { text: `${page} / ${totalPages}`, alignment: 'right', fontSize: 8, color: C.muted }], margin: [40, 15, 40, 0] }),
    content,
  } };
}
export function downloadTrackActivityReport(opts: TrackReportOptions): ReportRange {
  initializeReportFonts();
  const { docDefinition, range } = buildTrackActivityReport(opts);
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  pdfMake.createPdf(docDefinition).download(`informe-operativo-${stamp}.pdf`);
  return range;
}
