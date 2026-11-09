import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchAnalysisPoints, type AnalysisZone, type AnalysisFetchResult } from '@/features/history/analysis';
import { analysisTrackKey } from '@/features/history/types';
import { computeTrackMovements, type MovementSort, type TrackMovement } from '@/features/history/reportMovement';
import { computeOperationalAnalysis, localParts, reportCategoryLabel, type OperationalAnalysis } from '@/features/history/reportAnalytics';
import { AnalysisHeatmap, type MapFocus } from './AnalysisHeatmap';

const number = (n: number) => n.toLocaleString('es-CL', { maximumFractionDigits: 1 });
const duration = (n: number | null) => n == null ? 'N/D' : `${number(n / 60)} min`;
const distance = (m: TrackMovement) => m.distanceM == null ? 'N/D' : `${number(m.distanceM)} m${m.source === 'sample' ? ' ~' : ''}`;
const basis = (m: TrackMovement) => m.source === 'full' ? 'Historial completo' : m.source === 'sample' ? 'Muestra (~)' : 'Sin trayectoria';
const stamp = (value?: string | null) => value && Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat('es-CL', { timeZone: 'America/Santiago', dateStyle: 'short', timeStyle: 'medium', hourCycle: 'h23' }).format(new Date(value)) : 'N/D';
const speed = (n?: number | null) => n != null && Number.isFinite(n) ? `${number(n * 3.6)} km/h` : 'N/D';
interface Props {
  analysis: OperationalAnalysis;
  zones: AnalysisZone[];
  spatial: AnalysisFetchResult;
  range: { from: string; to: string };
  selectedKey: string | null;
  onSelect: (key: string | null) => void;
  focus: MapFocus | null;
  mode: 'map' | 'scheme';
  onModeChange: (mode: 'map' | 'scheme') => void;
}
export function TrackExplorer({ analysis, zones, spatial, range, selectedKey, onSelect, focus, mode, onModeChange }: Props) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<MovementSort>('distance');
  const [page, setPage] = useState(0);
  const selectedTrack = analysis.tracks.find(t => analysisTrackKey(t) === selectedKey);
  const { settings } = analysis;
  const detail = useQuery({
    queryKey: ['analysis-track-detail', selectedKey, range.from, range.to, settings.maxGapSeconds],
    enabled: Boolean(selectedTrack),
    queryFn: async ({ signal }) => {
      if (!selectedTrack) throw new Error('Selecciona un track.');
      const result = await fetchAnalysisPoints([selectedTrack], { from: range.from, to: range.to, includeMovement: true, maxGapSeconds: settings.maxGapSeconds, targetPoints: 10000, maxPointsPerTrack: 10000, signal });
      if (result.failedTracks) throw new Error('No se pudo cargar la trayectoria del track.');
      return result;
    },
    staleTime: 60000, gcTime: 0, retry: false, refetchOnWindowFocus: false,
  });
  const points = useMemo(() => selectedTrack ? detail.data?.points ?? analysis.points.filter(p => p.trackKey === selectedKey) : analysis.points, [selectedTrack, selectedKey, detail.data, analysis.points]);
  const selectedMovement = useMemo(() => selectedTrack ? computeTrackMovements([selectedTrack], points, new Date(range.from), new Date(range.to), settings.maxGapSeconds, detail.data?.movements ?? spatial.movements)[0] : null, [selectedTrack, points, range.from, range.to, settings.maxGapSeconds, detail.data, spatial.movements]);
  const movements = useMemo(() => computeTrackMovements(analysis.tracks, analysis.points, new Date(range.from), new Date(range.to), settings.maxGapSeconds, spatial.movements).map(m => m.key === selectedMovement?.key ? selectedMovement : m), [analysis.tracks, analysis.points, range.from, range.to, settings.maxGapSeconds, spatial.movements, selectedMovement]);
  const maxTime = movements.reduce((max, m) => Math.max(max, m.trackedSeconds ?? 0), 0);
  const rows = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase('es');
    const value = (m: TrackMovement) => sort === 'distance' ? m.distanceM : sort === 'duration' ? m.elapsedSeconds : m.track.point_count;
    const startHours = new Map(movements.map(m => [m.key,
      localParts(Math.max(Date.parse(range.from), Date.parse(m.track.first_seen ?? '')), settings.timeZone)?.hour ?? 24]));
    return movements.filter(m => !needle || `${m.track.track_id} ${m.track.tipo_radar} ${m.track.behavior_class ?? ''}`.toLocaleLowerCase('es').includes(needle)).sort((a, b) => {
      const ah = startHours.get(a.key)!;
      const bh = startHours.get(b.key)!;
      return ah - bh || (value(b) ?? -1) - (value(a) ?? -1) || a.key.localeCompare(b.key);
    });
  }, [movements, search, sort, range.from, settings.timeZone]);
  const pages = Math.max(1, Math.ceil(rows.length / 15));
  const current = Math.min(page, pages - 1);
  const selectedAnalysis = useMemo(() => selectedTrack ? computeOperationalAnalysis({ tracks: [selectedTrack], points, zones, from: new Date(range.from), to: new Date(range.to), settings }) : null, [selectedTrack, points, zones, range.from, range.to, settings]);
  return <section className="space-y-5 rounded-xl border border-border bg-bg-100 p-4 sm:p-5">
    <div><h2 className="text-lg font-semibold">Distancia recorrida y tiempo de trackeo</h2><p className="mt-1 text-xs leading-relaxed text-text-200">Tracks agrupados por hora de inicio en Chile. Selecciona un track en la tabla o pulsa su trazado para explorar el recorrido. Rojo: mayor tiempo enlazado acumulado, incluidos empates.</p></div>
    <div className="flex flex-wrap gap-3"><label className="min-w-48 flex-1 text-xs text-text-200">Buscar track o radar<input type="search" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} placeholder="ID, radar o clasificación…" className="mt-1 w-full rounded-lg border border-border bg-bg-200 px-3 py-2 text-sm" /></label><label className="text-xs text-text-200">Orden dentro de cada hora<select value={sort} onChange={e => { setSort(e.target.value as MovementSort); setPage(0); }} className="mt-1 block rounded-lg border border-border bg-bg-200 px-3 py-2 text-sm"><option value="distance">Mayor distancia recorrida</option><option value="duration">Mayor tiempo de seguimiento</option><option value="points">Más puntos registrados</option></select></label></div>
    <div className="overflow-x-auto"><table className="w-full min-w-200 text-left text-xs"><thead className="border-y border-border text-text-200"><tr>{['Horario', 'Track / radar', 'Recorrido', 'Trackeo', 'Tiempo enlazado', 'Puntos', 'Base'].map(label => <th key={label} className="px-3 py-3 font-medium">{label}</th>)}</tr></thead><tbody>{rows.slice(current * 15, (current + 1) * 15).map(m => {
      const parts = localParts(Math.max(Date.parse(range.from), Date.parse(m.track.first_seen ?? '')), settings.timeZone);
      const highlighted = maxTime > 0 && m.trackedSeconds === maxTime;
      return <tr key={m.key} className={`border-b border-border/60 ${m.key === selectedKey ? 'bg-sky-500/10' : 'hover:bg-bg-200/60'} ${highlighted ? 'font-semibold text-red-400' : ''}`}><td className="px-3 py-3 tabular-nums">{parts ? `${String(parts.hour).padStart(2, '0')}:00` : 'N/D'}</td><td className="px-3 py-3"><button type="button" aria-pressed={m.key === selectedKey} aria-controls="analysis-track-detail" onClick={() => onSelect(m.key)} className="text-left underline decoration-dotted underline-offset-4 focus-visible:outline-2 focus-visible:outline-sky-400">{m.track.track_id}<span className="mt-1 block text-[10px]">{m.track.tipo_radar} · {stamp(m.track.first_seen)}</span></button></td><td className="whitespace-nowrap px-3 py-3 tabular-nums">{distance(m)}</td><td className="whitespace-nowrap px-3 py-3">{duration(m.elapsedSeconds)}</td><td className="whitespace-nowrap px-3 py-3">{duration(m.trackedSeconds)}</td><td className="px-3 py-3">{number(m.track.point_count)}</td><td className="px-3 py-3">{basis(m)}</td></tr>;
    })}</tbody></table>{!rows.length && <p className="p-6 text-center text-sm text-text-200">No hay tracks que coincidan con esta selección.</p>}</div>
    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-text-200"><span>{number(rows.length)} tracks · N/D: sin trayectoria calculable</span><div className="flex items-center gap-3"><button type="button" disabled={!current} onClick={() => setPage(p => Math.max(0, p - 1))} className="rounded border border-border px-3 py-1.5 disabled:opacity-40">Anterior</button><span>{current + 1} / {pages}</span><button type="button" disabled={current >= pages - 1} onClick={() => setPage(p => p + 1)} className="rounded border border-border px-3 py-1.5 disabled:opacity-40">Siguiente</button></div></div>
    <div className={selectedTrack ? 'grid items-start gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]' : 'space-y-5'}>
    <div id="analysis-map" className="min-w-0 scroll-mt-5"><div className="mb-3 flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">Recorridos de tracks</h3>{selectedTrack && <button type="button" onClick={() => onSelect(null)} className="rounded-lg border border-border px-3 py-2 text-xs">Ver todos los recorridos</button>}</div><AnalysisHeatmap points={points} zones={zones} settings={settings} focus={focus} mode={mode} onModeChange={onModeChange} selectedTrackKey={selectedTrack ? selectedKey : null} onSelectTrack={onSelect} /></div>
    <div id="analysis-track-detail" className="min-w-0" aria-live="polite" aria-busy={detail.isFetching}>
      {!selectedTrack || !selectedMovement ? <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-text-200">Selecciona un track para ver su recorrido y más información.</div> : <div className="space-y-4 rounded-xl border border-sky-500/30 bg-sky-500/5 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-widest text-sky-400">Detalle del track</p><h3 className="mt-1 text-xl font-semibold">{selectedTrack.track_id} <span className="text-sm font-normal text-text-200">/ {selectedTrack.tipo_radar}</span></h3><p className="mt-1 text-xs text-text-200">{reportCategoryLabel(selectedTrack.behavior_class ?? 'sin_clasificar')}</p></div><button type="button" onClick={() => onSelect(null)} aria-label="Cerrar detalle del track" className="rounded border border-border px-3 py-1.5 text-xs">Cerrar</button></div>
        {detail.isFetching && <p role="status" className="text-xs text-sky-400">Cargando más posiciones y métricas del track…</p>}
        {detail.isError && <p role="alert" className="text-xs text-amber-400">No se pudo ampliar la trayectoria; se muestra la muestra general disponible. <button type="button" onClick={() => { void detail.refetch(); }} className="underline">Reintentar</button></p>}
        <dl className="grid gap-4 sm:grid-cols-2">{[
          ['Recorrido', distance(selectedMovement)], ['Trackeo', duration(selectedMovement.elapsedSeconds)], ['Tiempo enlazado acumulado', duration(selectedMovement.trackedSeconds)], ['Base de las métricas', basis(selectedMovement)],
          ['Primera detección', stamp(selectedTrack.first_seen)], ['Última detección', stamp(selectedTrack.last_seen)], ['Velocidad media', speed(selectedTrack.avg_speed)], ['Velocidad máxima', speed(selectedTrack.max_speed)],
          ['Puntos registrados', number(selectedTrack.point_count)], ['Posiciones visualizadas', number(points.length)], ['Interrupciones observadas', number(selectedMovement.gapCount)], ['Zonas registradas', selectedTrack.zones.join(', ') || 'Sin zona registrada'],
        ].map(([label, value]) => <div key={label}><dt className="text-xs text-text-200">{label}</dt><dd className="mt-1 break-words text-sm font-medium">{value}</dd></div>)}</dl>
        <p className="text-xs leading-relaxed text-text-200">Trackeo incluye interrupciones; tiempo enlazado suma intervalos de hasta {settings.maxGapSeconds} s. {detail.data?.pointsLimited ? 'El mapa usa una muestra ampliada de posiciones. ' : ''}{selectedMovement.source === 'sample' ? 'Recorrido aproximado sobre posiciones disponibles (~). ' : ''}No se unen huecos largos.</p>
        {!points.length && !detail.isFetching && <p className="text-sm text-amber-400">No hay posiciones válidas para dibujar este track en el período.</p>}
        <div><h4 className="mb-2 text-sm font-semibold">Proximidad a zonas críticas</h4><div className="flex flex-wrap gap-3">{selectedAnalysis?.approaches.map(a => <div key={a.zone} className="rounded-lg border border-border bg-bg-100 px-3 py-2 text-xs"><strong>{a.zone}</strong><p className="mt-1">Mínimo observado: {number(a.minDistanceM)} m</p><p>{duration(a.observedSeconds)} próximos · {a.episodes} episodios</p><p className="mt-1 text-amber-400">De noche: {duration(a.nightSeconds)}</p></div>)}</div>{!selectedAnalysis?.approaches.length && <p className="text-xs text-text-200">Sin posiciones o polígonos críticos disponibles para medir proximidad.</p>}</div>
        {!!points.length && <details><summary className="cursor-pointer text-sm text-sky-400">Últimas {Math.min(points.length, 12)} posiciones observadas</summary><div className="mt-3 overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr>{['Fecha (Chile)', 'Latitud', 'Longitud', 'Velocidad'].map(label => <th key={label} className="px-2 py-2 font-medium text-text-200">{label}</th>)}</tr></thead><tbody>{points.slice(-12).map((p, i) => <tr key={i} className="border-t border-border"><td className="whitespace-nowrap px-2 py-2">{stamp(p.fecha)}</td><td className="px-2 py-2 font-mono">{p.lat.toFixed(6)}</td><td className="px-2 py-2 font-mono">{p.lon.toFixed(6)}</td><td className="whitespace-nowrap px-2 py-2">{speed(p.speed)}</td></tr>)}</tbody></table></div></details>}
      </div>}
    </div>
    </div>
  </section>;
}
