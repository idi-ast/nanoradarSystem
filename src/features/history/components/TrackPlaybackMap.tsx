import { Fragment, useEffect, useMemo, useRef } from "react";
import ReactMapGL, { Marker, Source, Layer } from "react-map-gl";
import type { MapRef } from "react-map-gl";
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
  zones,
  loading,
}: Props) {
  const mapRef = useRef<MapRef>(null);

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
    const pad = 80;
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
        mapStyle={MAP_STYLES.dark}
        style={{ width: "100%", height: "100%" }}
        attributionControl={false}
        reuseMaps
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

        {tracks.map((t, i) => {
          const color = TRACK_COLORS[i % TRACK_COLORS.length];
          const id = `track-${i}-${trackKey(t.summary)}`;
          const coords = t.points.map(
            (p) => [p.lon, p.lat] as [number, number],
          );
          if (coords.length < 2) return null;
          const clamp = Math.max(0, Math.min(playbackIndex, coords.length - 1));
          const played = coords.slice(0, clamp + 1);
          const remaining = coords.slice(clamp);
          const geo = {
            type: "FeatureCollection" as const,
            features: [
              {
                type: "Feature" as const,
                geometry: {
                  type: "LineString" as const,
                  coordinates: coords,
                },
                properties: { kind: "full" },
              },
              {
                type: "Feature" as const,
                geometry: {
                  type: "LineString" as const,
                  coordinates: played,
                },
                properties: { kind: "played" },
              },
              {
                type: "Feature" as const,
                geometry: {
                  type: "LineString" as const,
                  coordinates: remaining,
                },
                properties: { kind: "remaining" },
              },
            ],
          };
          return (
            <Source key={`src-${id}`} id={`src-${id}`} type="geojson" data={geo}>
              <Layer
                id={`${id}-full`}
                type="line"
                paint={{
                  "line-color": color,
                  "line-width": 20,
                  "line-opacity": 0.22,
                  "line-blur": 52,
                }}
              />
              <Layer
                id={`${id}-remaining`}
                type="line"
                paint={{
                  "line-color": color,
                  "line-width": 5,
                  "line-opacity": 0.4,
                  "line-dasharray": [2, 1.2] as unknown as number[],
                }}
              />
              <Layer
                id={`${id}-played`}
                type="line"
                paint={{
                  "line-color": color,
                  "line-width": 3,
                  "line-opacity": 0.95,
                }}
              />
            </Source>
          );
        })}

        {tracks.map((t, i) => {
          const color = TRACK_COLORS[i % TRACK_COLORS.length];
          const first = t.points[0] ?? null;
          const cur = pointAt(t.points, playbackIndex);
          const key = `${trackKey(t.summary)}`;
          return (
            <Fragment key={`markers-${key}`}>
              {first && (
                <Marker longitude={first.lon} latitude={first.lat} anchor="center">
                  <div
                    className="h-3 w-3 rounded-full border-2 border-white"
                    style={{ background: color }}
                  />
                </Marker>
              )}
              {cur && (
                <Marker longitude={cur.lon} latitude={cur.lat} anchor="center">
                  <div
                    className="h-3 w-3 rounded-full ring-4"
                    style={{
                      background: "#ffffff",
                      boxShadow: `0 0 12px ${color}`,
                    }}
                  />
                </Marker>
              )}
            </Fragment>
          );
        })}
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
        {tracks.slice(0, 12).map((t, i) => (
          <LegendChip
            key={trackKey(t.summary)}
            color={TRACK_COLORS[i % TRACK_COLORS.length]}
            label={`${t.summary.track_id}${t.loading ? "…" : ""}`}
            solid
          />
        ))}
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