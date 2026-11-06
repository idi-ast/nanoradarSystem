import { behaviorLabel, isBehaviorVisible } from "@/features/devices/config/behaviorCategories";
import { useBehaviorVisibilityStore } from "@/features/devices/stores/behaviorVisibilityStore";
import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router';
import { IconChartBar, IconClock, IconHistory, IconMapPin, IconMoon, IconRadar2, IconRefresh, IconSearch, IconShip } from '@tabler/icons-react';
import { useZones } from '@/features/history/hooks/useZones';
import { extractZoneVertices } from '@/features/devices/components/map/utils/geoHelpers';
import { analysisTrackKey } from '@/features/history/types';
import { computeOperationalAnalysis, DEFAULT_REPORT_SETTINGS, isBoat, isValidAnalysisZone, normalizeZone, filterReportTracks, type Approach } from '@/features/history/reportAnalytics';
import { dateTimeInput, defaultAnalysisFilters, validateAnalysisFilters, type AnalysisFilters } from './analyticsData';
import { useActivityAnalysis } from './hooks/useActivityAnalysis';
import { ActivityCalendar, DailyActivityChart, HourlyActivityChart } from './components/AnalysisCharts';
import type { MapFocus } from './components/AnalysisHeatmap';
import { TrackExplorer } from './components/TrackExplorer';
import { AnalysisLoadingOverlay } from './components/AnalysisLoadingOverlay';

const number = (value: number) => value.toLocaleString('es-CL');
const hour = (value: number) => `${String(value).padStart(2, '0')}:00`;
const stamp = (value: string) => new Intl.DateTimeFormat('es-CL', { timeZone: 'America/Santiago', dateStyle: 'short', timeStyle: 'short', hourCycle: 'h23' }).format(new Date(value));
const fieldClass = 'mt-1 block w-full rounded-lg border border-border bg-bg-200 px-3 py-2.5 text-sm text-text-100 outline-none focus:border-sky-500';
function Panel({ title, subtitle, children, aside }: { title: string; subtitle?: string; children: ReactNode; aside?: ReactNode }) {
  return <section className="min-w-0 rounded-xl border border-border bg-bg-100 p-4 sm:p-5"><div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-base font-semibold text-text-100">{title}</h2>{subtitle && <p className="mt-1 max-w-3xl text-xs leading-relaxed text-text-200">{subtitle}</p>}</div>{aside}</div>{children}</section>;
}
function Metric({ label, value, detail, icon, color = 'text-sky-400' }: { label: string; value: string; detail: string; icon: ReactNode; color?: string }) {
  return <div className="rounded-xl border border-border bg-bg-100 p-5"><div className="flex items-center justify-between gap-3"><p className="text-xs text-text-200">{label}</p><span className={color}>{icon}</span></div><p className={`mt-3 text-3xl font-semibold tabular-nums ${color}`}>{value}</p><p className="mt-2 text-xs text-text-300">{detail}</p></div>;
}
export default function ActivityAnalysisPage() {
  const [filters, setFilters] = useState<AnalysisFilters>(() => defaultAnalysisFilters());
  const [draft, setDraft] = useState<AnalysisFilters>(filters);
  const [validationError, setValidationError] = useState('');
  const [zoneSelection, setZoneSelection] = useState('__module');
  const [scope, setScope] = useState<'all' | 'boats' | 'lancha'>('lancha');
  const [selectedTrackKey, setSelectedTrackKey] = useState<string | null>(null);
  const [maxGapSeconds, setMaxGapSeconds] = useState(DEFAULT_REPORT_SETTINGS.maxGapSeconds);
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const [mapMode, setMapMode] = useState<'map' | 'scheme'>('map');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'distance' | 'priority'>('distance');
  const [tablePage, setTablePage] = useState(0);
  const [calendarPage, setCalendarPage] = useState(0);
  const visibility = useBehaviorVisibilityStore(s => s.visibility);
  const result = useActivityAnalysis(filters);
  const zoneQuery = useZones();
  const zones = useMemo(() => (zoneQuery.data ?? []).map(z => ({ nombre: z.nombre, vertices: extractZoneVertices(z.poligono?.vertices), color: z.poligono?.color })).filter(isValidAnalysisZone), [zoneQuery.data]);
  const settings = useMemo(() => ({ ...DEFAULT_REPORT_SETTINGS, proximityM: filters.proximityM, maxGapSeconds, criticalZones: zoneSelection === '__all' ? zones.map(z => z.nombre) : zoneSelection === '__module' ? zones.filter(z => normalizeZone(z.nombre) === 'modulo').map(z => z.nombre) : zones.filter(z => z.nombre === zoneSelection).map(z => z.nombre) }), [zoneSelection, zones, filters.proximityM, maxGapSeconds]);
  const analysis = useMemo(() => {
    if (!result.data) return null;
    const available = result.data.listing.tracks.filter(t => isBehaviorVisible(t.behavior_class, visibility));
    const tracks = scope === 'boats' ? available.filter(isBoat) : scope === 'lancha' ? filterReportTracks(available, 'lancha') : available;
    const keys = new Set(tracks.map(analysisTrackKey));
    const points = keys ? result.data.spatial.points.filter(p => p.trackKey && keys.has(p.trackKey)) : result.data.spatial.points;
    return computeOperationalAnalysis({ tracks, points, zones, from: new Date(result.data.range.from), to: new Date(result.data.range.to), settings });
  }, [result.data, scope, zones, settings, visibility]);
  const visibleRows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const rows = (analysis?.approaches ?? []).filter(a => !needle || `${a.track.track_id} ${a.track.tipo_radar} ${a.track.behavior_class ?? ''} ${a.zone}`.toLowerCase().includes(needle));
    if (sort === 'priority') {
      const order = { Alta: 0, Media: 1, Observación: 2 };
      rows.sort((a, b) => order[a.priority] - order[b.priority] || a.minDistanceM - b.minDistanceM);
    }
    return rows;
  }, [analysis?.approaches, search, sort]);
  const apply = (next: AnalysisFilters) => {
    try {
      validateAnalysisFilters(next); setValidationError(''); setFilters(next); setDraft(next);
      setFocus(null); setSelectedTrackKey(null); setTablePage(0); setCalendarPage(0);
    } catch (error) { setValidationError(error instanceof Error ? error.message : 'Revisa el período seleccionado.'); }
  };
  const submit = (event: FormEvent) => { event.preventDefault(); apply(draft); };
  const preset = (hours: number) => {
    const now = new Date();
    apply({ ...draft, from: dateTimeInput(new Date(now.getTime() - hours * 3600000)), to: dateTimeInput(now) });
  };
  const locate = (a: Approach) => {
    setSelectedTrackKey(a.key);
    setMapMode('map');
    setFocus({ latitude: a.closest.lat, longitude: a.closest.lon, label: `${a.track.track_id} · ${a.zone} · ${a.minDistanceM.toFixed(1)} m · ${stamp(a.closestAt)}` });
    document.getElementById('analysis-map')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  const classifications = useMemo(() => {
    const counts = new Map<string, number>();
    for (const track of analysis?.tracks ?? []) {
      const label = behaviorLabel(track.behavior_class);
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    return [...counts].sort((a, b) => b[1] - a[1]);
  }, [analysis?.tracks]);
  const pageCount = Math.max(1, Math.ceil(visibleRows.length / 15));
  const currentPage = Math.min(tablePage, pageCount - 1);
  const calendarPages = Math.max(1, Math.ceil((analysis?.days.length ?? 0) / 31));
  const currentCalendarPage = Math.min(calendarPage, calendarPages - 1);
  const calendarAnalysis = useMemo(() => analysis ? { ...analysis, days: analysis.days.slice(currentCalendarPage * 31, (currentCalendarPage + 1) * 31) } : null, [analysis, currentCalendarPage]);
  const hasPositions = Boolean(analysis?.points.length);
  const boatPeak = analysis ? [...analysis.hourly].filter(h => h.boatStarts > 0).sort((a, b) => b.boatStarts - a.boatStarts)[0] : null;
  const hasData = Boolean(analysis?.tracks.length);
  const totalLoaded = result.data?.listing.tracks.length ?? 0;

  return <div className="min-h-full space-y-5 bg-bg-300 p-4 text-text-100 sm:p-6 lg:p-8">
    {result.isFetching && <AnalysisLoadingOverlay />}
    <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="mb-2 flex items-center gap-2 text-xs uppercase tracking-widest text-sky-400"><IconChartBar size={16} /> Observación del centro</p><h1 className="text-2xl font-semibold sm:text-3xl">Análisis de actividad</h1><p className="mt-2 text-sm text-text-200">Tráfico, patrones horarios y acercamientos a zonas críticas durante el período seleccionado.</p></div><Link to="/historial" className="flex items-center gap-2 rounded-lg border border-border bg-bg-100 px-4 py-2.5 text-sm text-text-200 hover:text-text-100"><IconHistory size={17} /> Ver historial</Link></header>

    <form onSubmit={submit} className="rounded-xl border border-border bg-bg-100 p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-sm font-semibold">Período del análisis</h2><div className="flex flex-wrap gap-2">{[[24, '24 horas'], [168, '7 días'], [720, '30 días']].map(([hours, label]) => <button key={hours} type="button" onClick={() => preset(Number(hours))} className="rounded-md border border-border px-3 py-1.5 text-xs text-text-200 hover:border-sky-500/50">{label}</button>)}</div></div>
      <div className="grid items-end gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <label className="text-xs text-text-200 xl:col-span-1">Desde (Chile)<input className={fieldClass} type="datetime-local" value={draft.from} onChange={e => setDraft({ ...draft, from: e.target.value })} required /></label>
        <label className="text-xs text-text-200 xl:col-span-1">Hasta (Chile)<input className={fieldClass} type="datetime-local" value={draft.to} onChange={e => setDraft({ ...draft, to: e.target.value })} required /></label>
        <label className="text-xs text-text-200">Radar<select className={fieldClass} value={draft.radar} onChange={e => setDraft({ ...draft, radar: e.target.value })}><option value="">Todos los radares</option><option value="magos">Magos</option><option value="nano">NanoRadar</option><option value="spotter">Spotter</option></select></label>
        <label className="text-xs text-text-200">Mínimo de puntos<input className={fieldClass} type="number" min={1} max={10000} step={1} value={draft.minPoints || ''} onChange={e => setDraft({ ...draft, minPoints: Number(e.target.value) })} required /></label>
        <label className="text-xs text-text-200">Proximidad a zona (m)<input className={fieldClass} type="number" min={1} max={5000} value={draft.proximityM || ''} onChange={e => setDraft({ ...draft, proximityM: Number(e.target.value) })} required /></label>
        <button className="flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-500" type="submit"><IconSearch size={17} /> Analizar período</button>
      </div>
      <details open className="mt-4 text-xs text-text-200"><summary className="cursor-pointer font-medium">Opciones avanzadas</summary><label className="mt-3 block max-w-sm">Hueco máximo para sumar tiempo (s)<input className={fieldClass} type="number" min={1} max={3600} step={1} value={maxGapSeconds} onChange={e => { const value = Number(e.target.value); if (Number.isInteger(value) && value >= 1 && value <= 3600) setMaxGapSeconds(value); }} /></label></details>
      <p className="mt-3 text-xs text-text-300">Fechas y gráficos en America/Santiago · noche operativa: 21:00–07:00.</p>
      {validationError && <p role="alert" className="mt-3 text-sm text-red-400">{validationError}</p>}
    </form>

    <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-3"><label className="flex items-center gap-2 text-xs text-text-200">Mostrar<select className="rounded-lg border border-border bg-bg-100 px-3 py-2 text-text-100" value={scope} onChange={e => { setScope(e.target.value as 'all' | 'boats' | 'lancha'); setSelectedTrackKey(null); setTablePage(0); setFocus(null); }}><option value="lancha">Embarcación (predeterminado)</option><option value="all">Todos los tracks</option><option value="boats">Solo embarcaciones clasificadas</option></select></label><label className="flex items-center gap-2 text-xs text-text-200">Zona crítica<select className="max-w-60 rounded-lg border border-border bg-bg-100 px-3 py-2 text-text-100" value={zoneSelection} onChange={e => { setZoneSelection(e.target.value); setTablePage(0); setFocus(null); }}><option value="__module">Módulo (predeterminado)</option><option value="__all">Todas las zonas</option>{zones.map(z => <option key={z.nombre} value={z.nombre}>{z.nombre}</option>)}</select></label></div><button type="button" disabled={result.isFetching} onClick={() => { void result.refetch(); }} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs text-text-200 disabled:opacity-50"><IconRefresh size={15} className={result.isFetching ? 'animate-spin' : ''} /> {result.isFetching ? 'Consultando datos…' : 'Actualizar'}</button></div>

    {zoneQuery.isError && <div role="alert" className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-500">No se pudieron cargar las zonas. Los gráficos generales siguen disponibles; los acercamientos requieren sus polígonos. <button type="button" onClick={() => { void zoneQuery.refetch(); }} className="ml-2 underline">Reintentar zonas</button></div>}
    {result.isError && <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-6"><h2 className="font-semibold text-red-400">No se pudo cargar el análisis</h2><p className="mt-2 text-sm text-text-200">Verifica la conexión con el servidor e intenta nuevamente. No se presentan datos incompletos como un resultado nuevo.</p><button type="button" onClick={() => { void result.refetch(); }} className="mt-4 rounded-lg border border-border px-4 py-2 text-sm">Reintentar</button></div>}
    {analysis && result.data && <>
      <div className="flex flex-wrap justify-between gap-2 text-xs text-text-200"><span><IconClock size={13} className="mr-1 inline" /> {stamp(result.data.range.from)} — {stamp(result.data.range.to)}</span><span>Datos consultados: {stamp(result.data.loadedAt)}</span></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Tracks del período" value={number(analysis.tracks.length)} detail="Identificadores de seguimiento del radar" icon={<IconRadar2 size={21} />} />
        <Metric label="Embarcaciones clasificadas" value={number(analysis.boats.length)} detail="Según la categoría registrada por el sistema" icon={<IconShip size={21} />} color="text-teal-400" />
        <Metric label="Presencia nocturna observada" value={hasPositions ? number(analysis.nightTracks) : 'N/D'} detail="Tracks de la muestra con posiciones entre 21 y 07 h" icon={<IconMoon size={21} />} color="text-amber-400" />
        <Metric label="Próximos a zona crítica de noche" value={hasPositions && settings.criticalZones.length ? number(analysis.nearNightTracks) : 'N/D'} detail={`Distancia al perímetro ≤ ${filters.proximityM} m`} icon={<IconMapPin size={21} />} color="text-rose-400" />
      </div>
      <div className="grid gap-3 rounded-xl border border-border bg-bg-100 p-5 sm:grid-cols-3"><div><p className="text-xs text-text-200">Hora pico de inicios</p><p className="mt-1 font-semibold">{analysis.peakHour ? `${hour(analysis.peakHour.hour)} · ${number(analysis.peakHour.starts)} tracks` : 'Sin inicios en el período'}</p></div><div><p className="text-xs text-text-200">Hora pico de embarcaciones</p><p className="mt-1 font-semibold">{boatPeak ? `${hour(boatPeak.hour)} · ${number(boatPeak.boatStarts)} tracks` : 'Sin embarcaciones clasificadas'}</p></div><div><p className="text-xs text-text-200">Mayor proximidad nocturna por hora</p><p className="mt-1 font-semibold">{analysis.peakNightHour ? `${hour(analysis.peakNightHour.hour)} · ${number(analysis.peakNightHour.near)} tracks` : hasPositions && settings.criticalZones.length ? 'Sin registros próximos de noche' : 'Sin datos espaciales suficientes'}</p></div></div>
      {!hasData && <div className="rounded-xl border border-border bg-bg-100 p-7 text-center"><h2 className="font-medium">No hay tracks para esta selección</h2><p className="mt-2 text-sm text-text-200">Amplía las fechas, cambia el radar o revisa el mínimo de puntos y la clasificación seleccionada.</p></div>}
      <div className="rounded-xl border border-border bg-bg-100 px-5 py-4"><div className="flex flex-wrap justify-between gap-3 text-xs text-text-200"><span>Resúmenes cargados: <strong className="text-text-100">{number(totalLoaded)} / {number(result.data.listing.total)}</strong></span><span>Historiales obtenidos: <strong className="text-text-100">{number(result.data.spatial.tracksAnalyzed)} / {number(totalLoaded)}</strong></span><span>Posiciones en la selección: <strong className="text-text-100">{number(analysis.points.length)}</strong></span></div>
        {(result.data.listing.limited || result.data.spatial.pointsLimited || !hasPositions || !settings.criticalZones.length) && <p className="mt-3 text-xs leading-relaxed text-amber-500">{result.data.listing.limited ? 'El listado está acotado respecto del total del servidor. ' : ''}{result.data.spatial.pointsLimited ? 'El análisis espacial usa una muestra; puede omitir acercamientos breves. ' : ''}{!hasPositions ? 'No hay posiciones válidas para calcular presencia, proximidad o densidad. ' : ''}{!settings.criticalZones.length ? 'No hay una zona crítica válida seleccionada para medir acercamientos.' : ''}</p>}
        {!!result.data.spatial.failedTracks && <p className="mt-2 text-xs text-amber-500">No se pudieron obtener {result.data.spatial.failedTracks} historiales; sus posiciones no se incluyen en los indicadores espaciales.</p>}
        {result.data.spatial.uniformSampling === false && <p className="mt-2 text-xs text-amber-500">No se confirmó un muestreo uniforme de las trayectorias. Los patrones espaciales pueden estar sesgados hacia el inicio de los tracks.</p>}
      </div>
      <div className="grid gap-5 xl:grid-cols-2"><Panel title="Actividad por hora" subtitle="Inicios de tracks por hora de Chile. La clasificación de embarcaciones se muestra por separado."><HourlyActivityChart analysis={analysis} /></Panel><Panel title="Evolución durante el período" subtitle="Inicios por fecha y tracks con posiciones nocturnas observadas. Las series no equivalen a embarcaciones físicas únicas."><DailyActivityChart analysis={analysis} /></Panel></div>
      <TrackExplorer key={`${result.data.range.from}:${result.data.range.to}:${filters.radar}:${scope}`} analysis={analysis} spatial={result.data.spatial} range={result.data.range} zones={zones} selectedKey={selectedTrackKey} onSelect={key => { setSelectedTrackKey(key); setFocus(null); if (key) requestAnimationFrame(() => document.getElementById('analysis-map')?.scrollIntoView({ behavior: 'smooth', block: 'start' })); }} focus={focus} mode={mapMode} onModeChange={setMapMode} />
      <Panel title="Calendario de actividad" subtitle="Minutos acumulados de trackeo observado por fecha y hora. Verde: menor tiempo; rojo: mayor tiempo. Los tracks simultáneos suman sus tiempos; una celda puede superar 60 min." aside={calendarPages > 1 ? <div className="flex items-center gap-3 text-xs"><button type="button" disabled={!currentCalendarPage} onClick={() => setCalendarPage(p => Math.max(0, p - 1))} className="rounded border border-border px-2 py-1 disabled:opacity-40">Anterior</button><span>{currentCalendarPage + 1} / {calendarPages}</span><button type="button" disabled={currentCalendarPage >= calendarPages - 1} onClick={() => setCalendarPage(p => p + 1)} className="rounded border border-border px-2 py-1 disabled:opacity-40">Siguiente</button></div> : undefined}>{calendarAnalysis && <ActivityCalendar analysis={calendarAnalysis} />}</Panel>
      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Clasificación de los tracks" subtitle="Composición de la selección actual según la categoría registrada por el sistema.">
          <div className="max-h-72 space-y-4 overflow-auto">{classifications.map(([label, count]) => <div key={label}><div className="mb-2 flex items-center justify-between gap-4 text-xs"><span className="capitalize text-text-200">{label}</span><span className="tabular-nums">{number(count)} <span className="text-text-300">({analysis.tracks.length ? (100 * count / analysis.tracks.length).toFixed(1) : 0}%)</span></span></div><div className="h-2 overflow-hidden rounded-full bg-bg-200"><div className="h-full rounded-full bg-teal-400" style={{ width: `${analysis.tracks.length ? 100 * count / analysis.tracks.length : 0}%` }} /></div></div>)}{!classifications.length && <p className="text-sm text-text-200">No hay tracks para esta selección.</p>}</div>
        </Panel>
        <Panel title="Actividad interior por zona" subtitle="Tracks distintos con posiciones dentro del polígono, sobre la muestra. Pulsa una zona para analizar sus acercamientos.">
          <div className="max-h-72 space-y-2 overflow-auto">{analysis.zones.map(z => <button key={z.name} type="button" onClick={() => { setZoneSelection(z.name); setTablePage(0); setFocus(null); }} className="w-full rounded-lg border border-border px-3 py-3 text-left hover:border-sky-500/50"><div className="flex items-center justify-between gap-4 text-sm"><span>{z.name}</span><strong className="tabular-nums">{number(z.tracks)} tracks</strong></div><div className="mt-1 flex justify-between gap-3 text-xs text-text-300"><span>{z.boats} embarcaciones clasificadas</span><span className="text-amber-500">{z.nightTracks} de noche</span></div></button>)}{!analysis.zones.length && <p className="text-sm text-text-200">No hay polígonos válidos disponibles.</p>}</div>
        </Panel>
      </div>
      <Panel title="Acercamientos a zonas críticas" subtitle={`Distancia mínima observada al perímetro. Interior y borde se muestran como 0 m. La prioridad ayuda a revisar registros; no determina intención ni autorización.`}>
        <div className="mb-4 flex flex-wrap gap-3"><label className="flex-1 text-xs text-text-200"><span className="sr-only">Buscar track, radar o zona</span><input className="w-full rounded-lg border border-border bg-bg-200 px-3 py-2 text-sm" placeholder="Buscar track, radar, clasificación o zona…" value={search} onChange={e => { setSearch(e.target.value); setTablePage(0); }} /></label><label className="flex items-center gap-2 text-xs text-text-200">Orden<select value={sort} onChange={e => { setSort(e.target.value as 'distance' | 'priority'); setTablePage(0); }} className="rounded-lg border border-border bg-bg-200 px-3 py-2 text-sm"><option value="distance">Menor distancia</option><option value="priority">Prioridad de revisión</option></select></label></div>
        <div className="overflow-x-auto"><table className="w-full min-w-200 text-left text-xs"><thead className="border-y border-border text-text-200"><tr>{['Track / radar', 'Clasificación', 'Zona', 'Distancia mín.', 'Fecha del mínimo', 'Tiempo próximo*', 'Prioridad', ''].map((label, i) => <th key={i} className="px-3 py-3 font-medium">{label}</th>)}</tr></thead><tbody>{visibleRows.slice(currentPage * 15, (currentPage + 1) * 15).map(a => <tr key={`${a.key}:${a.zone}`} className="border-b border-border/60 hover:bg-bg-200/60"><td className="px-3 py-3"><button type="button" onClick={() => locate(a)} className="font-medium text-sky-400 underline decoration-dotted underline-offset-4">{a.track.track_id}</button><span className="mt-1 block text-text-300">{a.track.tipo_radar}</span></td><td className="px-3 py-3 text-text-200">{behaviorLabel(a.track.behavior_class)}</td><td className="px-3 py-3">{a.zone}</td><td className="px-3 py-3 font-mono tabular-nums">{a.minDistanceM.toFixed(1)} m</td><td className="whitespace-nowrap px-3 py-3 text-text-200">{stamp(a.closestAt)}</td><td className="px-3 py-3 text-text-200">{(a.observedSeconds / 60).toFixed(1)} min<br /><span className="text-text-300">{a.episodes} episodios</span></td><td className="px-3 py-3"><span title={a.reasons.join('; ')} className={`rounded-full px-2 py-1 ${a.priority === 'Alta' ? 'bg-rose-500/10 text-rose-400' : a.priority === 'Media' ? 'bg-amber-500/10 text-amber-400' : 'bg-sky-500/10 text-sky-400'}`}>{a.priority}</span></td><td className="px-3 py-3"><button type="button" onClick={() => locate(a)} className="whitespace-nowrap rounded-md border border-border px-2 py-1.5 text-sky-400">Ver en mapa</button></td></tr>)}</tbody></table>{!visibleRows.length && <p className="p-6 text-center text-sm text-text-200">{!hasPositions ? 'No hay posiciones válidas para calcular acercamientos.' : !settings.criticalZones.length ? 'Selecciona una zona crítica con un polígono válido.' : 'No hay registros que coincidan con la búsqueda.'}</p>}</div>
        <div className="mt-4 flex items-center justify-between gap-3 text-xs text-text-200"><span>{number(visibleRows.length)} combinaciones track–zona</span><div className="flex items-center gap-3"><button type="button" disabled={!currentPage} onClick={() => setTablePage(p => Math.max(0, p - 1))} className="rounded border border-border px-3 py-1.5 disabled:opacity-40">Anterior</button><span>{currentPage + 1} / {pageCount}</span><button type="button" disabled={currentPage >= pageCount - 1} onClick={() => setTablePage(p => p + 1)} className="rounded border border-border px-3 py-1.5 disabled:opacity-40">Siguiente</button></div></div>
        <p className="mt-4 text-xs leading-relaxed text-text-300">*Solo se suman intervalos de hasta {settings.maxGapSeconds} s entre posiciones consecutivas a ≤{settings.proximityM} m. El tiempo observado puede ser menor que la permanencia real. Alta: proximidad nocturna más interior nocturno, repetición de episodios o al menos cinco minutos enlazables; Media: proximidad nocturna o interior; Observación: otros casos.</p>
      </Panel>
      <footer className="pb-3 text-xs leading-relaxed text-text-300">Un ID de radar puede fragmentarse o reutilizarse; no identifica por sí solo una embarcación física. Contrasta los registros próximos o nocturnos con cámaras, rutas autorizadas y bitácora del centro.</footer>
    </>}
  </div>;
}
