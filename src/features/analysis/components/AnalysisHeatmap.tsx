import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Map, { Layer, Marker, NavigationControl, Popup, Source } from 'react-map-gl';
import type { LayerProps, MapLayerMouseEvent, MapRef } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MAPBOX_TOKEN, MAP_STYLES } from '@/components/baseMap/libs';
import { MapHealth } from '@/components/baseMap/components/MapHealth';
import type { AnalysisPoint, AnalysisZone } from '@/features/history/analysis';
import { isNight, localParts, normalizeZone, type ReportSettings } from '@/features/history/reportAnalytics';
import { spatialChart } from '@/features/history/reportCharts';
import { aggregateHeatCells } from '../analyticsData';

export interface MapFocus { latitude: number; longitude: number; label: string }
interface Props { points: AnalysisPoint[]; zones: AnalysisZone[]; settings: ReportSettings; focus: MapFocus | null; mode: 'map' | 'scheme'; onModeChange: (mode: 'map' | 'scheme') => void }
export function AnalysisHeatmap({ points, zones, settings, focus, mode, onModeChange }: Props) {
  const mapRef = useRef<MapRef>(null);
  const [nightOnly, setNightOnly] = useState(false);
  const [mapGeneration, setMapGeneration] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{ latitude: number; longitude: number; positions: number; tracks: number } | null>(null);
  const visiblePoints = useMemo(() => nightOnly ? points.filter(p => {
    const parts = localParts(p.fecha ?? '', settings.timeZone);
    return parts && isNight(parts.hour, settings);
  }) : points, [points, settings, nightOnly]);
  const grid = useMemo(() => aggregateHeatCells(visiblePoints, settings), [visiblePoints, settings]);
  const cellsData = useMemo(() => ({ type: 'FeatureCollection' as const, features: grid.cells.map(c => ({ type: 'Feature' as const, geometry: { type: 'Point' as const, coordinates: [c.longitude, c.latitude] }, properties: { positions: c.positions, tracks: c.tracks } })) }), [grid.cells]);
  const zoneData = useMemo(() => ({ type: 'FeatureCollection' as const, features: zones.map(z => {
    const ring = z.vertices.map(([lat, lon]) => [lon, lat]);
    return { type: 'Feature' as const, geometry: { type: 'Polygon' as const, coordinates: [[...ring, ring[0]]] }, properties: { name: z.nombre, critical: settings.criticalZones.some(name => normalizeZone(name) === normalizeZone(z.nombre)) } };
  }) }), [zones, settings.criticalZones]);
  const bounds = useMemo(() => {
    let west = Infinity, south = Infinity, east = -Infinity, north = -Infinity;
    const include = (lat: number, lon: number) => { west = Math.min(west, lon); east = Math.max(east, lon); south = Math.min(south, lat); north = Math.max(north, lat); };
    for (const c of grid.cells) include(c.latitude, c.longitude);
    for (const z of zones) for (const [lat, lon] of z.vertices) include(lat, lon);
    return Number.isFinite(west) ? [[west, south], [east, north]] as [[number, number], [number, number]] : null;
  }, [grid.cells, zones]);
  const max = Math.max(1, ...grid.cells.map(c => c.positions));
  const heat: LayerProps = { id: 'analysis-heat', type: 'heatmap', paint: {
    'heatmap-weight': ['interpolate', ['linear'], ['get', 'positions'], 0, 0, max, 1],
    'heatmap-intensity': 2, 'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 8, 12, 17, 35],
    'heatmap-opacity': .78,
    'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'], 0, 'rgba(14,165,233,0)', .2, '#38bdf8', .4, '#2dd4bf', .6, '#fde047', .8, '#fb923c', 1, '#ef4444'],
  } };
  const circles: LayerProps = { id: 'analysis-cells', type: 'circle', minzoom: 12, paint: { 'circle-radius': 5, 'circle-color': '#38bdf8', 'circle-opacity': .25, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': .6 } };
  const fill: LayerProps = { id: 'analysis-zones-fill', type: 'fill', paint: { 'fill-color': ['case', ['get', 'critical'], '#fb7185', '#38bdf8'], 'fill-opacity': .08 } };
  const line: LayerProps = { id: 'analysis-zones-line', type: 'line', paint: { 'line-color': ['case', ['get', 'critical'], '#fb7185', '#e2e8f0'], 'line-width': 2 } };
  const labels: LayerProps = { id: 'analysis-zones-label', type: 'symbol', layout: { 'text-field': ['get', 'name'], 'text-size': 12 }, paint: { 'text-color': '#ffffff', 'text-halo-color': '#0f172a', 'text-halo-width': 2 } };
  const resetMap = useCallback(() => { setLoaded(false); setMapError(false); setMapGeneration(n => n + 1); }, []);
  useEffect(() => { if (loaded && bounds) mapRef.current?.fitBounds(bounds, { padding: 65, maxZoom: 17, duration: 400 }); }, [loaded, bounds]);
  useEffect(() => { if (loaded && focus) mapRef.current?.flyTo({ center: [focus.longitude, focus.latitude], zoom: 17, duration: 600 }); }, [loaded, focus]);
  const changeMode = (next: 'map' | 'scheme') => {
    if (mode !== next) { setLoaded(false); onModeChange(next); }
  };
  const selectCell = useCallback((event: MapLayerMouseEvent) => {
    const feature = event.features?.find(f => f.layer?.id === 'analysis-cells');
    if (feature?.geometry.type === 'Point') {
      setSelectedCell({ longitude: feature.geometry.coordinates[0], latitude: feature.geometry.coordinates[1], positions: Number(feature.properties?.positions ?? 0), tracks: Number(feature.properties?.tracks ?? 0) });
    } else setSelectedCell(null);
  }, []);
  const scheme = useMemo(() => mode === 'scheme' ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(spatialChart(visiblePoints, zones, settings))}` : '', [mode, visiblePoints, zones, settings]);
  return <div>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex rounded-lg border border-border p-1 text-xs">{[false, true].map(night => <button key={String(night)} type="button" aria-pressed={nightOnly === night} onClick={() => { setNightOnly(night); setSelectedCell(null); }} className={`rounded px-3 py-2 ${nightOnly === night ? 'bg-sky-500/15 text-sky-400' : 'text-text-200'}`}>{night ? 'Solo noche' : 'Todo el período'}</button>)}</div>
      <div className="flex gap-2 text-xs"><button type="button" aria-pressed={mode === 'map'} onClick={() => changeMode('map')} className="rounded border border-border px-3 py-2">Mapa satelital</button><button type="button" aria-pressed={mode === 'scheme'} onClick={() => changeMode('scheme')} className="rounded border border-border px-3 py-2">Esquema geográfico</button></div>
    </div>
    {mapError && mode === 'map' && <div role="alert" className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-500"><span>No se pudieron cargar algunos recursos del mapa.</span><button type="button" onClick={() => changeMode('scheme')} className="underline">Ver esquema geográfico</button></div>}
    <div className="relative h-110 overflow-hidden rounded-xl border border-border bg-bg-200">
      {!bounds ? <div className="flex h-full items-center justify-center p-8 text-center text-sm text-text-200">No hay posiciones ni polígonos para representar en este período.</div> : mode === 'scheme' ? <img src={scheme} className="h-full w-full bg-white object-contain" alt="Esquema geográfico de densidad de posiciones y polígonos de zonas" /> : <Map
        key={mapGeneration} ref={mapRef} initialViewState={{ longitude: (bounds[0][0] + bounds[1][0]) / 2, latitude: (bounds[0][1] + bounds[1][1]) / 2, zoom: 13 }}
        mapboxAccessToken={MAPBOX_TOKEN} mapStyle={MAP_STYLES.satellite} style={{ width: '100%', height: '100%' }} renderWorldCopies={false}
        onLoad={() => setLoaded(true)} onError={() => setMapError(true)} interactiveLayerIds={['analysis-cells']} onClick={selectCell}>
        <MapHealth onRetry={resetMap} /><NavigationControl position="top-right" showCompass={false} />
        <Source id="analysis-density" type="geojson" data={cellsData}><Layer {...heat} /><Layer {...circles} /></Source>
        <Source id="analysis-zones" type="geojson" data={zoneData}><Layer {...fill} /><Layer {...line} /><Layer {...labels} /></Source>
        {focus && <Marker longitude={focus.longitude} latitude={focus.latitude}><span title={focus.label} className="block h-5 w-5 rounded-full border-2 border-white bg-rose-500 shadow-lg" /></Marker>}
        {selectedCell && <Popup longitude={selectedCell.longitude} latitude={selectedCell.latitude} closeOnClick={false} onClose={() => setSelectedCell(null)}><div className="p-1 text-xs text-slate-900"><strong>{selectedCell.positions.toLocaleString('es-CL')} posiciones</strong><p>{selectedCell.tracks} tracks distintos en esta celda</p><p>Tamaño aproximado: {grid.cellMeters} m</p></div></Popup>}
      </Map>}
      {!!bounds && !grid.positionCount && <div className="absolute left-3 top-3 rounded bg-slate-950/85 px-3 py-2 text-xs text-white">Sin posiciones {nightOnly ? 'nocturnas' : 'registradas'} en esta selección; se muestran las zonas.</div>}
      {focus && <div className="absolute bottom-3 left-3 max-w-[80%] rounded border border-rose-400/40 bg-slate-950/85 px-3 py-2 text-xs text-white">{focus.label}</div>}
    </div>
    <div className="mt-3 flex flex-wrap justify-between gap-3 text-xs text-text-200"><span>{grid.positionCount.toLocaleString('es-CL')} posiciones · celdas de ~{grid.cellMeters} m</span><span className="flex items-center gap-2">Menor <span className="h-2 w-32 rounded bg-linear-to-r from-sky-400 via-yellow-300 to-red-500" /> Mayor intensidad</span></div>
    <p className="mt-2 text-xs text-text-300">Contorno rosado: zona crítica. La densidad refleja posiciones registradas, no embarcaciones únicas. Acerca el mapa y pulsa una celda para ver su conteo.</p>
  </div>;
}
