import type { Map as MapboxMap, GeoJSONSource } from 'mapbox-gl';
import { MAPBOX_TOKEN, MAP_STYLES } from '@/components/baseMap/libs';
import { buildTrackTrajectories } from '@/features/analysis/trackTrajectories';
import type { AnalysisZone } from './analysis';
import type { ReportSettings } from './reportAnalytics';
import { isValidAnalysisZone, normalizeZone } from './reportAnalytics';
import type { ReportMapCapture, ReportMapGroup } from './reportMapData';

function waitForMap(map: MapboxMap, event: 'load' | 'idle', signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const finish = (error?: Error) => {
      clearTimeout(timer);
      map.off(event, loaded); map.off('error', failed);
      signal?.removeEventListener('abort', aborted);
      if (error) reject(error); else resolve();
    };
    const loaded = () => finish();
    const failed = () => finish(new Error('No se pudo cargar el mapa satelital del informe. Revisa la conexión y vuelve a generar el PDF.'));
    const aborted = () => finish(new DOMException('Operación cancelada', 'AbortError'));
    const timer = setTimeout(() => finish(new Error('El mapa satelital tardó demasiado en cargar. Vuelve a generar el PDF.')), 35000);
    map.on(event, loaded); map.on('error', failed);
    signal?.addEventListener('abort', aborted, { once: true });
    if (signal?.aborted) aborted();
    else if (event === 'idle') map.triggerRepaint();
  });
}

/** Render real satellite tiles with the report's trajectories, then capture the map canvas.
 * A dedicated map prevents changing the operator's visible selection or playback.
 */
export async function captureReportMaps(groups: ReportMapGroup[], zones: AnalysisZone[], settings: ReportSettings,
  signal?: AbortSignal, onProgress?: (done: number, total: number) => void): Promise<ReportMapCapture[]> {
  const nonempty = groups.filter(group => group.points.length);
  if (!nonempty.length) return [];
  if (!MAPBOX_TOKEN) throw new Error('No hay acceso configurado al mapa satelital. Configura el mapa antes de generar el informe con capturas.');
  signal?.throwIfAborted();
  const { default: mapboxgl } = await import('mapbox-gl');
  const width = 1600, height = 1000;
  const container = document.createElement('div');
  Object.assign(container.style, { position: 'fixed', left: '-20000px', top: '0', width: `${width}px`, height: `${height}px`, pointerEvents: 'none' });
  container.setAttribute('aria-hidden', 'true'); document.body.appendChild(container);
  let map: MapboxMap | undefined;
  try {
    map = new mapboxgl.Map({ container, accessToken: MAPBOX_TOKEN, style: MAP_STYLES.satellite,
      center: [nonempty[0].points[0].lon, nonempty[0].points[0].lat], zoom: 15,
      interactive: false, preserveDrawingBuffer: true, attributionControl: true, fadeDuration: 0 });
    await waitForMap(map, 'load', signal);
    const validZones = zones.filter(isValidAnalysisZone);
    const polygons = { type: 'FeatureCollection' as const, features: validZones.map(zone => {
      const ring = zone.vertices.map(([lat, lon]) => [lon, lat]);
      if (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1]) ring.push(ring[0]);
      return { type: 'Feature' as const, properties: { name: zone.nombre, color: settings.criticalZones.some(n => normalizeZone(n) === normalizeZone(zone.nombre)) ? '#ef4444' : zone.color || '#facc15' }, geometry: { type: 'Polygon' as const, coordinates: [ring] } };
    }) };
    map.addSource('report-zones', { type: 'geojson', data: polygons });
    map.addLayer({ id: 'report-zones-fill', type: 'fill', source: 'report-zones', paint: { 'fill-color': ['get', 'color'], 'fill-opacity': .13 } });
    map.addLayer({ id: 'report-zones-line', type: 'line', source: 'report-zones', paint: { 'line-color': ['get', 'color'], 'line-width': 2.5 } });
    map.addSource('report-zone-names', { type: 'geojson', data: { type: 'FeatureCollection', features: validZones.map(zone => ({
      type: 'Feature', properties: { name: zone.nombre }, geometry: { type: 'Point', coordinates: [zone.vertices.reduce((n, p) => n + p[1], 0) / zone.vertices.length, zone.vertices.reduce((n, p) => n + p[0], 0) / zone.vertices.length] },
    })) } });
    map.addLayer({ id: 'report-zones-label', type: 'symbol', source: 'report-zone-names', layout: { 'text-field': ['get', 'name'], 'text-size': 22 }, paint: { 'text-color': '#ffffff', 'text-halo-color': '#111827', 'text-halo-width': 2 } });
    map.addSource('report-lines', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    map.addSource('report-markers', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    map.addLayer({ id: 'report-tracks', type: 'line', source: 'report-lines', paint: { 'line-color': ['get', 'color'], 'line-width': 4, 'line-opacity': .85 } });
    map.addLayer({ id: 'report-marker-glow', type: 'circle', source: 'report-markers', paint: { 'circle-radius': 14, 'circle-color': ['get', 'color'], 'circle-opacity': .65, 'circle-blur': .8 } });
    map.addLayer({ id: 'report-points', type: 'circle', source: 'report-markers', paint: { 'circle-radius': 6, 'circle-color': '#ffffff', 'circle-stroke-color': ['get', 'color'], 'circle-stroke-width': 2 } });
    map.addLayer({ id: 'report-track-label', type: 'symbol', source: 'report-markers', layout: { 'text-field': ['get', 'label'], 'text-size': 18, 'text-offset': [0, 1.5], 'text-anchor': 'top' }, paint: { 'text-color': '#ffffff', 'text-halo-color': '#111827', 'text-halo-width': 2 } });
    const captures: ReportMapCapture[] = [];
    for (let i = 0; i < nonempty.length; i++) {
      signal?.throwIfAborted();
      onProgress?.(i, nonempty.length);
      const group = nonempty[i];
      const geometry = buildTrackTrajectories(group.points, settings.maxGapSeconds, { markers: 'track-ends' });
      for (const feature of [...geometry.lines.features, ...geometry.markers.features]) {
        const color = group.colors?.[String(feature.properties?.trackKey)];
        if (color && feature.properties) feature.properties.color = color;
      }
      (map.getSource('report-lines') as GeoJSONSource).setData(geometry.lines);
      (map.getSource('report-markers') as GeoJSONSource).setData(geometry.markers);
      const bounds = new mapboxgl.LngLatBounds();
      for (const p of group.points) bounds.extend([p.lon, p.lat]);
      map.fitBounds(bounds, { padding: { top: 140, bottom: 100, left: 100, right: 100 }, duration: 0, maxZoom: 18 });
      await waitForMap(map, 'idle', signal);
      if (!map.areTilesLoaded()) throw new Error('La imagen satelital no terminó de cargar. Vuelve a generar el informe.');
      const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('El navegador no permite capturar el mapa del informe.');
      ctx.drawImage(map.getCanvas(), 0, 0, width, height);
      const legend = new Map(geometry.markers.features.map(f => [String(f.properties?.trackKey), f.properties]));
      ctx.font = '26px sans-serif'; let x = 18, y = 18;
      for (const key of group.trackKeys) {
        const item = legend.get(key); if (!item) continue;
        const label = `${item.trackId} / ${item.radar}`;
        const box = Math.min(width - 36, ctx.measureText(label).width + 66);
        if (x + box > width - 18) { x = 18; y += 48; }
        ctx.fillStyle = 'rgba(15, 23, 42, .9)'; ctx.fillRect(x, y, box, 40);
        ctx.fillStyle = String(item.color); ctx.fillRect(x + 12, y + 13, 22, 14);
        ctx.fillStyle = '#ffffff'; ctx.fillText(label, x + 44, y + 29, box - 52); x += box + 10;
      }
      const attribution = container.querySelector('.mapboxgl-ctrl-attrib-inner')?.textContent?.replace(/\s+/g, ' ').trim() || '© Mapbox © OpenStreetMap';
      ctx.font = '18px sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.88)'; ctx.fillRect(0, height - 30, width, 30);
      ctx.fillStyle = '#111827'; ctx.fillText(`Mapbox · ${attribution}`, 12, height - 9, width - 24);
      captures.push({ trackKeys: [...group.trackKeys], image: canvas.toDataURL('image/png'), width, height });
    }
    onProgress?.(nonempty.length, nonempty.length);
    return captures;
  } finally { map?.remove(); container.remove(); }
}
