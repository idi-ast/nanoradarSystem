import { memo, useMemo } from "react";
import { Source, Layer, Marker } from "react-map-gl";
import type { FilterSpecification } from "mapbox-gl";
import { IconCurrentLocation } from "@tabler/icons-react";
import type { Spotters } from "@/features/config-devices/types/ConfigServices.type";
import { BEAM_ANIMATION, RADAR_COLORS } from "../../../config";
import { createArcCoords, createSectorCoords, getGeoPoint } from "../utils/geoHelpers";
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
            <IconCurrentLocation
              size={22}
              style={{ color }}
              strokeWidth={1.5}
            />
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

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const rangeData = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          geometry: {
            type: "Polygon" as const,
            coordinates: [createSectorCoords(lat, lon, radio, startAngle, endAngle)],
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

  // Línea de dirección: indica hacia dónde apunta el dispositivo (grado)
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const gradoLineData = useMemo(() => {
    if (!grado && grado !== 0) return null;
    return {
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          geometry: {
            type: "LineString" as const,
            coordinates: [[lon, lat], getGeoPoint(lat, lon, grado, radio)],
          },
          properties: {},
        },
      ],
    };
  }, [lat, lon, radio, grado]);

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
          coordinates: createArcCoords(lat, lon, (i + 1) * RING_STEP, startAngle, endAngle),
        },
        properties: {},
      })),
    }),
    [lat, lon, ringCount, startAngle, endAngle],
  );

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const ringLabels = useMemo(
    () =>
      Array.from({ length: ringCount }, (_, i) => {
        const dist = (i + 1) * RING_STEP;
        const [lngL, latL] = getGeoPoint(lat, lon, azimut, dist);
        return { dist, lat: latL, lon: lngL };
      }),
    [lat, lon, ringCount, azimut],
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
            "line-opacity": 0.18,
            "line-dasharray": [2, 7],
          }}
        />
      </Source>

      {gradoLineData && (
        <Source id={`${sid}-grado`} type="geojson" data={gradoLineData}>
          <Layer
            id={`${sid}-grado-dir`}
            type="line"
            beforeId={DEVICES_BELOW_LAYER_ID}
            paint={{
              "line-color": color,
              "line-width": 2,
              "line-opacity": 0.7,
              "line-dasharray": [1],
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
  startAngle: number;
  endAngle: number;
  color: string;
}

export const SpotterPulseLayer = memo(function SpotterPulseLayer({
  sid,
  lat,
  lon,
  radio,
  startAngle,
  endAngle,
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
            coordinates: createArcCoords(
              lat,
              lon,
              r,
              startAngle,
              endAngle,
              BEAM_ANIMATION.WAVE_STEPS,
            ),
          },
          properties: {
            opacity: 0.24 * (1 - shifted),
            width: 4 - shifted * 0.6,
          },
        };
      }),
    }),
    [lat, lon, radio, startAngle, endAngle, phase],
  );

  return (
    <Source id={`${sid}-pulse`} type="geojson" data={pulseData}>
      <Layer
        id={`${sid}-pulse-layer`}
        type="line"
        beforeId={DEVICES_BELOW_LAYER_ID}
        paint={{
          "line-color": color,
          "line-width": ["get", "width"] as unknown as number,
          "line-opacity": ["get", "opacity"] as unknown as number,
          "line-blur": 1,
        }}
      />
    </Source>
  );
});
