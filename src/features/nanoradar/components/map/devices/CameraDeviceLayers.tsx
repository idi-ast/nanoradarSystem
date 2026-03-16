import { useMemo } from "react";
import { Source, Layer, Marker } from "react-map-gl";
import type { FilterSpecification } from "mapbox-gl";
import { IconCamera } from "@tabler/icons-react";
import type { Camaras } from "@/features/config-devices/types/ConfigServices.type";
import { getGeoPoint } from "../utils/geoHelpers";
import { buildSectorPolygon, buildArcCoords } from "./geoUtils";

const CAM_FOV_DEG = 20;  // ángulo de visión horizontal
const CAM_RANGE_M = 100; // alcance estimado en metros

export interface CameraDeviceLayersProps {
  camera: Camaras;
  fovDeg?: number;
  rangeM?: number;
}

export function CameraDeviceLayers({
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
        // Líneas laterales del cono
        {
          type: "Feature" as const,
          geometry: {
            type: "LineString" as const,
            coordinates: [[lon, lat], getGeoPoint(lat, lon, startAngle, rangeM)],
          },
          properties: { kind: "side" },
        },
        {
          type: "Feature" as const,
          geometry: {
            type: "LineString" as const,
            coordinates: [[lon, lat], getGeoPoint(lat, lon, endAngle, rangeM)],
          },
          properties: { kind: "side" },
        },
        // Línea de dirección central (punteada)
        {
          type: "Feature" as const,
          geometry: {
            type: "LineString" as const,
            coordinates: [[lon, lat], getGeoPoint(lat, lon, bearingDeg, rangeM)],
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
      <Source id={sid} type="geojson" data={fovData}>
        <Layer
          id={`${sid}-fill`}
          type="fill"
          filter={["==", ["get", "kind"], "fov"] as unknown as FilterSpecification}
          paint={{ "fill-color": color, "fill-opacity": 0.25 }}
        />
        <Layer
          id={`${sid}-sides`}
          type="line"
          filter={["==", ["get", "kind"], "side"] as unknown as FilterSpecification}
          paint={{ "line-color": color, "line-width": 1, "line-opacity": 0.7 }}
        />
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
          }}
        >
          {camera.nombre}
        </div>
      </Marker>
    </>
  );
}
