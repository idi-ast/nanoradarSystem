/**
 * DevicesOverlay
 *
 * Renderiza todos los dispositivos del sistema sobre el mapa Mapbox:
 *  - Nanoradares  → beam sectorial + anillos concéntricos + pulso animado
 *  - Spotters     → marcador con indicador de bearing
 *  - Cámaras      → ícono de cámara con tooltip (sin stream; la cámara activa
 *                   tiene su propio panel)
 *
 * Fuente de datos: GET /configuracion-general  (useConfigDevices)
 */

import { useState, useEffect, useRef, useMemo } from "react";
import { Source, Layer, Marker } from "react-map-gl";
import type { FilterSpecification } from "mapbox-gl";
import { IconCamera, IconCurrentLocation } from "@tabler/icons-react";
import { useConfigDevices } from "@/features/config-devices/hooks/useConfigDevices";
import type {
  Nanoradares,
  Spotters,
  Camaras,
} from "@/features/config-devices/types/ConfigServices.type";
import { BEAM_ANIMATION, RADAR_COLORS } from "../../config";
import { createCircleCoords, getGeoPoint } from "./utils/geoHelpers";
import { NR_PALETTE, ALL_VISIBLE } from "./devicesConfig";


export interface DeviceVisibility {
  hiddenNanoradares: Set<number>;
  hiddenSpotters: Set<number>;
  hiddenCamaras: Set<number>;
}


function buildSectorPolygon(
  lat: number,
  lon: number,
  startAngle: number,
  endAngle: number,
  radius: number,
  step = 0.5,
): [number, number][] {
  const coords: [number, number][] = [[lon, lat]];
  for (let a = startAngle; a <= endAngle; a += step) {
    coords.push(getGeoPoint(lat, lon, a, radius));
  }
  coords.push([lon, lat]);
  return coords;
}


interface NRLayerProps {
  nr: Nanoradares;
  phase: number;
  colorPrimary: string;
  colorPulse: string;
}

function NanoradarDeviceLayer({
  nr,
  phase,
  colorPrimary,
  colorPulse,
}: NRLayerProps) {
  const sid = `dev-nr-${nr.id}`;
  const lat = Number(nr.latitud);
  const lon = Number(nr.longitud);
  const azimut = Number(nr.azimut);
  const radio = nr.radio;
  const apertura = nr.apertura;

  if (!lat || !lon || isNaN(lat) || isNaN(lon) || !radio || !apertura) {
    return null;
  }

  const ringCount = Math.floor(radio / 100);
  const aperturaGrados =
    2 * Math.atan(apertura / 2 / radio) * (180 / Math.PI);
  const startAngle = azimut - aperturaGrados / 2;
  const endAngle = azimut + aperturaGrados / 2;

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
  const beamData = useMemo(() => {
    const steps = 6;
    const fillFeatures = Array.from({ length: steps }, (_, i) => ({
      type: "Feature" as const,
      geometry: {
        type: "Polygon" as const,
        coordinates: [
          buildSectorPolygon(
            lat,
            lon,
            startAngle,
            endAngle,
            radio - (radio / steps) * i,
          ),
        ],
      },
      properties: { kind: "gradient", opacity: 0.2 - i * (0.1 / steps) },
    }));
    return {
      type: "FeatureCollection" as const,
      features: [
        ...fillFeatures,
        {
          type: "Feature" as const,
          geometry: {
            type: "Polygon" as const,
            coordinates: [buildSectorPolygon(lat, lon, startAngle, endAngle, radio)],
          },
          properties: { kind: "line" },
        },
      ],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lon, azimut, radio, apertura]);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const ringsData = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: Array.from({ length: ringCount }, (_, i) => ({
        type: "Feature" as const,
        geometry: {
          type: "LineString" as const,
          coordinates: createCircleCoords(lat, lon, (i + 1) * 100),
        },
        properties: {},
      })),
    }),
    [lat, lon, ringCount],
  );

  // eslint-disable-next-line react-hooks/rules-of-hooks
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
    <>
      <Source id={`${sid}-range`} type="geojson" data={rangeData}>
        <Layer
          id={`${sid}-range-fill`}
          type="fill"
          filter={["==", ["get", "kind"], "range"] as unknown as FilterSpecification}
          paint={{
            "fill-color": RADAR_COLORS.rangeFill,
            "fill-opacity": RADAR_COLORS.rangeFillOpacity,
          }}
        />
        <Layer
          id={`${sid}-range-limits`}
          type="line"
          filter={["==", ["get", "kind"], "limits"] as unknown as FilterSpecification}
          paint={{
            "line-color": colorPrimary,
            "line-width": 1,
            "line-opacity": 0.48,
            "line-dasharray": [2, 6],
          }}
        />
      </Source>

      <Source id={`${sid}-beam`} type="geojson" data={beamData}>
        <Layer
          id={`${sid}-beam-fill`}
          type="fill"
          filter={["==", ["get", "kind"], "gradient"] as unknown as FilterSpecification}
          paint={{
            "fill-color": colorPrimary,
            "fill-opacity": ["get", "opacity"] as unknown as number,
          }}
        />
        <Layer
          id={`${sid}-beam-line`}
          type="line"
          filter={["==", ["get", "kind"], "line"] as unknown as FilterSpecification}
          paint={{
            "line-color": colorPrimary,
            "line-width": 2,
            "line-opacity": 0.92,
          }}
        />
      </Source>

      <Source id={`${sid}-rings`} type="geojson" data={ringsData}>
        <Layer
          id={`${sid}-rings-layer`}
          type="line"
          paint={{
            "line-color": colorPulse,
            "line-width": 2,
            "line-dasharray": [1, 2],
            "line-opacity": 1,
          }}
        />
      </Source>

      <Source id={`${sid}-pulse`} type="geojson" data={pulseData}>
        <Layer
          id={`${sid}-pulse-layer`}
          type="line"
          paint={{
            "line-color": colorPulse,
            "line-width": ["get", "width"] as unknown as number,
            "line-opacity": ["get", "opacity"] as unknown as number,
            "line-blur": 1,
          }}
        />
      </Source>

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
            color: colorPrimary,
          }}
        >
          {nr.nombre}
        </div>
      </Marker>
    </>
  );
}


function SpotterDeviceMarker({ spotter }: { spotter: Spotters }) {
  const bearing = Number(spotter.bearing) || 0;
  return (
    <Marker
      longitude={Number(spotter.longitude)}
      latitude={Number(spotter.latitude)}
      anchor="center"
    >
      <div className="relative flex items-center justify-center w-12 h-12 group cursor-pointer">
        <div
          className="absolute inset-0 flex items-start justify-center pt-0.5"
          style={{ transform: `rotate(${bearing}deg)` }}
        >
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: "5px solid transparent",
              borderRight: "5px solid transparent",
              borderBottom: "14px solid #38bdf8",
            }}
          />
        </div>

        <div className="relative z-10 w-7 h-7 rounded-full bg-sky-500/20 border-2 border-sky-400/70 flex items-center justify-center">
          <IconCurrentLocation size={13} className="text-sky-300" />
        </div>

        <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center gap-0.5 z-50">
          <div className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-900/90 text-sky-200 border border-sky-500/50 whitespace-nowrap">
            {spotter.nombre}
          </div>
          <div className="px-1.5 py-0.5 rounded text-[9px] bg-sky-900/70 text-sky-400/80 border border-sky-600/30 whitespace-nowrap">
            {bearing.toFixed(1)}° · {spotter.model}
          </div>
        </div>
      </div>
    </Marker>
  );
}



const CAM_FOV_DEG = 20;  // ángulo de visión horizontal
const CAM_RANGE_M = 100; // alcance estimado en metros

function buildArcCoords(
  lat: number,
  lon: number,
  startAngle: number,
  endAngle: number,
  radius: number,
  step = 1,
): [number, number][] {
  const coords: [number, number][] = [];
  for (let a = startAngle; a <= endAngle; a += step) {
    coords.push(getGeoPoint(lat, lon, a, radius));
  }
  return coords;
}

interface CameraDeviceLayersProps {
  camera: Camaras;
  fovDeg?: number;
  rangeM?: number;
}

function CameraDeviceLayers({
  camera,
  fovDeg = CAM_FOV_DEG,
  rangeM = CAM_RANGE_M,
}: CameraDeviceLayersProps) {
  const lat = Number(camera.ubicacion?.lat);
  const lon = Number(camera.ubicacion?.lng);
  const bearingDeg = Number(camera.azimut) || 0;
  const color = camera.color || "#f59e0b";
  const sid = `dev-cam-${camera.id}`;

  const halfFov = fovDeg / 2;
  const startAngle = bearingDeg - halfFov;
  const endAngle = bearingDeg + halfFov;

  const fovData = useMemo(() => {
    if (!lat || !lon || isNaN(lat) || isNaN(lon)) return null;
    return {
      type: "FeatureCollection" as const,
      features: [
        // Sector de cobertura
        {
          type: "Feature" as const,
          geometry: {
            type: "Polygon" as const,
            coordinates: [buildSectorPolygon(lat, lon, startAngle, endAngle, rangeM)],
          },
          properties: { kind: "fov" },
        },
        // Líneas laterales del cono (desde el centro al borde)
        {
          type: "Feature" as const,
          geometry: {
            type: "LineString" as const,
            coordinates: [
              [lon, lat],
              getGeoPoint(lat, lon, startAngle, rangeM),
            ],
          },
          properties: { kind: "side" },
        },
        {
          type: "Feature" as const,
          geometry: {
            type: "LineString" as const,
            coordinates: [
              [lon, lat],
              getGeoPoint(lat, lon, endAngle, rangeM),
            ],
          },
          properties: { kind: "side" },
        },
        // Línea de dirección central (punteada)
        {
          type: "Feature" as const,
          geometry: {
            type: "LineString" as const,
            coordinates: [
              [lon, lat],
              getGeoPoint(lat, lon, bearingDeg, rangeM),
            ],
          },
          properties: { kind: "center" },
        },
        // Arco de alcance
        {
          type: "Feature" as const,
          geometry: {
            type: "LineString" as const,
            coordinates: buildArcCoords(lat, lon, startAngle, endAngle, rangeM),
          },
          properties: { kind: "arc" },
        },
      ],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lon, bearingDeg, fovDeg, rangeM]);

  if (!fovData) return null;

  return (
    <>
      {/* Capas FOV en Mapbox GL */}
      <Source id={sid} type="geojson" data={fovData}>
        {/* Relleno del sector */}
        <Layer
          id={`${sid}-fill`}
          type="fill"
          filter={["==", ["get", "kind"], "fov"] as unknown as FilterSpecification}
          paint={{
            "fill-color": color,
            "fill-opacity": 0.25,
          }}
        />
        {/* Líneas laterales del cono */}
        <Layer
          id={`${sid}-sides`}
          type="line"
          filter={["==", ["get", "kind"], "side"] as unknown as FilterSpecification}
          paint={{
            "line-color": color,
            "line-width": 1,
            "line-opacity": 0.7,
          }}
        />
        {/* Línea central de dirección */}
        <Layer
          id={`${sid}-center`}
          type="line"
          filter={["==", ["get", "kind"], "center"] as unknown as FilterSpecification}
          paint={{
            "line-color": color,
            "line-width": 2,
            "line-opacity": 1,
            "line-dasharray": [4, 4],
          }}
        />
        {/* Arco de alcance */}
        <Layer
          id={`${sid}-arc`}
          type="line"
          filter={["==", ["get", "kind"], "arc"] as unknown as FilterSpecification}
          paint={{
            "line-color": color,
            "line-width": 1.5,
            "line-opacity": 0.6,
            "line-dasharray": [2, 3],
          }}
        />
      </Source>

      <Marker longitude={lon} latitude={lat} anchor="center">
        <div className="relative group cursor-pointer flex items-center justify-center">

          <div
            className="absolute w-10 h-10 flex items-start justify-center"
            style={{ transform: `rotate(${bearingDeg}deg)` }}
          >
            <div
              style={{
                width: 0,
                height: 0,
                borderLeft: "4px solid transparent",
                borderRight: "4px solid transparent",
                borderBottom: `11px solid ${color}`,
                opacity: 0.8,
              }}
            />
          </div>
          <div
            className="relative z-10 w-8 h-8 rounded-full flex items-center justify-center hover:opacity-80 transition-opacity border-2"
            style={{ backgroundColor: `${color}33`, borderColor: `${color}99` }}
          >
            <IconCamera size={15} style={{ color }} />
          </div>

          <div className="absolute bottom-full mb-2 left-1/3 -translate-x-1/2 hidden group-hover:flex flex-col items-center gap-0.5 z-50 pointer-events-none">
            <div
              className="px-2 py-1 rounded-md text-[10px] font-bold bg-bg-100/95 border whitespace-nowrap shadow-lg"
              style={{ color, borderColor: `${color}66` }}
            >
              {camera.nombre}
            </div>
            <div className="flex gap-1">
              {camera.tipo && (
                <span
                  className="px-1.5 py-0.5 rounded text-[9px] border whitespace-nowrap"
                  style={{ backgroundColor: `${color}22`, color, borderColor: `${color}44` }}
                >
                  {camera.tipo}
                </span>
              )}
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-bg-100/80 text-text-100/40 border border-border whitespace-nowrap">
                {bearingDeg.toFixed(1)}° · {rangeM}m
              </span>
            </div>
          </div>
        </div>
      </Marker>

      <Marker longitude={lon} latitude={lat} anchor="bottom" offset={[0, 46]}>
        <div
          className="px-2 py-0.5 rounded text-[9px] font-semibold tracking-wider whitespace-nowrap pointer-events-none"
          style={{
            backgroundColor: `${color}22`,
            border: `1px solid ${color}44`,
            color,
          }}
        >
          {camera.nombre}
        </div>
      </Marker>
    </>
  );
}


export function DevicesOverlay({
  visibility = ALL_VISIBLE,
}: {
  visibility?: DeviceVisibility;
}) {
  const { data } = useConfigDevices();
  const [phase, setPhase] = useState(0);
  const rafIdRef = useRef<number | null>(null);
  const lastFrameRef = useRef(0);
  const frameIntervalMs = 1000 / BEAM_ANIMATION.TARGET_FPS;

  useEffect(() => {
    const animate = (now: number) => {
      if (now - lastFrameRef.current >= frameIntervalMs) {
        setPhase((now % BEAM_ANIMATION.PULSE_CYCLE_MS) / BEAM_ANIMATION.PULSE_CYCLE_MS);
        lastFrameRef.current = now;
      }
      rafIdRef.current = window.requestAnimationFrame(animate);
    };
    rafIdRef.current = window.requestAnimationFrame(animate);
    return () => {
      if (rafIdRef.current !== null) window.cancelAnimationFrame(rafIdRef.current);
    };
  }, [frameIntervalMs]);

  if (!data?.data) return null;

  const { nanoradares, spotters, camaras } = data.data;

  return (
    <>
      {nanoradares
        .filter((nr) => !visibility.hiddenNanoradares.has(nr.id))
        .map((nr, idx) => {
          const palette = NR_PALETTE[idx % NR_PALETTE.length];
          const colorPrimary = nr.color || palette.primary;
          const colorPulse = nr.color || palette.pulse;
          return (
            <NanoradarDeviceLayer
              key={nr.id}
              nr={nr}
              phase={phase}
              colorPrimary={colorPrimary}
              colorPulse={colorPulse}
            />
          );
        })}

      {spotters
        .filter((s) => !visibility.hiddenSpotters.has(s.id))
        .map((s) => (
          <SpotterDeviceMarker key={s.id} spotter={s} />
        ))}

      {camaras
        .filter((c) => !visibility.hiddenCamaras.has(c.id))
        .map((c) => (
          <CameraDeviceLayers key={c.id} camera={c} />
        ))}
    </>
  );
}
