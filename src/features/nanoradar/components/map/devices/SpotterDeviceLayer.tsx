import { memo, useMemo } from "react";
import { Source, Layer, Marker } from "react-map-gl";
import type { FilterSpecification } from "mapbox-gl";
import { IconCurrentLocation } from "@tabler/icons-react";
import type { Spotters } from "@/features/config-devices/types/ConfigServices.type";
import { BEAM_ANIMATION, RADAR_COLORS } from "../../../config";
import { createCircleCoords, getGeoPoint } from "../utils/geoHelpers";
import { buildSectorPolygon } from "./geoUtils";
import { buildBeamCanvas, buildBeamImageCoords } from "./beamCanvas";
import { useRadarAnimation } from "../../../hooks/useRadarAnimation";
import { DEVICES_BELOW_LAYER_ID } from "../devicesConfig";

const SpotterRingLabels = memo(function SpotterRingLabels({
  ringLabels,
  color,
}: {
  ringLabels: { dist: number; lat: number; lon: number }[];
  color: string;
}) {
  return (
    <>
      {ringLabels.map(({ dist, lat: lLat, lon: lLon }) => (
        <Marker key={dist} longitude={lLon} latitude={lLat} anchor="bottom">
          <div
            className="px-1 py-px rounded text-[9px] font-mono leading-none pointer-events-none"
            style={{
              backgroundColor: `${color}18`,
              border: `1px solid ${color}44`,
            }}
          >
            {dist}m
          </div>
        </Marker>
      ))}
    </>
  );
});

const SpotterDeviceMarker = memo(function SpotterDeviceMarker({
  lon,
  lat,
  color,
  nombre,
}: {
  lon: number;
  lat: number;
  color: string;
  nombre: string;
}) {
  return (
    <>
      <Marker longitude={lon} latitude={lat} anchor="center">
        <div className="relative flex items-center justify-center">
          <span
            className="absolute w-10 h-10 rounded-full animate-ping"
            style={{ backgroundColor: `${color}33` }}
          />
          <span
            className="absolute w-7 h-7 rounded-full"
            style={{
              backgroundColor: `${color}1a`,
              border: `1px solid ${color}66`,
            }}
          />
          <div
            className="relative z-10 w-8 h-8 flex items-center justify-center"
            style={{ filter: `drop-shadow(0 0 4px ${color})` }}
          >
            <IconCurrentLocation size={22} style={{ color }} strokeWidth={1.5} />
          </div>
        </div>
      </Marker>

      <Marker longitude={lon} latitude={lat} anchor="bottom" offset={[0, -28]}>
        <div
          className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider whitespace-nowrap pointer-events-none"
          style={{
            backgroundColor: `${color}22`,
            border: `2px solid ${color}55`,
          }}
        >
          {nombre}
        </div>
      </Marker>
    </>
  );
});

export interface SpotterDeviceLayerProps {
  spotter: Spotters;
}

export const SpotterDeviceLayer = memo(function SpotterDeviceLayer({
  spotter,
}: SpotterDeviceLayerProps) {
  const sid = `dev-sp-${spotter.id}`;
  const lat = Number(spotter.latitude);
  const lon = Number(spotter.longitude);
  const azimut = Number(spotter.azimut);
  const radio = spotter.radio;
  const apertura = spotter.apertura;
  const grado = spotter.grado;
  const color = spotter.color || "#a855f7";

  if (!lat || !lon || isNaN(lat) || isNaN(lon) || !radio || !apertura) {
    return null;
  }

  const RING_STEP = 50; 
  const ringCount = Math.floor(radio / RING_STEP);
  const startAngle = azimut - apertura / 2;
  const endAngle = azimut + apertura / 2;
  const gradoStart = azimut - grado / 2;
  const gradoEnd = azimut + grado / 2;

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const rangeData = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          geometry: {
            type: "Polygon" as const,
            coordinates: [createCircleCoords(lat, lon, radio)],
          },
          properties: { kind: "range" },
        },
        {
          type: "Feature" as const,
          geometry: {
            type: "LineString" as const,
            coordinates: [
              [lon, lat],
              getGeoPoint(lat, lon, startAngle, radio),
              [lon, lat],
              getGeoPoint(lat, lon, endAngle, radio),
            ],
          },
          properties: { kind: "limits" },
        },
      ],
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lat, lon, azimut, radio, apertura],
  );

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const gradoData = useMemo(() => {
    if (!grado) return null;
    return {
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          geometry: {
            type: "Polygon" as const,
            coordinates: [
              buildSectorPolygon(lat, lon, gradoStart, gradoEnd, radio),
            ],
          },
          properties: { kind: "grado-fill" },
        },
        {
          type: "Feature" as const,
          geometry: {
            type: "LineString" as const,
            coordinates: [
              [lon, lat],
              getGeoPoint(lat, lon, gradoStart, radio),
              [lon, lat],
              getGeoPoint(lat, lon, gradoEnd, radio),
            ],
          },
          properties: { kind: "grado-limits" },
        },
      ],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lon, azimut, radio, grado]);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const beamImageUrl = useMemo(
    () => buildBeamCanvas(azimut, apertura, color),
    [azimut, apertura, color],
  );

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const beamCoords = useMemo(
    () => buildBeamImageCoords(lat, lon, radio),
    [lat, lon, radio],
  );

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const ringsData = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: Array.from({ length: ringCount }, (_, i) => ({
        type: "Feature" as const,
        geometry: {
          type: "LineString" as const,
          coordinates: createCircleCoords(lat, lon, (i + 1) * RING_STEP),
        },
        properties: {},
      })),
    }),
    [lat, lon, ringCount],
  );

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const ringLabels = useMemo(
    () =>
      Array.from({ length: ringCount }, (_, i) => {
        const dist = (i + 1) * RING_STEP;
        const [lngL, latL] = getGeoPoint(lat, lon, 0, dist);
        return { dist, lat: latL, lon: lngL };
      }),
    [lat, lon, ringCount],
  );

  return (
    <>
      <Source id={`${sid}-range`} type="geojson" data={rangeData}>
        <Layer
          id={`${sid}-range-fill`}
          type="fill"
          beforeId={DEVICES_BELOW_LAYER_ID}
          filter={
            ["==", ["get", "kind"], "range"] as unknown as FilterSpecification
          }
          paint={{
            "fill-color": RADAR_COLORS.rangeFill,
            "fill-opacity": RADAR_COLORS.rangeFillOpacity,
          }}
        />
        <Layer
          id={`${sid}-range-limits`}
          type="line"
          beforeId={DEVICES_BELOW_LAYER_ID}
          filter={
            ["==", ["get", "kind"], "limits"] as unknown as FilterSpecification
          }
          paint={{
            "line-color": color,
            "line-width": 2,
            "line-opacity": 0.48,
            "line-dasharray": [2, 6],
          }}
        />
      </Source>

      {gradoData && (
        <Source id={`${sid}-grado`} type="geojson" data={gradoData}>
          <Layer
            id={`${sid}-grado-fill`}
            type="fill"
            beforeId={DEVICES_BELOW_LAYER_ID}
            filter={
              [
                "==",
                ["get", "kind"],
                "grado-fill",
              ] as unknown as FilterSpecification
            }
            paint={{ "fill-color": color, "fill-opacity": 0.04 }}
          />
          <Layer
            id={`${sid}-grado-limits`}
            type="line"
            beforeId={DEVICES_BELOW_LAYER_ID}
            filter={
              [
                "==",
                ["get", "kind"],
                "grado-limits",
              ] as unknown as FilterSpecification
            }
            paint={{
              "line-color": color,
              "line-width": 2,
              "line-opacity": 0.4,
              "line-dasharray": [4, 8],
            }}
          />
        </Source>
      )}

      <Source id={`${sid}-rings`} type="geojson" data={ringsData}>
        <Layer
          id={`${sid}-rings-layer`}
          type="line"
          beforeId={DEVICES_BELOW_LAYER_ID}
          paint={{
            "line-color": color,
            "line-width": 2,
            "line-dasharray": [1, 2],
            "line-opacity": 0.6,
          }}
        />
      </Source>

      <Source
        id={`${sid}-beam`}
        type="image"
        url={beamImageUrl}
        coordinates={beamCoords}
      >
        <Layer
          id={`${sid}-beam-layer`}
          type="raster"
          beforeId={`${sid}-rings-layer`}
          paint={{ "raster-opacity": 1, "raster-fade-duration": 0 }}
        />
      </Source>

      <SpotterRingLabels ringLabels={ringLabels} color={color} />
      <SpotterDeviceMarker
        lon={lon}
        lat={lat}
        color={color}
        nombre={spotter.nombre}
      />
    </>
  );
});

export interface SpotterPulseLayerProps {
  sid: string;
  lat: number;
  lon: number;
  radio: number;
  color: string;
}

export const SpotterPulseLayer = memo(function SpotterPulseLayer({
  sid,
  lat,
  lon,
  radio,
  color,
}: SpotterPulseLayerProps) {
  const phase = useRadarAnimation();
  const pulseData = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: Array.from({ length: BEAM_ANIMATION.WAVE_COUNT }, (_, i) => {
        const shifted = (phase + i / BEAM_ANIMATION.WAVE_COUNT) % 1;
        const r = Math.max(1, shifted * radio);
        return {
          type: "Feature" as const,
          geometry: {
            type: "LineString" as const,
            coordinates: createCircleCoords(lat, lon, r, BEAM_ANIMATION.WAVE_STEPS),
          },
          properties: {
            opacity: 0.64 * (1 - shifted),
            width: 4 - shifted * 0.6,
          },
        };
      }),
    }),
    [lat, lon, radio, phase],
  );

  return (
    <Source id={`${sid}-pulse`} type="geojson" data={pulseData}>
      {/* <Layer
        id={`${sid}-pulse-layer`}
        type="line"
        beforeId={DEVICES_BELOW_LAYER_ID}
        paint={{
          "line-color": color,
          "line-width": ["get", "width"] as unknown as number,
          "line-opacity": ["get", "opacity"] as unknown as number,
          "line-blur": 1,
        }}
      /> */}
    </Source>
  );
});
