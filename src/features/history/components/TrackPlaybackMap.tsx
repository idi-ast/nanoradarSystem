import { useEffect, useMemo, useRef } from "react";
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
import type { TrackSummary } from "../types";

interface Props {
  track: TrackSummary | null;
  points: TrackHistoryPoint[];
  playbackIndex: number;
  zones: RadarZone[];
  loading: boolean;
}

const PLAYED_COLOR = "#e4ff99";
const REMAINING_COLOR = "#bbff00";

export function TrackPlaybackMap({
  track,
  points,
  playbackIndex,
  zones,
  loading,
}: Props) {
  const mapRef = useRef<MapRef>(null);

  const firstPoint = useMemo(() => points[0] ?? null, [points]);
  const currentPoint = useMemo(
    () =>
      points.length > 0
        ? points[Math.max(0, Math.min(playbackIndex, points.length - 1))]
        : null,
    [points, playbackIndex],
  );

  // Al seleccionar un track: centrar en el punto de inicio (inicio de reproducción)
  useEffect(() => {
    if (!firstPoint || !mapRef.current) return;
    mapRef.current.easeTo({
      center: [firstPoint.lon, firstPoint.lat],
      zoom: Math.max(mapRef.current.getZoom(), 15),
      duration: 400,
    });
  }, [firstPoint]);

  // Durante la reproducción: ir siguiendo el punto actual
  useEffect(() => {
    if (!currentPoint || !mapRef.current) return;
    mapRef.current.easeTo({
      center: [currentPoint.lon, currentPoint.lat],
      duration: 250,
    });
  }, [currentPoint]);

  const trailGeo = useMemo(() => {
    if (points.length < 2) return null;
    const coords = points.map((p) => [p.lon, p.lat] as [number, number]);
    const played = coords.slice(0, playbackIndex + 1);
    const remaining = coords.slice(playbackIndex);
    return {
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
  }, [points, playbackIndex]);

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

        {trailGeo && (
          <Source id="history-trail" type="geojson" data={trailGeo}>
            <Layer
              id="trail-full"
              type="line"
              paint={{
                "line-color": REMAINING_COLOR,
                "line-width": 20,
                "line-opacity": 1,
                "line-blur": 52,
              }}
            />
            <Layer
              id="trail-remaining"
              type="line"
              paint={{
                "line-color": REMAINING_COLOR,
                "line-width": 5,
                "line-opacity": 0.45,
                "line-dasharray": [2, 1.2] as unknown as number[],
              }}
            />
            <Layer
              id="trail-played"
              type="line"
              paint={{
                "line-color": PLAYED_COLOR,
                "line-width": 3,
                "line-opacity": 0.95,
              }}
            />
          </Source>
        )}

        {firstPoint && (
          <Marker
            longitude={firstPoint.lon}
            latitude={firstPoint.lat}
            anchor="center"
          >
            <div
              className="h-3 w-3 rounded-full border-2 border-white ring-2 ring-emerald-500/40"
              style={{ background: "#10b981" }}
            />
          </Marker>
        )}

        {currentPoint && (
          <Marker
            longitude={currentPoint.lon}
            latitude={currentPoint.lat}
            anchor="center"
          >
            <div
              className="h-3 w-3 rounded-full ring-4"
              style={{
                background: "white",
                boxShadow: "0 0 12px #fff",
              }}
            />
          </Marker>
        )}
      </ReactMapGL>

      {loading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-bg-100/40 backdrop-blur-[1px]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-100 border-t-transparent" />
        </div>
      )}

      {!track && !loading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <p className="text-text-100/60 text-sm">
            Selecciona un track del historial para reproducirlo
          </p>
        </div>
      )}

      {track && !loading && points.length === 0 && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <p className="text-text-100/60 text-sm">Sin puntos para este track</p>
        </div>
      )}

      <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-2">
        <LegendChip color={PLAYED_COLOR} label="Reproducido" solid />
        <LegendChip color={REMAINING_COLOR} label="Pendiente" dash />
        <LegendChip color="#10b981" label="Inicio" />
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
