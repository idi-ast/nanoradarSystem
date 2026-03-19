import { memo, useMemo } from "react";
import { Source, Layer, Marker } from "react-map-gl";
import type { FilterSpecification } from "mapbox-gl";
import type { Nanoradares } from "@/features/config-devices/types/ConfigServices.type";
import { BEAM_ANIMATION, RADAR_COLORS } from "../../../config";
import {
  createArcCoords,
  createCircleCoords,
  getGeoPoint,
} from "../utils/geoHelpers";
import { buildBeamCanvas, buildBeamImageCoords } from "./beamCanvas";
import { useRadarAnimation } from "../../../hooks/useRadarAnimation";
import { DEVICES_BELOW_LAYER_ID } from "../devicesConfig";

/** Relleno del área de cobertura (círculo completo) */
const RANGE_FILL = {
  opacity: 0.07,
} as const;

/** Circunferencia exterior del círculo de cobertura (perímetro, baja opacidad) */
const RANGE_BORDER = {
  show: true,
  width: 1,
  opacity: 0.01,
} as const;

/** Líneas de límite de apertura (los dos radios que marcan el ángulo) */
const RANGE_LIMITS = {
  show: true,
  width: 1,
  opacity: 0.1,
  dasharray: [2, 6],
} as const;

/** Anillos concéntricos de distancia (círculos completos) */
const RINGS = {
  show: true,
  width: 1.5,
  opacity: 0.1, // arco fuera de la apertura
  arcOpacity: 0.65, // arco dentro de la apertura (más visible)
  dasharray: [1, 3],
} as const;

/** Línea de dirección principal (eje del grado) */
const GRADO_LINE = {
  show: true,
  width: 2,
  opacity: 0.6,
  dasharray: [4, 4],
} as const;

/** Capa de haz canvas (degradado direccional) */
const BEAM = {
  show: true,
  opacity: 1,
} as const;

/** Ondas de pulso animadas */
const PULSE = {
  show: true,
  peakOpacity: 0.24,
  peakWidth: 4,
  blur: 1,
} as const;

const NanoradarRingLabels = memo(function NanoradarRingLabels({
  ringLabels,
  colorPulse,
}: {
  ringLabels: { dist: number; lat: number; lon: number }[];
  colorPulse: string;
}) {
  return (
    <>
      {ringLabels.map(({ dist, lat: lLat, lon: lLon }) => (
        <Marker key={dist} longitude={lLon} latitude={lLat} anchor="bottom">
          <div
            className="px-1 py-px rounded text-[9px] font-mono leading-none pointer-events-none"
            style={{
              backgroundColor: `${colorPulse}18`,
              border: `1px solid ${colorPulse}44`,
            }}
          >
            {dist}m
          </div>
        </Marker>
      ))}
    </>
  );
});

const NanoradarDeviceMarker = memo(function NanoradarDeviceMarker({
  lon,
  lat,
  colorPrimary,
  nombre,
}: {
  lon: number;
  lat: number;
  colorPrimary: string;
  nombre: string;
}) {
  return (
    <>
      <Marker longitude={lon} latitude={lat} anchor="center">
        <div className="relative flex items-center justify-center">
          <span
            className="absolute w-10 h-10 rounded-full animate-ping"
            style={{ backgroundColor: `${colorPrimary}33` }}
          />
          <span
            className="absolute w-7 h-7 rounded-full"
            style={{
              backgroundColor: `${colorPrimary}1a`,
              border: `1px solid ${colorPrimary}66`,
            }}
          />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="33"
            height="33"
            fill="none"
            stroke={colorPrimary}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="relative z-10"
            style={{ filter: `drop-shadow(0 0 4px ${colorPrimary})` }}
          >
            <circle cx="12" cy="12" r="9" />
            <circle cx="12" cy="12" r="5.5" strokeOpacity="0.6" />
            <circle cx="12" cy="12" r="2" strokeOpacity="0.4" />
            <g
              style={{
                transformOrigin: "12px 12px",
                animation: "radar-spin 3s linear infinite",
              }}
            >
              <path d="M12 12 L12 3" />
              <path d="M12 12 L17.2 4.8" strokeOpacity="0.4" />
            </g>
            <circle cx="12" cy="12" r="1" fill={colorPrimary} stroke="none" />
          </svg>
          <style>{`
            @keyframes radar-spin {
              from { transform: rotate(0deg); }
              to   { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </Marker>

      <Marker longitude={lon} latitude={lat} anchor="bottom" offset={[0, -28]}>
        <div
          className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider whitespace-nowrap pointer-events-none"
          style={{
            backgroundColor: `${colorPrimary}22`,
            border: `1px solid ${colorPrimary}55`,
          }}
        >
          {nombre}
        </div>
      </Marker>
    </>
  );
});

export interface NanoradarDeviceLayerProps {
  nr: Nanoradares;
  colorPrimary: string;
  colorPulse: string;
}

export const NanoradarDeviceLayer = memo(function NanoradarDeviceLayer({
  nr,
  colorPrimary,
  colorPulse,
}: NanoradarDeviceLayerProps) {
  const sid = `dev-nr-${nr.id}`;
  const lat = Number(nr.latitud);
  const lon = Number(nr.longitud);
  const radio = nr.radio;
  const apertura = nr.apertura;
  const grado = nr.grado;

  if (!lat || !lon || isNaN(lat) || isNaN(lon) || !radio || !apertura) {
    return null;
  }

  const RING_STEP = 50;
  const ringCount = Math.floor(radio / RING_STEP);
  const startAngle = grado - apertura / 2;
  const endAngle = grado + apertura / 2;

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
        {
          type: "Feature" as const,
          geometry: {
            type: "LineString" as const,
            coordinates: createCircleCoords(lat, lon, radio),
          },
          properties: { kind: "border" },
        },
      ],
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lat, lon, grado, radio, apertura],
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
    () => buildBeamCanvas(grado, apertura, colorPrimary),
    [grado, apertura, colorPrimary],
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
      features: Array.from({ length: ringCount }, (_, i) => {
        const r = (i + 1) * RING_STEP;
        return [
          {
            type: "Feature" as const,
            geometry: {
              type: "LineString" as const,
              coordinates: createArcCoords(lat, lon, r, startAngle, endAngle),
            },
            properties: { kind: "ring-arc" },
          },
          {
            type: "Feature" as const,
            geometry: {
              type: "LineString" as const,
              coordinates: createArcCoords(
                lat,
                lon,
                r,
                endAngle,
                startAngle + 360,
              ),
            },
            properties: { kind: "ring" },
          },
        ];
      }).flat(),
    }),
    [lat, lon, ringCount, startAngle, endAngle],
  );

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const ringLabels = useMemo(
    () =>
      Array.from({ length: ringCount }, (_, i) => {
        const dist = (i + 1) * RING_STEP;
        const [lngL, latL] = getGeoPoint(lat, lon, grado, dist);
        return { dist, lat: latL, lon: lngL };
      }),
    [lat, lon, ringCount, grado],
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
            "fill-opacity": RANGE_FILL.opacity,
          }}
        />
        {RANGE_BORDER.show && (
          <Layer
            id={`${sid}-range-border`}
            type="line"
            beforeId={DEVICES_BELOW_LAYER_ID}
            filter={
              [
                "==",
                ["get", "kind"],
                "border",
              ] as unknown as FilterSpecification
            }
            paint={{
              "line-color": colorPrimary,
              "line-width": RANGE_BORDER.width,
              "line-opacity": RANGE_BORDER.opacity,
            }}
          />
        )}
        {RANGE_LIMITS.show && (
          <Layer
            id={`${sid}-range-limits`}
            type="line"
            beforeId={DEVICES_BELOW_LAYER_ID}
            filter={
              [
                "==",
                ["get", "kind"],
                "limits",
              ] as unknown as FilterSpecification
            }
            paint={{
              "line-color": colorPrimary,
              "line-width": RANGE_LIMITS.width,
              "line-opacity": RANGE_LIMITS.opacity,
              "line-dasharray": [...RANGE_LIMITS.dasharray],
            }}
          />
        )}
      </Source>

      {GRADO_LINE.show && gradoLineData && (
        <Source id={`${sid}-grado`} type="geojson" data={gradoLineData}>
          <Layer
            id={`${sid}-grado-dir`}
            type="line"
            beforeId={DEVICES_BELOW_LAYER_ID}
            paint={{
              "line-color": colorPrimary,
              "line-width": GRADO_LINE.width,
              "line-opacity": GRADO_LINE.opacity,
              "line-dasharray": [...GRADO_LINE.dasharray],
            }}
          />
        </Source>
      )}

      {RINGS.show && (
        <Source id={`${sid}-rings`} type="geojson" data={ringsData}>
          <Layer
            id={`${sid}-rings-layer`}
            type="line"
            beforeId={DEVICES_BELOW_LAYER_ID}
            filter={
              ["==", ["get", "kind"], "ring"] as unknown as FilterSpecification
            }
            paint={{
              "line-color": colorPulse,
              "line-width": RINGS.width,
              "line-dasharray": [...RINGS.dasharray],
              "line-opacity": RINGS.opacity,
            }}
          />
          <Layer
            id={`${sid}-rings-arc-layer`}
            type="line"
            beforeId={DEVICES_BELOW_LAYER_ID}
            filter={
              [
                "==",
                ["get", "kind"],
                "ring-arc",
              ] as unknown as FilterSpecification
            }
            paint={{
              "line-color": colorPulse,
              "line-width": RINGS.width,
              "line-dasharray": [...RINGS.dasharray],
              "line-opacity": RINGS.arcOpacity,
            }}
          />
        </Source>
      )}

      {BEAM.show && (
        <Source
          id={`${sid}-beam`}
          type="image"
          url={beamImageUrl}
          coordinates={beamCoords}
        >
          <Layer
            id={`${sid}-beam-layer`}
            type="raster"
            beforeId={
              RINGS.show ? `${sid}-rings-layer` : DEVICES_BELOW_LAYER_ID
            }
            paint={{
              "raster-opacity": BEAM.opacity,
              "raster-fade-duration": 0,
            }}
          />
        </Source>
      )}

      <NanoradarRingLabels ringLabels={ringLabels} colorPulse={colorPulse} />
      <NanoradarDeviceMarker
        lon={lon}
        lat={lat}
        colorPrimary={colorPrimary}
        nombre={nr.nombre}
      />
    </>
  );
});

export interface NanoradarPulseLayerProps {
  sid: string;
  lat: number;
  lon: number;
  radio: number;
  startAngle: number;
  endAngle: number;
  colorPulse: string;
}

export const NanoradarPulseLayer = memo(function NanoradarPulseLayer({
  sid,
  lat,
  lon,
  radio,
  startAngle,
  endAngle,
  colorPulse,
}: NanoradarPulseLayerProps) {
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
            opacity: PULSE.peakOpacity * (1 - shifted),
            width: PULSE.peakWidth - shifted * 0.6,
          },
        };
      }),
    }),
    [lat, lon, radio, startAngle, endAngle, phase],
  );

  if (!PULSE.show) return null;

  return (
    <Source id={`${sid}-pulse`} type="geojson" data={pulseData}>
      <Layer
        id={`${sid}-pulse-layer`}
        type="line"
        beforeId={DEVICES_BELOW_LAYER_ID}
        paint={{
          "line-color": colorPulse,
          "line-width": ["get", "width"] as unknown as number,
          "line-opacity": ["get", "opacity"] as unknown as number,
          "line-blur": PULSE.blur,
        }}
      />
    </Source>
  );
});
