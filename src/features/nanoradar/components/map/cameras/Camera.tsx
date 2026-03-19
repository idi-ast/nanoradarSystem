import { IconMaximize, IconMinimize, IconX } from "@tabler/icons-react";
import Hls from "hls.js";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Camaras } from "@/features/config-devices/types/ConfigServices.type";
import type { CamaraActividad } from "@/features/nanoradar/types";

export interface CameraPosition {
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
}

type CameraMode = "minimized" | "maximized" | "fullscreen";

interface CameraProps {
  camera: Camaras;
  position?: CameraPosition;
  stackIndex?: number;
  onBecomeMaximized?: () => void;
  onBecomeMinimized?: () => void;
  activity?: CamaraActividad;
}

function useHlsPlayer(streamUrl: string) {
  const hlsRef = useRef<Hls | null>(null);

  const videoRef = useCallback(
    (node: HTMLVideoElement | null) => {
      if (!node) {
        hlsRef.current?.destroy();
        hlsRef.current = null;
        return;
      }
      if (Hls.isSupported()) {
        const hls = new Hls({
          lowLatencyMode: true,
          backBufferLength: 4,
          maxBufferLength: 10,
          liveSyncDurationCount: 2,
        });
        hlsRef.current = hls;
        hls.loadSource(streamUrl);
        hls.attachMedia(node);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          node.play().catch(() => {});
        });
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal)
            console.error("[HLS] Error fatal:", data.type, data.details);
        });
      } else if (node.canPlayType("application/vnd.apple.mpegurl")) {
        node.src = streamUrl;
        node.addEventListener("loadedmetadata", () => {
          node.play().catch(() => {});
        });
      }
    },
    [streamUrl],
  );

  return videoRef;
}

function CameraToolbar({
  name,
  mode,
  onToggleMaximize,
  onToggleFullscreen,
}: {
  name: string;
  mode: CameraMode;
  onToggleMaximize: () => void;
  onToggleFullscreen: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-2 py-1 bg-bg-100/90 backdrop-blur-sm border-b border-border">
      <span className="text-[11px] font-medium text-text-100 flex-1 truncate">
        {name}
      </span>

      <button
        onClick={onToggleMaximize}
        className="flex items-center gap-1 text-[11px] text-text-100/70 hover:text-text-100 hover:bg-bg-300/60 px-1.5 py-0.5 rounded transition-colors"
      >
        {mode === "minimized" ? (
          <>
            <IconMaximize size={14} stroke={1.5} />
            <span>Maximizar</span>
          </>
        ) : (
          <>
            <IconMinimize size={14} stroke={1.5} />
            <span>Minimizar</span>
          </>
        )}
      </button>

      {mode === "maximized" && (
        <button
          onClick={onToggleFullscreen}
          className="flex items-center gap-1 text-[11px] text-text-100/70 hover:text-text-100 hover:bg-bg-300/60 px-1.5 py-0.5 rounded transition-colors"
        >
          <IconMaximize size={14} stroke={1.5} />
          <span>Pantalla completa</span>
        </button>
      )}
    </div>
  );
}

function CameraVideo({
  videoRef,
  compact,
  activity,
}: {
  videoRef: (node: HTMLVideoElement | null) => void;
  compact?: boolean;
  activity?: CamaraActividad;
}) {
  const isActive = !!activity;
  return (
    <div className={`bg-black overflow-hidden relative ${compact ? "h-36" : "flex-1"}`}>
      <video
        ref={videoRef}
        controls
        muted
        playsInline
        className="w-full h-full object-contain"
        style={{
          transform: isActive ? "scale(1.7)" : "scale(1)",
          transition: "transform 0.65s cubic-bezier(0.4, 0, 0.2, 1)",
          transformOrigin: activity ? getBBoxOrigin(activity.bbox) : "center center",
        }}
      />
      {isActive && (
        <div
          className="absolute inset-0 pointer-events-none rounded-sm animate-pulse"
          style={{ border: `2px solid ${OBJECT_GLOW[activity.objeto_tipo] ?? "#ef4444"}` }}
        />
      )}
      {isActive && (
        <div className="absolute top-1.5 left-1.5 flex gap-1 pointer-events-none">
          <span
            className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shadow-lg"
            style={{
              backgroundColor: `${OBJECT_GLOW[activity.objeto_tipo] ?? "#ef4444"}cc`,
              color: "#000",
            }}
          >
            {activity.objeto_tipo}
          </span>
          <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-black/70 text-white/80 shadow-lg">
            {EVENT_SHORT[activity.tipo_evento] ?? activity.tipo_evento}
          </span>
        </div>
      )}
    </div>
  );
}

function getBBoxOrigin(bbox: unknown): string {
  if (!Array.isArray(bbox) || bbox.length < 4) return "center center";
  const [x1, y1, x2, y2] = bbox as [number, number, number, number];
  if ([x1, y1, x2, y2].some((v) => typeof v !== "number" || isNaN(v))) return "center center";
  // Normalizamos asumiendo frame de referencia 8192×8192 (Hikvision)
  // Si los valores son ≤ 1 los tratamos como ya normalizados
  const isNormalized = x2 <= 1 && y2 <= 1;
  const cx = isNormalized ? (x1 + x2) / 2 : (x1 + x2) / 2 / 8192;
  const cy = isNormalized ? (y1 + y2) / 2 : (y1 + y2) / 2 / 8192;
  const pct = (v: number) => `${Math.min(100, Math.max(0, v * 100)).toFixed(1)}%`;
  return `${pct(cx)} ${pct(cy)}`;
}

const OBJECT_GLOW: Record<string, string> = {
  Vehicle: "#f59e0b",
  Human: "#06b6d4",
  Face: "#a855f7",
  Animal: "#22c55e",
};

const EVENT_SHORT: Record<string, string> = {
  CrossLineDetection: "Cruce",
  FaceDetection: "Cara",
  IntrusionDetection: "Intrusión",
  MotionDetection: "Movimiento",
  ParkingDetection: "Parking",
  RegionEntrance: "Entrada",
  RegionExiting: "Salida",
};

function FullscreenModal({
  name,
  videoRef,
  onClose,
}: {
  name: string;
  videoRef: (node: HTMLVideoElement | null) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-99999 bg-black flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 bg-bg-100/90 backdrop-blur-sm shrink-0">
        <span className="text-sm font-semibold text-text-100">{name}</span>
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-text-100/70 hover:text-text-100 hover:bg-bg-300/60 px-2 py-1 rounded transition-colors"
        >
          <IconX size={16} stroke={1.5} />
          <span className="text-xs">Salir (Esc)</span>
        </button>
      </div>
      <div className="flex-1 bg-black">
        <video
          ref={videoRef}
          controls
          muted
          playsInline
          autoPlay
          className="w-full h-full object-contain"
        />
      </div>
    </div>,
    document.body,
  );
}

const Camera = memo(function Camera({
  camera,
  position,
  stackIndex = 0,
  onBecomeMaximized,
  onBecomeMinimized,
  activity,
}: CameraProps) {
  const [mode, setMode] = useState<CameraMode>("minimized");
  const videoRef = useHlsPlayer(camera.url_stream);
  const fullscreenVideoRef = useHlsPlayer(camera.url_stream);
  const isActive = !!activity;
  const glowColor = OBJECT_GLOW[activity?.objeto_tipo ?? ""] ?? "#ef4444";

  function toggleMaximize() {
    if (mode === "minimized") {
      setMode("maximized");
      onBecomeMaximized?.();
    } else {
      setMode("minimized");
      onBecomeMinimized?.();
    }
  }

  function openFullscreen() {
    setMode("fullscreen");
  }

  function closeFullscreen() {
    setMode("maximized");
  }

  const SLOT_HEIGHT = 328; 
  const BASE_BOTTOM = 80;
  const maximizedStyle: React.CSSProperties = position
    ? {
        position: "fixed",
        top: position.top,
        left: position.left,
        right: position.right,
        bottom: position.bottom,
      }
    : {
        position: "fixed",
        bottom: `${BASE_BOTTOM + stackIndex * SLOT_HEIGHT}px`,
        left: "3.1%",
      };

  const maximizedWidget = (
    <div
      style={{
        ...maximizedStyle,
        boxShadow: isActive ? `0 0 24px 4px ${glowColor}66` : undefined,
        border: isActive ? `1.5px solid ${glowColor}99` : undefined,
      }}
      className="z-9000 rounded-xl overflow-hidden border border-border shadow-2xl bg-bg-100 flex flex-col w-150 h-80"
    >
      <CameraToolbar
        name={camera.nombre}
        mode="maximized"
        onToggleMaximize={toggleMaximize}
        onToggleFullscreen={openFullscreen}
      />
      <CameraVideo videoRef={videoRef} activity={activity} />
    </div>
  );

  return (
    <>
      {mode === "minimized" && (
        <div
          className="w-full rounded-xl overflow-hidden border shadow-xl bg-bg-100 flex flex-col transition-all duration-500"
          style={{
            borderColor: isActive ? `${glowColor}99` : undefined,
            boxShadow: isActive ? `0 0 16px 2px ${glowColor}44` : undefined,
          }}
        >
          <CameraToolbar
            name={camera.nombre}
            mode="minimized"
            onToggleMaximize={toggleMaximize}
            onToggleFullscreen={openFullscreen}
          />
          <CameraVideo videoRef={videoRef} compact activity={activity} />
        </div>
      )}

      {mode === "maximized" && createPortal(maximizedWidget, document.body)}

      {mode === "fullscreen" && (
        <FullscreenModal
          name={camera.nombre}
          videoRef={fullscreenVideoRef}
          onClose={closeFullscreen}
        />
      )}
    </>
  );
});

export default Camera;
