import { memo, useMemo } from "react";
import { Source, Layer, Marker } from "react-map-gl";
import type { FilterSpecification } from "mapbox-gl";
import { IconCamera } from "@tabler/icons-react";
import type {
  Camaras,
  Ptz,
  PtzGeoRef,
} from "@/features/config-devices/types/ConfigServices.type";
import { getGeoPoint } from "../utils/geoHelpers";
import { buildSectorPolygon, buildArcCoords } from "./geoUtils";
import { DEVICES_BELOW_LAYER_ID } from "../devicesConfig";

const EARTH_R = 6378137; // radio de la esfera Web Mercator (EPSG:3857)

/** EPSG:3857 → lat/lon (WGS84). */
function webMercatorToLatLon(x: number, y: number): [number, number] {
  const lon = (x / EARTH_R) * (180 / Math.PI);
  const lat =
    (Math.atan(Math.exp(y / EARTH_R)) * 2 - Math.PI / 2) * (180 / Math.PI);
  return [lat, lon];
}

/** Rumbo (0-360°) desde la cámara hasta el `center` (EPSG:3857). */
function bearingFromWebMercatorCenter(
  camLat: number,
  camLon: number,
  cx: number,
  cy: number,
): number {
  const camX = (EARTH_R * camLon * Math.PI) / 180;
  const camY = EARTH_R * Math.log(Math.tan(Math.PI / 4 + (camLat * Math.PI) / 360));
  const deg = (Math.atan2(cx - camX, cy - camY) * 180) / Math.PI;
  return ((deg % 360) + 360) % 360;
}

export interface CameraDeviceLayersProps {
  camera: Camaras | Ptz;
  fovDeg?: number;
  rangeM?: number;
  /** Georeferencia de vista (formato Spotter) — fuente de verdad del apuntado */
  georef?: PtzGeoRef | null;
}

export const CameraDeviceLayers = memo(function CameraDeviceLayers({
  camera,
  fovDeg,
  rangeM,
  georef,
}: CameraDeviceLayersProps) {
  const lat = Number(camera.ubicacion?.lat);
  const lon = Number(camera.ubicacion?.lng);
  // Fuente de verdad de orientación: la georeferencia calibrada (center /
  // rotation / bearing) si está disponible; si no, `azimut` (la misma que usa
  // el backend en calibración y auto-tracking). `grado` queda solo como
  // respaldo.
  const azimutNum = Number(camera.azimut);
  const fallbackBearing = Number.isFinite(azimutNum)
    ? azimutNum
    : camera.grado ?? 0;
  const resolvedFov = fovDeg ?? camera.apertura ?? 20;
  const resolvedRange = rangeM ?? (camera.radio > 0 ? camera.radio : 100);
  const color = camera.color || "#f59e0b";
  const sid = `dev-cam-${camera.id}`;

  // Centro de visión (EPSG:3857) → lat/lon para el marcador del mapa
  const georefCenter = useMemo(() => {
    const c = georef?.center;
    if (
      Array.isArray(c) &&
      c.length >= 2 &&
      Number.isFinite(Number(c[0])) &&
      Number.isFinite(Number(c[1]))
    ) {
      return webMercatorToLatLon(Number(c[0]), Number(c[1]));
    }
    return null;
  }, [georef?.center]);

  // Dirección real donde apunta la cámara, derivada de la calibración
  const georefBearing = useMemo(() => {
    const center = georef?.center;
    if (
      Array.isArray(center) &&
      center.length >= 2 &&
      Number.isFinite(Number(center[0])) &&
      Number.isFinite(Number(center[1]))
    ) {
      return bearingFromWebMercatorCenter(
        lat,
        lon,
        Number(center[0]),
        Number(center[1]),
      );
    }
    if (georef?.rotation != null && Number.isFinite(Number(georef.rotation))) {
      const deg = (Number(georef.rotation) * 180) / Math.PI;
      return ((deg % 360) + 360) % 360;
    }
    if (georef?.bearing != null && Number.isFinite(Number(georef.bearing))) {
      return ((Number(georef.bearing) % 360) + 360) % 360;
    }
    return null;
  }, [georef, lat, lon]);

  const bearingDeg =
    georefBearing != null && Number.isFinite(georefBearing)
      ? georefBearing
      : fallbackBearing;

  const halfFov = resolvedFov / 2;
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
            coordinates: [
              buildSectorPolygon(lat, lon, startAngle, endAngle, resolvedRange),
            ],
          },
          properties: { kind: "fov" },
        },
        // Líneas laterales del cono
        {
          type: "Feature" as const,
          geometry: {
            type: "LineString" as const,
            coordinates: [
              [lon, lat],
              getGeoPoint(lat, lon, startAngle, resolvedRange),
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
              getGeoPoint(lat, lon, endAngle, resolvedRange),
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
              getGeoPoint(lat, lon, bearingDeg, resolvedRange),
            ],
          },
          properties: { kind: "center" },
        },
        // Arco de alcance
        {
          type: "Feature" as const,
          geometry: {
            type: "LineString" as const,
            coordinates: buildArcCoords(
              lat,
              lon,
              startAngle,
              endAngle,
              resolvedRange,
            ),
          },
          properties: { kind: "arc" },
        },
      ],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lon, bearingDeg, resolvedFov, resolvedRange]);

  if (!fovData) return null;

  return (
    <>
      <Source id={sid} type="geojson" data={fovData}>
        <Layer
          id={`${sid}-fill`}
          type="fill"
          beforeId={DEVICES_BELOW_LAYER_ID}
          filter={
            ["==", ["get", "kind"], "fov"] as unknown as FilterSpecification
          }
          paint={{ "fill-color": color, "fill-opacity": 0.05 }}
        />
        <Layer
          id={`${sid}-sides`}
          type="line"
          beforeId={DEVICES_BELOW_LAYER_ID}
          filter={
            ["==", ["get", "kind"], "side"] as unknown as FilterSpecification
          }
          paint={{ "line-color": color, "line-width": 1, "line-opacity": 0.1 }}
        />
        <Layer
          id={`${sid}-center`}
          type="line"
          beforeId={DEVICES_BELOW_LAYER_ID}
          filter={
            ["==", ["get", "kind"], "center"] as unknown as FilterSpecification
          }
          paint={{
            "line-color": color,
            "line-width": 2,
            "line-opacity": 0.2,
            "line-dasharray": [4, 2],
          }}
        />
        <Layer
          id={`${sid}-arc`}
          type="line"
          beforeId={DEVICES_BELOW_LAYER_ID}
          filter={
            ["==", ["get", "kind"], "arc"] as unknown as FilterSpecification
          }
          paint={{
            "line-color": color,
            "line-width": 1.5,
            "line-opacity": 1,
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
                opacity: 1,
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
                  style={{
                    backgroundColor: `${color}22`,
                    color,
                    borderColor: `${color}44`,
                  }}
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
          }}
        >
          {camera.nombre}
        </div>
      </Marker>

      {georefCenter && (
        <Marker
          longitude={georefCenter[1]}
          latitude={georefCenter[0]}
          anchor="center"
          style={{ zIndex: 20, pointerEvents: "none" }}
        >
          <div
            className="w-3.5 h-3.5 rounded-full border-2"
            style={{
              backgroundColor: `${color}cc`,
              borderColor: "#fff",
              boxShadow: `0 0 10px ${color}aa`,
            }}
            title="Centro de visión (calibración)"
          />
        </Marker>
      )}
    </>
  );
});
