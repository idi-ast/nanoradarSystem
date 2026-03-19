import { IconMaximize, IconMinimize, IconX } from "@tabler/icons-react";
import Hls from "hls.js";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Camaras } from "@/features/config-devices/types/ConfigServices.type";

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
}: {
  videoRef: (node: HTMLVideoElement | null) => void;
  compact?: boolean;
}) {
  return (
    <div className={`bg-black overflow-hidden ${compact ? "h-36" : "flex-1"}`}>
      <video
        ref={videoRef}
        controls
        muted
        playsInline
        className="w-full h-full object-contain"
      />
    </div>
  );
}

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
}: CameraProps) {
  const [mode, setMode] = useState<CameraMode>("minimized");
  const videoRef = useHlsPlayer(camera.url_stream);
  const fullscreenVideoRef = useHlsPlayer(camera.url_stream);

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

  const SLOT_HEIGHT = 328; // 320px widget + 8px gap
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
      style={maximizedStyle}
      className="z-9000 rounded-xl overflow-hidden border border-border shadow-2xl bg-bg-100 flex flex-col w-150 h-80"
    >
      <CameraToolbar
        name={camera.nombre}
        mode="maximized"
        onToggleMaximize={toggleMaximize}
        onToggleFullscreen={openFullscreen}
      />
      <CameraVideo videoRef={videoRef} />
    </div>
  );

  return (
    <>
      {mode === "minimized" && (
        <div className="w-full rounded-xl overflow-hidden border border-border shadow-xl bg-bg-100 flex flex-col">
          <CameraToolbar
            name={camera.nombre}
            mode="minimized"
            onToggleMaximize={toggleMaximize}
            onToggleFullscreen={openFullscreen}
          />
          <CameraVideo videoRef={videoRef} compact />
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
