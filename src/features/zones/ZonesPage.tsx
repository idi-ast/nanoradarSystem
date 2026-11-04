import { useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IconMapPin, IconPlus, IconRefresh } from '@tabler/icons-react';
import { useZones } from '@/features/history/hooks/useZones';
import { createRadarZone, fetchTiposAlertas } from '@/features/devices/services/radarService';
import type { CreateZonePayload, RadarZone } from '@/features/devices/types';
import { closeZoneRing, draftCoordinates, isCoordinate, readZoneCoordinates, buildZoneExport, zonesExportJson, ZONE_EXPORT_PROFILES, type ZoneExportProfile, type Coordinate, type DraftVertex } from './zoneGeometry';
import { ZonesMap, type MapVertex } from './components/ZonesMap';
import { ZoneJsonField } from './components/ZoneJsonField';

const input = 'mt-1 block min-w-0 w-full max-w-full rounded-lg border border-border bg-bg-200 px-3 py-2 text-sm text-text-100 outline-none focus:border-sky-500';
export default function ZonesPage() {
  const query = useZones();
  const queryClient = useQueryClient();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [exportKeys, setExportKeys] = useState<string[] | null>(null);
  const [exportProfiles, setExportProfiles] = useState<Record<string, ZoneExportProfile>>({});
  const [selectedVertex, setSelectedVertex] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [drawing, setDrawing] = useState(false);
  const [draft, setDraft] = useState<DraftVertex[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#38bdf8');
  const [alertId, setAlertId] = useState('');
  const [newLatitude, setNewLatitude] = useState('');
  const [newLongitude, setNewLongitude] = useState('');
  const [formError, setFormError] = useState('');
  const [savedMessage, setSavedMessage] = useState('');
  const alerts = useQuery({queryKey:['zone-creation-alert-types'],queryFn:fetchTiposAlertas,enabled:drawing,staleTime:300000,retry:false});
  const effectiveAlert = alertId || String(alerts.data?.[0]?.id ?? '');
  const items = useMemo(() => (query.data ?? []).map((zone, index) => {
    const key = zone.id == null ? `missing:${index}` : `id:${zone.id}`;
    let vertices: Coordinate[] = [], error = '';
    try { vertices = closeZoneRing(readZoneCoordinates(zone.poligono?.vertices)); buildZoneExport(zone); } catch (e) { error = e instanceof Error ? e.message : 'No se puede exportar esta zona.'; }
    return {key,zone,vertices,error};
  }), [query.data]);
  const selected = items.find(i => i.key === selectedKey) ?? items[0];
  const visibleItems = items.filter(i => `${i.zone.nombre} ${i.zone.id ?? ''} MG-${i.zone.id ?? ''}`.toLocaleLowerCase('es').includes(search.trim().toLocaleLowerCase('es')));
  const checkedKeys = useMemo(() => exportKeys ?? (selected && !selected.error ? [selected.key] : []), [exportKeys,selected]);
  const exportItems = useMemo(() => items.filter(item => checkedKeys.includes(item.key)), [items,checkedKeys]);
  const exportError = exportItems.find(item => item.error);
  const missingExportItems = checkedKeys.length !== exportItems.length;
  const exportJson = useMemo(() => {
    if (!exportItems.length || exportError || missingExportItems) return '';
    return zonesExportJson(exportItems.map(item => item.zone), exportProfiles);
  }, [exportItems, exportError, missingExportItems, exportProfiles]);
  const toggleExport = (key: string) => setExportKeys(previous => {
    const keys = previous ?? (selected && !selected.error ? [selected.key] : []);
    return keys.includes(key) ? keys.filter(k => k !== key) : [...keys,key];
  });
  const highlightedIds = useMemo(() => exportItems.flatMap(item => item.zone.id == null ? [] : [item.zone.id]), [exportItems]);
  const mapDraft: MapVertex[] = useMemo(() => draft.flatMap((p,index) => {
    const lat = Number(p.latitude), lon = Number(p.longitude);
    return p.latitude.trim() && p.longitude.trim() && isCoordinate(lat,lon) ? [{index,latitude:lat,longitude:lon}] : [];
  }), [draft]);
  const creation = useMutation({
    mutationFn: (payload: CreateZonePayload) => createRadarZone(payload),
    onSuccess: async saved => {
      if (!Number.isSafeInteger(saved.id) || saved.id! < 1) throw new Error('El servidor no devolvió el ID de la zona guardada. Actualiza el listado antes de volver a crearla.');
      queryClient.setQueryData<RadarZone[]>(['history-zones'], previous => [...(previous ?? []).filter(z => z.id !== saved.id), saved]);
      setSelectedKey(`id:${saved.id}`); setExportKeys(previous => previous == null ? null : [...new Set([...previous,`id:${saved.id}`])]); setSelectedVertex(null); setDrawing(false); setDraft([]); setName(''); setDescription(''); setSearch('');
      setSavedMessage(`Zona ${saved.nombre} guardada con ID MG-${saved.id}. Ya puedes copiar su JSON.`);
      await queryClient.invalidateQueries({queryKey:['history-zones']});
    },
  });
  const selectZone = (key: string) => { if (creation.isPending) return; setSelectedKey(key); setSelectedVertex(null); setDrawing(false); };
  const addPoint = (lat: number, lon: number) => {
    if (!isCoordinate(lat,lon) || creation.isPending) return;
    setDraft(previous => [...previous,{latitude:String(lat),longitude:String(lon)}]); setSelectedVertex(draft.length); setFormError('');
  };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (creation.isPending) return;
    setFormError('');
    try {
      if (!name.trim()) throw new Error('Escribe el nombre de la zona.');
      const coordinates = draftCoordinates(draft);
      closeZoneRing(coordinates);
      const type = alerts.data?.find(a => String(a.id) === effectiveAlert);
      if (!type) throw new Error('Selecciona un tipo de alerta disponible.');
      await creation.mutateAsync({nombre:name.trim(),descripcion:description.trim(),idTipoAlerta:type.id,destello:false,activarPtz:false,sonido:null,poligono:{color,vertices:coordinates}});
    } catch (e) { setFormError(e instanceof Error ? e.message : 'No se pudo guardar la zona.'); }
  };
  return <div className="min-h-full min-w-0 w-full max-w-full space-y-5 [overflow-wrap:anywhere] bg-bg-300 p-4 text-text-100 sm:p-6 lg:p-8">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="mb-2 flex items-center gap-2 text-xs uppercase tracking-widest text-sky-400"><IconMapPin size={16} /> Zonas del centro</p><h1 className="text-2xl font-semibold sm:text-3xl">Zonas</h1><p className="mt-2 text-sm text-text-200">Consulta los polígonos guardados, revisa sus coordenadas y marca una o más zonas para copiarlas juntas en el formato final.</p></div><div className="flex flex-wrap gap-2"><button type="button" disabled={query.isFetching || creation.isPending} onClick={() => {void query.refetch();}} className="flex items-center gap-2 rounded-lg border border-border bg-bg-100 px-3 py-2 text-sm disabled:opacity-40"><IconRefresh size={16} />Actualizar</button><button type="button" disabled={drawing || creation.isPending} onClick={() => {setDrawing(true);setDraft([]);setSelectedVertex(null);setName('');setDescription('');setFormError('');setSavedMessage('');}} className="flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"><IconPlus size={16} />Crear zona</button></div></header>
    {savedMessage && <p role="status" className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-500">{savedMessage}</p>}
    {query.isPending && <p role="status" className="p-4 text-sm text-text-200">Cargando zonas…</p>}
    {query.isError && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">No se pudieron cargar las zonas. <button type="button" onClick={() => {void query.refetch();}} className="underline">Reintentar</button></p>}
    <div className="grid min-w-0 w-full max-w-full items-start gap-5 lg:grid-cols-[minmax(240px,1fr)_minmax(0,3fr)]">
      <aside className="min-w-0 rounded-xl border border-border bg-bg-100 p-4"><div className="mb-3 flex items-center justify-between gap-2"><h2 className="font-semibold">Zonas creadas</h2><span className="rounded-full bg-bg-200 px-2 py-1 text-xs">{items.length}</span></div><label className="min-w-0 text-xs text-text-200">Buscar por nombre o ID<input type="search" className={input} value={search} onChange={e => setSearch(e.target.value)} placeholder="Nombre o MG-ID…" /></label><p className="mt-3 text-xs text-text-200">Marca las zonas que incluirás en el JSON. Pulsa su nombre para ver los puntos.</p><div className="mt-3 flex flex-wrap gap-2 text-xs"><button type="button" disabled={creation.isPending || !visibleItems.some(item => !item.error)} onClick={() => setExportKeys(previous => [...new Set([...(previous ?? (selected && !selected.error ? [selected.key] : [])),...visibleItems.filter(item => !item.error).map(item => item.key)])])} className="rounded border border-border px-2 py-1 disabled:opacity-40">Seleccionar visibles</button><button type="button" disabled={creation.isPending || !checkedKeys.length} onClick={() => setExportKeys([])} className="rounded border border-border px-2 py-1 disabled:opacity-40">Limpiar selección</button></div><p role="status" className="mt-3 text-xs font-medium text-sky-400">{exportItems.length} zona{exportItems.length === 1 ? '' : 's'} para copiar</p>
        <div className="mt-4 max-h-150 space-y-2 overflow-y-auto">{visibleItems.map(item => <div key={item.key} className={`w-full min-w-0 rounded-lg border p-3 ${!drawing && selected?.key === item.key ? 'border-sky-500 bg-sky-500/10' : 'border-border'}`}><div className="flex min-w-0 items-start gap-2"><input type="checkbox" aria-label={`Incluir ${item.zone.nombre} en el JSON`} checked={checkedKeys.includes(item.key)} disabled={creation.isPending || Boolean(item.error)} onChange={() => toggleExport(item.key)} className="mt-1 shrink-0" /><button type="button" disabled={creation.isPending} aria-pressed={!drawing && selected?.key === item.key} onClick={() => selectZone(item.key)} className="min-w-0 flex-1 text-left disabled:opacity-50"><span className="flex items-center gap-2 font-medium"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{backgroundColor:item.zone.poligono?.color || '#38bdf8'}} />{item.zone.nombre}</span><span className="mt-2 block text-xs text-text-200">{item.zone.id == null ? 'Sin ID de base de datos' : `MG-${item.zone.id}`} · {Math.max(0,item.vertices.length-1)} vértices</span></button></div>{checkedKeys.includes(item.key) && !item.error && <label className="mt-3 block min-w-0 text-xs text-text-200">Plantilla del archivo<select aria-label={`Plantilla para ${item.zone.nombre}`} value={exportProfiles[String(item.zone.id)] ?? 'exterior'} disabled={creation.isPending} onChange={e => setExportProfiles(previous => ({...previous,[String(item.zone.id)]:e.target.value as ZoneExportProfile}))} className={input}>{ZONE_EXPORT_PROFILES.map(profile => <option key={profile.value} value={profile.value}>{profile.label}</option>)}</select></label>}{item.error && <span className="mt-1 block text-xs text-amber-500">Revisar datos de exportación</span>}</div>)}{!query.isPending && !query.isError && !visibleItems.length && <p className="py-4 text-sm text-text-200">{items.length ? 'No hay zonas que coincidan con la búsqueda.' : 'No hay zonas creadas. Usa Crear zona para dibujar la primera.'}</p>}</div></aside>
      <div className="min-w-0 w-full max-w-full space-y-5">
        <section aria-label="Mapa de zonas" className="min-w-0 w-full max-w-full rounded-xl border border-border bg-bg-100 p-4 sm:p-5"><h2 className="mb-4 font-semibold">{drawing ? 'Dibujar nueva zona' : exportItems.length > 1 ? `Mapa · ${exportItems.length} zonas seleccionadas` : selected ? `Mapa · ${selected.zone.nombre}` : 'Mapa de zonas'}</h2><ZonesMap zones={query.data ?? []} selected={selected?.zone} highlightedZoneIds={highlightedIds} selectedVertex={selectedVertex} onSelectZone={id => selectZone(`id:${id}`)} onSelectVertex={setSelectedVertex} drawing={drawing} draft={mapDraft} onAddPoint={addPoint} onMovePoint={(index,lat,lon) => {if (!creation.isPending) setDraft(previous => previous.map((p,i) => i === index ? {latitude:String(lat),longitude:String(lon)} : p));}} /></section>
        {drawing ? <form onSubmit={save} className="min-w-0 w-full max-w-full space-y-4 rounded-xl border border-sky-500/30 bg-bg-100 p-4 sm:p-5"><h2 className="font-semibold">Nueva zona</h2><fieldset disabled={creation.isPending} className="min-w-0 w-full max-w-full space-y-4 disabled:opacity-60"><div className="grid gap-4 sm:grid-cols-2"><label className="min-w-0 text-xs text-text-200">Nombre de la zona<input required className={input} value={name} onChange={e => setName(e.target.value)} /></label><label className="min-w-0 text-xs text-text-200">Tipo de alerta<select required className={input} value={effectiveAlert} onChange={e => setAlertId(e.target.value)}><option value="">Selecciona una alerta</option>{alerts.data?.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}</select></label><label className="min-w-0 text-xs text-text-200">Descripción<input className={input} value={description} onChange={e => setDescription(e.target.value)} /></label><label className="min-w-0 text-xs text-text-200">Color en nuestro mapa<input className="mt-1 block h-10 w-20 rounded border border-border" type="color" value={color} onChange={e => setColor(e.target.value)} /></label></div>{alerts.isPending && <p className="text-xs text-text-200">Cargando tipos de alerta…</p>}{alerts.isError && <p role="alert" className="text-xs text-amber-500">No se pudieron cargar los tipos de alerta. <button type="button" className="underline" onClick={() => {void alerts.refetch();}}>Reintentar</button></p>}
          <div className="min-w-0 w-full"><table className="w-full table-fixed text-left text-xs"><caption className="mb-2 text-left font-medium">Vértices de la nueva zona ({draft.length})</caption><thead className="text-text-200"><tr><th className="py-2">Punto</th><th>Latitud</th><th>Longitud</th><th /></tr></thead><tbody>{draft.map((p,index) => <tr key={index} className="border-t border-border"><td><button type="button" onClick={() => setSelectedVertex(index)} className="rounded px-2 py-2 text-sky-400">{index+1}</button></td><td className="p-1"><input required type="number" step="any" min={-90} max={90} aria-label={`Latitud del punto ${index+1}`} className={input} value={p.latitude} onChange={e => setDraft(previous => previous.map((v,i) => i === index ? {...v,latitude:e.target.value} : v))} /></td><td className="p-1"><input required type="number" step="any" min={-180} max={180} aria-label={`Longitud del punto ${index+1}`} className={input} value={p.longitude} onChange={e => setDraft(previous => previous.map((v,i) => i === index ? {...v,longitude:e.target.value} : v))} /></td><td className="pl-2"><button type="button" aria-label={`Quitar punto ${index+1}`} onClick={() => {setDraft(previous => previous.filter((_,i) => i !== index));setSelectedVertex(null);}} className="text-red-400">Quitar</button></td></tr>)}</tbody></table></div>
          <div className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"><label className="min-w-0 text-xs text-text-200">Agregar latitud<input className={input} type="number" step="any" min={-90} max={90} value={newLatitude} onChange={e => setNewLatitude(e.target.value)} /></label><label className="min-w-0 text-xs text-text-200">Agregar longitud<input className={input} type="number" step="any" min={-180} max={180} value={newLongitude} onChange={e => setNewLongitude(e.target.value)} /></label><button type="button" disabled={!newLatitude.trim() || !newLongitude.trim() || !isCoordinate(Number(newLatitude),Number(newLongitude))} onClick={() => {addPoint(Number(newLatitude),Number(newLongitude));setNewLatitude('');setNewLongitude('');}} className="rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-40">Agregar punto</button></div>
          <p className="text-xs text-text-200">Agrega al menos tres puntos distintos. El JSON estará disponible después de guardar y obtener el ID de la base de datos.</p></fieldset>
          {formError && <p role="alert" className="text-sm text-red-400">{formError}</p>}<div className="flex justify-end gap-3"><button type="button" disabled={creation.isPending} onClick={() => {setDrawing(false);setDraft([]);setSelectedVertex(null);setFormError('');}} className="rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-40">Cancelar</button><button type="submit" disabled={creation.isPending || draft.length < 3 || !effectiveAlert || !name.trim() || alerts.isError} className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40">{creation.isPending ? 'Guardando…' : 'Guardar zona'}</button></div>
        </form> : selected && <>
          <section aria-label="Detalle de los puntos de la zona" className="min-w-0 w-full max-w-full rounded-xl border border-border bg-bg-100 p-4 sm:p-5"><div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">{selected.zone.nombre}</h2><p className="mt-1 text-xs text-text-200">ID en base de datos: {selected.zone.id ?? 'N/D'} · ID de exportación: {selected.zone.id == null ? 'N/D' : `MG-${selected.zone.id}`}</p>{selected.zone.descripcion && <p className="mt-2 text-sm text-text-200">{selected.zone.descripcion}</p>}</div><span className="rounded-full bg-sky-500/10 px-3 py-1 text-xs text-sky-400">{Math.max(0,selected.vertices.length-1)} vértices</span></div><div className="max-h-80 min-w-0 w-full overflow-y-auto rounded-lg border border-border"><table className="w-full table-fixed text-left text-xs"><caption className="sr-only">Coordenadas de los puntos de la zona</caption><thead className="sticky top-0 bg-bg-200 text-text-200"><tr>{['Punto','Latitud','Longitud','Altitud'].map(label => <th key={label} className="px-3 py-3 font-medium">{label}</th>)}</tr></thead><tbody>{selected.vertices.map(([lat,lon],index) => <tr key={index} className={`border-t border-border ${selectedVertex === index ? 'bg-amber-500/10' : 'hover:bg-bg-200'}`}><td className="px-3 py-2"><button type="button" onClick={() => setSelectedVertex(index === selected.vertices.length-1 ? 0 : index)} className="text-sky-400 underline decoration-dotted">{index === selected.vertices.length-1 ? 'Cierre (punto 1)' : index+1}</button></td><td className="break-all px-2 py-2 font-mono">{lat}</td><td className="break-all px-2 py-2 font-mono">{lon}</td><td className="px-3 py-2 font-mono">0</td></tr>)}</tbody></table></div><p className="mt-3 text-xs text-text-200">El último punto repite el primero para cerrar el polígono. Se conserva la precisión de las coordenadas guardadas.</p></section>
        </>}
        {!drawing && <ZoneJsonField json={exportJson} zoneCount={exportItems.length} error={missingExportItems ? 'Una zona marcada ya no aparece en el listado. Limpia la selección y vuelve a marcar las zonas disponibles.' : exportError ? `${exportError.zone.nombre}: ${exportError.error}` : exportItems.length ? undefined : 'Marca una o más zonas del listado para generar el JSON.'} />}
      </div>
    </div>
  </div>;
}
