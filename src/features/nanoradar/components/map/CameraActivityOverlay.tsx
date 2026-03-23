import { memo, useEffect, useMemo, useRef } from "react";
import { Marker } from "react-map-gl";
import type { MapRef } from "react-map-gl";
import { useRadarTargets } from "../../context/useRadarContext";
import { useConfigDevices } from "@/features/config-devices/hooks/useConfigDevices";
import { useCameraActivityStore } from "../../stores/cameraActivityStore";
import type { CamaraActividad } from "../../types";
import type { Camaras } from "@/features/config-devices/types/ConfigServices.type";

const ACTIVITY_FLY_ZOOM = 20;

const EVENT_LABELS: Record<string, string> = {
  CrossLineDetection: "Cruce de línea",
  FaceDetection: "Detección facial",
  IntrusionDetection: "Intrusión",
  MotionDetection: "Movimiento",
  ParkingDetection: "Estacionamiento",
  RegionEntrance: "Ingreso a zona",
  RegionExiting: "Salida de zona",
};

const OBJECT_COLORS: Record<string, string> = {
  Vehicle: "#f59e0b",
  Human: "#06b6d4",
  Face: "#a855f7",
  Animal: "#22c55e",
};

interface CameraActivityMarkerProps {
  activity: CamaraActividad;
  camera: Camaras;
}

const CameraActivityMarker = memo(function CameraActivityMarker({
  activity,
  camera,
}: CameraActivityMarkerProps) {
  const lat = Number(camera.ubicacion.lat);
  const lon = Number(camera.ubicacion.lng);
  if (!lat || !lon || isNaN(lat) || isNaN(lon)) return null;

  const color = OBJECT_COLORS[activity.objeto_tipo] ?? "#ef4444";
  const eventLabel = EVENT_LABELS[activity.tipo_evento] ?? activity.tipo_evento;

  return (
    <Marker longitude={lon} latitude={lat} anchor="center">
      <div className="relative flex items-center justify-center pointer-events-none">
        <span
          className="absolute rounded-full animate-ping"
          style={{
            width: 56,
            height: 56,
            backgroundColor: `${color}33`,
            animationDuration: "1s",
          }}
        />
        <span
          className="absolute rounded-full animate-ping"
          style={{
            width: 40,
            height: 40,
            backgroundColor: `${color}44`,
            animationDuration: "1s",
            animationDelay: "0.3s",
          }}
        />

        <div
          className="relative z-10 flex items-center justify-center rounded-full border-2 font-bold"
          style={{
            width: 28,
            height: 28,
            backgroundColor: `${color}22`,
            borderColor: color,
            boxShadow: `0 0 12px ${color}88`,
          }}
        >
          <span className="text-[9px]" style={{ color }}>
            {activity.objeto_tipo === "Vehicle"
              ? "Auto"
              : activity.objeto_tipo === "Human"
                ? "Humano"
                : "⚠"}
          </span>
        </div>

        <div
          className="absolute bottom-full mb-2 -translate-x-1/2 flex flex-col items-center gap-0.5 z-50"
          style={{ left: "50%" }}
        >
          <div
            className="px-2 py-1 rounded-md text-[10px] font-bold whitespace-nowrap shadow-lg border backdrop-blur-sm"
            style={{
              backgroundColor: `${color}22`,
              borderColor: `${color}66`,
              color,
            }}
          >
            {eventLabel}
          </div>
          <div className="px-1.5 py-0.5 rounded text-[9px] bg-bg-100/90 border border-border whitespace-nowrap font-mono text-text-100/60">
            {camera.nombre} · {activity.objeto_tipo}
          </div>
        </div>
      </div>
    </Marker>
  );
});

export interface CameraActivityOverlayProps {
  mapRef: React.RefObject<MapRef | null>;
  defaultCenter: { longitude: number; latitude: number };
  defaultZoom: number;
}

export const CameraActivityOverlay = memo(function CameraActivityOverlay({
  mapRef,
  defaultCenter,
  defaultZoom,
}: CameraActivityOverlayProps) {
  const { cameraActivities } = useRadarTargets();
  const { data: configData } = useConfigDevices();
  const camaras = useMemo(() => configData?.data?.camaras ?? [], [configData]);
  const { isEnabled } = useCameraActivityStore();

  // Solo actividades de cámaras que tienen la opción habilitada
  const activeActivities = useMemo(
    () =>
      cameraActivities.filter((a) => {
        const cam = camaras.find((c) => c.direccionIp === a.ip);
        return cam ? isEnabled(cam.id) : false;
      }),
    [cameraActivities, camaras, isEnabled],
  );

  const lastFlownIpsRef = useRef<string>("");

  useEffect(() => {
    const ipsKey = activeActivities.map((a) => a.ip).join(",");

    // Sin actividades habilitadas → volver al centro por defecto
    if (!activeActivities.length) {
      if (lastFlownIpsRef.current === "") return;
      lastFlownIpsRef.current = "";
      mapRef.current?.flyTo({
        center: [defaultCenter.longitude, defaultCenter.latitude],
        zoom: defaultZoom,
        duration: 1800,
        essential: true,
      });
      return;
    }

    if (ipsKey === lastFlownIpsRef.current) return;
    lastFlownIpsRef.current = ipsKey;

    for (const activity of activeActivities) {
      const cam = camaras.find((c) => c.direccionIp === activity.ip);
      if (!cam) continue;
      const lat = Number(cam.ubicacion.lat);
      const lon = Number(cam.ubicacion.lng);
      if (!lat || !lon || isNaN(lat) || isNaN(lon)) continue;

      mapRef.current?.flyTo({
        center: [lon, lat],
        zoom: ACTIVITY_FLY_ZOOM,
        duration: 1800,
        essential: true,
      });
      break;
    }
  }, [activeActivities, camaras, mapRef, defaultCenter, defaultZoom]);

  if (!activeActivities.length || !camaras.length) return null;

  return (
    <>
      {activeActivities.map((activity, idx) => {
        const cam = camaras.find((c) => c.direccionIp === activity.ip);
        if (!cam) return null;
        return (
          <CameraActivityMarker
            key={`${activity.ip}-${activity.tipo_evento}-${idx}`}
            activity={activity}
            camera={cam}
          />
        );
      })}
    </>
  );
});
