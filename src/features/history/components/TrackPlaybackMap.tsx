import { Fragment, useCallback, useEffect, useMemo, useRef } from "react";
import ReactMapGL, { Marker, Source, Layer, Popup } from "react-map-gl";
import type { MapLayerMouseEvent, MapRef } from "react-map-gl";
import {
  MAPBOX_TOKEN,
  MAP_STYLES,
  DEFAULT_CENTER,
} from "@/components/baseMap/libs";
import type { TrackHistoryPoint } from "@/features/devices/types";
import { toGeoCoord } from "@/features/devices/components/map/utils/geoHelpers";
import type { RadarZone } from "@/features/devices/types";
import type { TrackPlaybackItem } from "../hooks/useTrackPlayback";
import { trackKey } from "../hooks/useTrackPlayback";

interface Props {
  tracks: TrackPlaybackItem[];
  playbackIndex: number;
  activeTrackKey: string | null;
  trackIndices: Record<string, number>;
  onSelectTrack: (key: string | null) => void;
  zones: RadarZone[];
  loading: boolean;
}

const TRACK_COLORS = [
  "#bbff00",
  "#38bdf8",
  "#f472b6",
  "#fb923c",
  "#a78bfa",
  "#34d399",
  "#facc15",
  "#f87171",
  "#22d3ee",
  "#c084fc",
];

function pointAt(
  points: TrackHistoryPoint[],
  i: number,
): TrackHistoryPoint | null {
  if (points.length === 0) return null;
  return points[Math.max(0, Math.min(i, points.length - 1))];
}

export function TrackPlaybackMap({
  tracks,
  playbackIndex,
  activeTrackKey,
  trackIndices,
  onSelectTrack,
  zones,
  loading,
}: Props) {
  const mapRef = useRef<MapRef>(null);
  const mapStyle = MAP_STYLES.satellite;

  const selectionKey = useMemo(
    () => tracks.map((t) => trackKey(t.summary)).join("|"),
    [tracks],
  );

  // Al cambiar la selección: encuadrar los tracks cargados.
  useEffect(() => {
    if (!mapRef.current) return;
    const pts = tracks.flatMap((t) => t.points);
    if (pts.length === 0) return;
    let minLat = Infinity,
      maxLat = -Infinity,
      minLon = Infinity,
      maxLon = -Infinity;
    for (const p of pts) {
      if (!Number.isFinite(p.lat) || !Number.isFinite(p.lon)) continue;
      if (p.lat < minLat) minLat = p.lat;
      if (p.lat > maxLat) maxLat = p.lat;
      if (p.lon < minLon) minLon = p.lon;
      if (p.lon > maxLon) maxLon = p.lon;
    }
    if (!Number.isFinite(minLat)) return;
    const pad = { top: 80, left: 80, right: 80, bottom: 170 };
    mapRef.current.fitBounds(
      [
        [minLon, minLat],
        [maxLon, maxLat],
      ],
      { padding: pad, duration: 500, maxZoom: 16.5, minZoom: 12 },
    );
  }, [selectionKey, tracks]);

  // Durante la reproducción con un solo track: seguirlo.
  const singleCurrent = useMemo(() => {
    if (tracks.length !== 1) return null;
    return pointAt(tracks[0].points, playbackIndex);
  }, [tracks, playbackIndex]);

  useEffect(() => {
    if (!singleCurrent || !mapRef.current) return;
    mapRef.current.easeTo({
      center: [singleCurrent.lon, singleCurrent.lat],
      duration: 250,
    });
  }, [singleCurrent]);

  const zonesGeo = useMemo(() => {
    if (zones.length === 0) return null;
    return {
      type: "FeatureCollection" as const,
      features: zones.map((zone, idx) => {
        const rawVertices = Array.isArray(zone.poligono.vertices)
          ? zone.poligono.vertices
          : Object.values(zone.poligono.vertices);
        const coords = rawVertices.map(toGeoCoord);
        if (coords.length > 0) coords.push(coords[0]);
        return {
          type: "Feature" as const,
          geometry: {
            type: "Polygon" as const,
            coordinates: [coords],
          },
          properties: {
            color: zone.poligono.color,
            name: zone.nombre,
            id: idx,
          },
        };
      }),
    };
  }, [zones]);

  const hasPoints = useMemo(
    () => tracks.some((t) => t.points.length > 0),
    [tracks],
  );

  const trackGeometry = useMemo(() => tracks.map((t, i) => ({
    item: t, key: trackKey(t.summary), id: `history-track-${i}`,
    color: TRACK_COLORS[i % TRACK_COLORS.length],
    coords: t.points.map(p => [p.lon, p.lat] as [number, number]),
  })), [tracks]);
  const drawOrder = useMemo(() => [...trackGeometry].sort((a, b) =>
    Number(a.key === activeTrackKey) - Number(b.key === activeTrackKey)), [trackGeometry, activeTrackKey]);
  const interactiveLayerIds = useMemo(() => trackGeometry.filter(t => t.coords.length >= 2).map(t => `${t.id}-hit`), [trackGeometry]);
  const raiseActiveTrack = useCallback(() => {
    const map = mapRef.current?.getMap();
    const selected = trackGeometry.find(t => t.key === activeTrackKey);
    if (!map || !selected) return;
    for (const kind of ['full', 'remaining', 'played', 'hit']) {
      const id = `${selected.id}-${kind}`;
      if (map.getLayer(id)) map.moveLayer(id);
    }
  }, [activeTrackKey, trackGeometry]);
  useEffect(() => { raiseActiveTrack(); }, [raiseActiveTrack]);
  const active = tracks.find(t => trackKey(t.summary) === activeTrackKey);
  const activePoint = active ? pointAt(active.points, trackIndices[activeTrackKey!] ?? playbackIndex) : null;
  const selectPath = (event: MapLayerMouseEvent) => {
    const key = event.features?.find(f => typeof f.properties?.trackKey === 'string')?.properties?.trackKey;
    if (typeof key === 'string') onSelectTrack(key);
  };

  return (
    <div className="relative w-full h-full">
      <ReactMapGL
        ref={mapRef}
        initialViewState={{
          longitude: DEFAULT_CENTER.longitude,
          latitude: DEFAULT_CENTER.latitude,
          zoom: 17,
          bearing: 0,
          pitch: 0,
        }}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle={mapStyle}
        style={{ width: "100%", height: "100%" }}
        attributionControl={false}
        reuseMaps
        interactiveLayerIds={interactiveLayerIds}
        onClick={selectPath}
        onLoad={raiseActiveTrack}
        cursor="pointer"
      >
        {zonesGeo && (
          <Source id="history-zones" type="geojson" data={zonesGeo}>
            <Layer
              id="history-zones-fill"
              type="fill"
              paint={{
                "fill-color": ["get", "color"] as unknown as string,
                "fill-opacity": 0.12,
              }}
            />
            <Layer
              id="history-zones-line"
              type="line"
              paint={{
                "line-color": ["get", "color"] as unknown as string,
                "line-width": 1.5,
                "line-opacity": 0.8,
              }}
            />
            <Layer
              id="history-zones-label"
              type="symbol"
              layout={{
                "text-field": ["get", "name"],
                "text-size": 11,
                "text-font": ["Open Sans Bold"],
              }}
              paint={{
                "text-color": "#fff",
                "text-halo-color": "#000",
                "text-halo-width": 1,
              }}
            />
          </Source>
        )}

        {drawOrder.map(({ item: t, key, id, color, coords }) => {
          if (coords.length < 2) return null;
          const selected = key === activeTrackKey;
          const dimmed = Boolean(activeTrackKey && !selected);
          const clamp = Math.max(0, Math.min(trackIndices[key] ?? playbackIndex, coords.length - 1));
          const segments = [
            { kind: 'full', coordinates: coords },
            { kind: 'played', coordinates: coords.slice(0, clamp + 1) },
            { kind: 'remaining', coordinates: coords.slice(clamp) },
          ].filter(segment => segment.coordinates.length >= 2);
          const geo = {
            type: 'FeatureCollection' as const,
            features: segments.map(segment => ({
              type: 'Feature' as const,
              geometry: { type: 'LineString' as const, coordinates: segment.coordinates },
              properties: { kind: segment.kind, trackKey: key, trackId: t.summary.track_id, radar: t.summary.tipo_radar },
            })),
          };
          return <Source key={id} id={`src-${id}`} type="geojson" data={geo}>
            <Layer id={`${id}-full`} type="line" filter={['==', ['get', 'kind'], 'full']} paint={{ 'line-color': color, 'line-width': 14, 'line-opacity': dimmed ? .04 : .15, 'line-blur': 12 }} />
            <Layer id={`${id}-remaining`} type="line" filter={['==', ['get', 'kind'], 'remaining']} paint={{ 'line-color': color, 'line-width': selected ? 5 : 3, 'line-opacity': dimmed ? .18 : selected ? .8 : .5, 'line-dasharray': [2, 1.2] }} />
            <Layer id={`${id}-played`} type="line" filter={['==', ['get', 'kind'], 'played']} paint={{ 'line-color': color, 'line-width': selected ? 5 : 3, 'line-opacity': dimmed ? .22 : 1 }} />
            <Layer id={`${id}-hit`} type="line" filter={['==', ['get', 'kind'], 'full']} paint={{ 'line-width': 18, 'line-opacity': 0 }} />
          </Source>;
        })}

        {drawOrder.map(({ item: t, key, color }) => {
          const first = t.points[0] ?? null;
          const cur = pointAt(t.points, trackIndices[key] ?? playbackIndex);
          const selected = key === activeTrackKey;
          const opacity = activeTrackKey && !selected ? .3 : 1;
          const select = () => onSelectTrack(key);
          return <Fragment key={`markers-${key}`}>
            {first && <Marker longitude={first.lon} latitude={first.lat} anchor="center" style={{ zIndex: selected ? 2 : 1 }}>
              <button type="button" aria-label={`Seleccionar inicio del track ${t.summary.track_id} / ${t.summary.tipo_radar}`} title={`${t.summary.track_id} / ${t.summary.tipo_radar}`} onClick={event => { event.stopPropagation(); select(); }} className="block h-3 w-3 cursor-pointer rounded-full border-2 border-white focus-visible:outline-2 focus-visible:outline-white" style={{ background: color, opacity }} />
            </Marker>}
            {cur && <Marker longitude={cur.lon} latitude={cur.lat} anchor="center" style={{ zIndex: selected ? 2 : 1 }}>
              <button type="button" aria-label={`Seleccionar track ${t.summary.track_id} / ${t.summary.tipo_radar}`} title={`${t.summary.track_id} / ${t.summary.tipo_radar}`} onClick={event => { event.stopPropagation(); select(); }} className={`block cursor-pointer rounded-full ring-4 focus-visible:outline-2 focus-visible:outline-white ${selected ? 'h-4 w-4' : 'h-3 w-3'}`} style={{ background: '#ffffff', boxShadow: `0 0 12px ${color}`, opacity }} />
            </Marker>}
          </Fragment>;
        })}
        {active && activePoint && <Popup longitude={activePoint.lon} latitude={activePoint.lat} anchor="bottom" offset={16} closeOnClick={false} onClose={() => onSelectTrack(null)}>
          <div className="text-xs text-text-100 p-2 bg-bg-100 rounded-xl"><strong>Track ID: {active.summary.track_id}</strong><p>Radar: {active.summary.tipo_radar}</p><p>Reproducción individual</p></div>
        </Popup>}

      </ReactMapGL>

      {loading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-bg-100/40 backdrop-blur-[1px]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-100 border-t-transparent" />
        </div>
      )}

      {tracks.length === 0 && !loading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <p className="text-text-100/60 text-sm">
            Selecciona uno o más tracks del historial para reproducirlos
          </p>
        </div>
      )}

      {tracks.length > 0 && !loading && !hasPoints && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <p className="text-text-100/60 text-sm">
            Sin puntos para los tracks seleccionados
          </p>
        </div>
      )}

      <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-2">
        {tracks.slice(0, 12).map((t, i) => {
          const key = trackKey(t.summary);
          return <button key={key} type="button" aria-pressed={key === activeTrackKey} onClick={() => onSelectTrack(key)} className={`rounded-md ${activeTrackKey && key !== activeTrackKey ? 'opacity-40' : ''} ${key === activeTrackKey ? 'ring-2 ring-white' : ''}`}><LegendChip color={TRACK_COLORS[i % TRACK_COLORS.length]} label={`${t.summary.track_id} / ${t.summary.tipo_radar}${t.loading ? '…' : ''}`} solid /></button>;
        })}
        {activeTrackKey && tracks.length > 1 && <button type="button" onClick={() => onSelectTrack(null)} className="rounded-md border border-border bg-bg-100/90 px-2 py-1 text-xs">Reproducir todos ({tracks.length})</button>}
        <LegendChip color="#ffffff" label="Zonas" />
      </div>
    </div>
  );
}

function LegendChip({
  color,
  label,
  dash,
  solid,
}: {
  color: string;
  label: string;
  dash?: boolean;
  solid?: boolean;
}) {
  return (
    <span className="flex items-center gap-1.5 rounded-md bg-bg-100/85 border border-border px-2 py-1 text-[10px] text-text-100/80 shadow">
      <span
        className="inline-block h-2 w-4 rounded-full"
        style={{
          background: dash ? "transparent" : `${color}${solid ? "" : "99"}`,
          border: `1.5px solid ${color}`,
          borderStyle: dash ? "dashed" : "solid",
        }}
      />
      {label}
    </span>
  );
}
