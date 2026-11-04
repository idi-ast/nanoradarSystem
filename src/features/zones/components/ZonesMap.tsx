import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Map, { Layer, Marker, NavigationControl, Popup, Source } from 'react-map-gl';
import type { MapLayerMouseEvent, MapRef } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { DEFAULT_CENTER, MAPBOX_TOKEN, MAP_STYLES } from '@/components/baseMap/libs';
import type { RadarZone } from '@/features/devices/types';
import { closeZoneRing, readZoneCoordinates, type Coordinate } from '../zoneGeometry';

export interface MapVertex { index: number; latitude: number; longitude: number }
interface Props {
  zones: RadarZone[];
  selected?: RadarZone;
  highlightedZoneIds?: number[];
  selectedVertex: number | null;
  onSelectZone: (id: number) => void;
  onSelectVertex: (index: number | null) => void;
  drawing: boolean;
  draft: MapVertex[];
  onAddPoint: (lat: number, lon: number) => void;
  onMovePoint: (index: number, lat: number, lon: number) => void;
}
function savedPoints(zone?: RadarZone): Coordinate[] {
  try { return zone ? closeZoneRing(readZoneCoordinates(zone.poligono.vertices)) : []; } catch { return []; }
}
export function ZonesMap({ zones, selected, highlightedZoneIds = [], selectedVertex, onSelectZone, onSelectVertex, drawing, draft, onAddPoint, onMovePoint }: Props) {
  const mapRef = useRef<MapRef>(null);
  const [mode, setMode] = useState<'map' | 'scheme'>(MAPBOX_TOKEN ? 'map' : 'scheme');
  const [mapError, setMapError] = useState(false);
  const [schemeFrame, setSchemeFrame] = useState<{key:string;points:Coordinate[]} | null>(null);
  const viewKey = `${selected?.id ?? 'all'}:${drawing}:${highlightedZoneIds.join(',')}`;
  const shapes = useMemo(() => zones.map(zone => ({ zone, points: savedPoints(zone) })).filter(s => s.points.length >= 4), [zones]);
  const selectedRing = useMemo(() => savedPoints(selected), [selected]);
  const markers: MapVertex[] = useMemo(() => drawing ? draft : selectedRing.slice(0, -1).map(([latitude, longitude], index) => ({ latitude, longitude, index })), [drawing, draft, selectedRing]);
  const polygonData = useMemo(() => ({ type: 'FeatureCollection' as const, features: shapes.map(({zone, points}) => ({ type: 'Feature' as const, properties: { id: zone.id, name: zone.nombre, color: zone.poligono.color || '#38bdf8', selected: zone.id === selected?.id || highlightedZoneIds.includes(zone.id!) }, geometry: { type: 'Polygon' as const, coordinates: [points.map(([lat, lon]) => [lon, lat])] } })) }), [shapes, selected?.id, highlightedZoneIds]);
  const draftData = useMemo(() => {
    const coords = draft.map(p => [p.longitude, p.latitude]);
    return { type: 'FeatureCollection' as const, features: coords.length < 2 ? [] : [{ type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: coords.length >= 3 ? [...coords, coords[0]] : coords } }] };
  }, [draft]);
  const contextPoints = useMemo(() => highlightedZoneIds.length > 1 ? shapes.filter(s => highlightedZoneIds.includes(s.zone.id!) || s.zone.id === selected?.id).flatMap(s => s.points) : selectedRing.length ? selectedRing : shapes.flatMap(s => s.points), [selectedRing, shapes, highlightedZoneIds, selected?.id]);
  const fit = useCallback((points: Coordinate[]) => {
    if (!points.length) return;
    let west = Infinity, east = -Infinity, south = Infinity, north = -Infinity;
    for (const [lat, lon] of points) { west = Math.min(west, lon); east = Math.max(east, lon); south = Math.min(south, lat); north = Math.max(north, lat); }
    mapRef.current?.fitBounds([[west, south], [east, north]], { padding: 65, maxZoom: 18, duration: 400 });
  }, []);
  useEffect(() => { if (mode === 'map') fit(contextPoints); }, [fit, contextPoints, mode]);
  const select = (event: MapLayerMouseEvent) => {
    if (drawing) { onAddPoint(event.lngLat.lat, event.lngLat.lng); return; }
    const id = event.features?.find(f => f.properties?.id != null)?.properties?.id;
    if (id != null && Number.isSafeInteger(Number(id))) onSelectZone(Number(id));
  };
  const popup = selectedVertex == null ? null : markers.find(p => p.index === selectedVertex);
  // The schematic is also usable without a token or network. Its coordinates
  // use a local metric projection, not longitude and latitude as equal lengths.
  const projection = useMemo(() => {
    const framed = schemeFrame?.key === viewKey ? schemeFrame.points : contextPoints;
    const points = framed.length ? framed : [[DEFAULT_CENTER.latitude - .005, DEFAULT_CENTER.longitude - .005], [DEFAULT_CENTER.latitude + .005, DEFAULT_CENTER.longitude + .005]];
    let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
    for (const [lat, lon] of points) { minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat); minLon = Math.min(minLon, lon); maxLon = Math.max(maxLon, lon); }
    const cx = (minLon + maxLon) / 2, cy = (minLat + maxLat) / 2, cos = Math.max(.1, Math.cos(cy * Math.PI / 180));
    const scale = Math.min(500 / Math.max((maxLon - minLon) * cos, .0001), 280 / Math.max(maxLat - minLat, .0001));
    return { x: (lon: number) => 300 + (lon - cx) * cos * scale, y: (lat: number) => 180 - (lat - cy) * scale, lat: (y: number) => cy + (180 - y) / scale, lon: (x: number) => cx + (x - 300) / cos / scale };
  }, [contextPoints, schemeFrame, viewKey]);
  return <div className="min-w-0 w-full max-w-full">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-text-200">{drawing ? 'Haz clic para agregar puntos; arrástralos en el mapa para ajustarlos.' : 'Selecciona una zona o pulsa un vértice para ver sus coordenadas.'}</p><div className="flex max-w-full flex-wrap gap-2 text-xs"><button type="button" aria-pressed={mode === 'map'} disabled={!MAPBOX_TOKEN} onClick={() => setMode('map')} className="rounded-lg border border-border px-3 py-2 disabled:opacity-40">Mapa satelital</button><button type="button" aria-pressed={mode === 'scheme'} onClick={() => setMode('scheme')} className="rounded-lg border border-border px-3 py-2">Esquema</button><button type="button" onClick={() => {const points: Coordinate[] = drawing && draft.length ? draft.map(p => [p.latitude,p.longitude]) : contextPoints; if (mode === 'map') fit(points); else setSchemeFrame({key:viewKey,points});}} className="rounded-lg border border-border px-3 py-2">{drawing ? 'Centrar dibujo' : 'Centrar'}</button></div></div>
    {mapError && mode === 'map' && <p role="alert" className="mb-3 text-xs text-amber-400">No se pudieron cargar los recursos del mapa. <button type="button" onClick={() => setMode('scheme')} className="underline">Ver esquema</button></p>}
    <div className="relative min-w-0 w-full max-w-full h-96 overflow-hidden rounded-xl border border-border bg-bg-200 sm:h-110">
      {mode === 'scheme' ? <svg viewBox="0 0 600 360" preserveAspectRatio="xMidYMid meet" className={`h-full w-full ${drawing ? 'cursor-crosshair' : ''}`} role="img" aria-label="Mapa esquemático de las zonas y sus vértices" onClick={e => { if (!drawing) return; const rect = e.currentTarget.getBoundingClientRect(); const scale = Math.min(rect.width / 600, rect.height / 360); const x = (e.clientX - rect.left - (rect.width - 600 * scale) / 2) / scale, y = (e.clientY - rect.top - (rect.height - 360 * scale) / 2) / scale; if (x >= 0 && x <= 600 && y >= 0 && y <= 360) onAddPoint(projection.lat(y), projection.lon(x)); }}>
        <rect width="600" height="360" fill="var(--color-bg-200)" />
        {shapes.map(({zone, points}, i) => <polygon key={zone.id ?? i} points={points.map(([lat,lon]) => `${projection.x(lon)},${projection.y(lat)}`).join(' ')} fill={zone.poligono.color || '#38bdf8'} fillOpacity={(zone.id === selected?.id || highlightedZoneIds.includes(zone.id!)) ? .28 : .08} stroke={(zone.id === selected?.id || highlightedZoneIds.includes(zone.id!)) ? '#38bdf8' : '#64748b'} strokeWidth={(zone.id === selected?.id || highlightedZoneIds.includes(zone.id!)) ? 2 : 1} onClick={e => { if (!drawing && zone.id != null) { e.stopPropagation(); onSelectZone(zone.id); } }} />)}
        {drawing && draft.length > 1 && <polyline points={[...draft, ...(draft.length >= 3 ? [draft[0]] : [])].map(p => `${projection.x(p.longitude)},${projection.y(p.latitude)}`).join(' ')} fill="none" stroke="#38bdf8" strokeWidth="2" strokeDasharray="5 3" />}
        {markers.map(p => <g key={p.index} role="button" tabIndex={0} aria-label={`Ver punto ${p.index + 1}`} className="cursor-pointer" onClick={e => { e.stopPropagation(); onSelectVertex(p.index); }} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectVertex(p.index); } }}><circle cx={projection.x(p.longitude)} cy={projection.y(p.latitude)} r={p.index === selectedVertex ? 10 : 7} fill={p.index === selectedVertex ? '#fbbf24' : '#0284c7'} stroke="white" strokeWidth="1.5" /><text x={projection.x(p.longitude)} y={projection.y(p.latitude) + 3} textAnchor="middle" fontSize="9" fill="#ffffff">{p.index + 1}</text></g>)}
        <text x="574" y="23" fill="var(--color-text-100)" fontSize="12">N ↑</text>
      </svg> : <Map ref={mapRef} initialViewState={{...DEFAULT_CENTER, zoom: 12}} mapboxAccessToken={MAPBOX_TOKEN} mapStyle={MAP_STYLES.satellite} style={{width:'100%',height:'100%'}} renderWorldCopies={false} onLoad={() => fit(contextPoints)} onError={() => setMapError(true)} interactiveLayerIds={['zones-page-fill']} onClick={select} cursor={drawing ? 'crosshair' : 'pointer'}>
        <NavigationControl position="top-right" />
        <Source id="zones-page-data" type="geojson" data={polygonData}><Layer id="zones-page-fill" type="fill" paint={{'fill-color':['get','color'],'fill-opacity':['case',['get','selected'],.3,.1]}} /><Layer id="zones-page-line" type="line" paint={{'line-color':['case',['get','selected'],'#38bdf8',['get','color']],'line-width':['case',['get','selected'],3,1.5]}} /><Layer id="zones-page-label" type="symbol" layout={{'text-field':['get','name'],'text-size':12}} paint={{'text-color':'#ffffff','text-halo-color':'#0f172a','text-halo-width':2}} /></Source>
        {drawing && <Source id="zones-page-draft" type="geojson" data={draftData}><Layer id="zones-page-draft-line" type="line" paint={{'line-color':'#38bdf8','line-width':3,'line-dasharray':[3,2]}} /></Source>}
        {markers.map(p => <Marker key={p.index} latitude={p.latitude} longitude={p.longitude} draggable={drawing} onDragEnd={e => onMovePoint(p.index,e.lngLat.lat,e.lngLat.lng)}><button type="button" aria-label={`Ver punto ${p.index + 1}`} onClick={e => {e.stopPropagation();onSelectVertex(p.index);}} className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white shadow ${p.index === selectedVertex ? 'bg-amber-500' : 'bg-sky-600'}`}>{p.index + 1}</button></Marker>)}
        {popup && <Popup latitude={popup.latitude} longitude={popup.longitude} closeOnClick={false} onClose={() => onSelectVertex(null)} offset={18}><div className="text-xs text-slate-900"><strong>Punto {popup.index + 1}</strong><p>Latitud: {popup.latitude}</p><p>Longitud: {popup.longitude}</p></div></Popup>}
      </Map>}
    </div>
    {mode === 'scheme' && <p className="mt-2 text-xs text-text-200">Esquema geográfico sin imagen satelital. Puedes crear puntos haciendo clic o introduciendo sus coordenadas en el formulario.</p>}
  </div>;
}
