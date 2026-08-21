import { memo, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useWebRtcPlayer, getWhepBaseUrl } from "./hooks/useWebRtcPlayer";
import { PtzToolbar } from "./components/PtzToolbar";
import { PtzVideo } from "./components/PtzVideo";
import { PtzFullscreenModal } from "./components/PtzFullscreenModal";
import { VisionConfigPanel } from "./components/VisionConfigPanel";
import { useVisionDetection } from "@/features/devices/hooks/useVisionDetection";
import type { PtzCameraProps, CameraMode } from "./types";

const SLOT_HEIGHT = 360;
const BASE_TOP = 100;
/** Tiempo de gracia mientras el worker IA publica el stream (carga de modelo). */
const VISION_GRACE_MS = 12000;

const PtzCamera = memo(
  function PtzCamera({
    camera,
    position,
    stackIndex = 0,
    onBecomeMaximized,
    onBecomeMinimized,
    onClose,
  }: PtzCameraProps) {
    const [mode, setMode] = useState<CameraMode>("maximized");
    const {
      visionOn,
      starting: visionStarting,
      config: visionConfig,
      toggleVision,
      applyConfig,
    } = useVisionDetection(camera.id);
    const [visionGrace, setVisionGrace] = useState(false);
    const [visionConfigOpen, setVisionConfigOpen] = useState(false);
    /** Incrementa al aplicar config: reinicia la ventana de gracia */
    const [visionSession, setVisionSession] = useState(0);

    // Stream IA: /streams/ptz_{id}/ -> /streams/ptz_{id}_ai/
    const aiStreamUrl = camera.url_stream.replace(
      /^(.*ptz_\d+)(\/?)$/,
      "$1_ai$2",
    );
    const streamUrl = getWhepBaseUrl(visionOn ? aiStreamUrl : camera.url_stream);
    const { videoRef, streamRef, connectionError, retry } =
      useWebRtcPlayer(streamUrl);

    // Durante la publicación inicial del stream IA, reintentar la conexión
    // automáticamente hasta que MediaMTX tenga el path disponible.
    const connErrRef = useRef<string | null>(null);
    connErrRef.current = connectionError;
    useEffect(() => {
      if (!visionOn) {
        setVisionGrace(false);
        return;
      }
      setVisionGrace(true);
      const graceTimer = setTimeout(() => setVisionGrace(false), VISION_GRACE_MS);
      const retryTimer = setInterval(() => {
        if (connErrRef.current) retry();
      }, 2500);
      return () => {
        clearTimeout(graceTimer);
        clearInterval(retryTimer);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visionOn, visionSession]);

    function handleToggleVision() {
      void toggleVision();
    }

    async function handleApplyVisionConfig(config: Parameters<
      typeof applyConfig
    >[0]) {
      const ok = await applyConfig(config);
      if (ok && visionOn) setVisionSession((n) => n + 1);
      return ok;
    }

  function toggleMaximize() {
    if (mode === "minimized") {
      setMode("maximized");
      onBecomeMaximized?.();
    } else {
      setMode("minimized");
      onBecomeMinimized?.();
    }
  }

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
          top: `${BASE_TOP + stackIndex * SLOT_HEIGHT}px`,
          left: "3.1%",
        };

    return (
      <>
        {mode === "minimized" && (
          <div className="w-full rounded-xl  border border-border shadow-xl bg-bg-100 flex flex-col transition-all duration-500">
            <PtzToolbar
              name={camera.nombre}
              mode="minimized"
              onToggleMaximize={toggleMaximize}
              onToggleFullscreen={() => setMode("fullscreen")}
              onHide={onClose}
              visionOn={visionOn}
              visionStarting={visionStarting}
              onToggleVision={handleToggleVision}
              onOpenVisionConfig={() => setVisionConfigOpen(true)}
            />
            <PtzVideo
              videoRef={videoRef}
              compact
              connectionError={connectionError}
              onRetry={retry}
              ptz_id={camera.id}
              showControls
              overlayText={
                visionGrace && !connectionError ? "Iniciando detección IA..." : null
              }
            />
          </div>
        )}

        {mode === "maximized" &&
          createPortal(
            <div
              style={maximizedStyle}
              className="z-9000  border border-border shadow-2xl bg-bg-100 flex flex-col w-170 h-100"
            >
              <PtzToolbar
                name={camera.nombre}
                mode="maximized"
                onToggleMaximize={toggleMaximize}
                onToggleFullscreen={() => setMode("fullscreen")}
                onHide={onClose}
                visionOn={visionOn}
                visionStarting={visionStarting}
                onToggleVision={handleToggleVision}
                onOpenVisionConfig={() => setVisionConfigOpen(true)}
              />

              <PtzVideo
                videoRef={videoRef}
                connectionError={connectionError}
                onRetry={retry}
                ptz_id={camera.id}
                showControls
                overlayText={
                  visionGrace && !connectionError ? "Iniciando detección IA..." : null
                }
              />
            </div>,
            document.body,
          )}

        {mode === "fullscreen" && (
          <PtzFullscreenModal
            name={camera.nombre}
            ptz_id={camera.id}
            streamRef={streamRef}
            connectionError={connectionError}
            onRetry={retry}
            onClose={() => setMode("maximized")}
          />
        )}

        {visionConfigOpen && (
          <VisionConfigPanel
            ptzId={camera.id}
            visionOn={visionOn}
            current={visionConfig}
            onApply={handleApplyVisionConfig}
            onClose={() => setVisionConfigOpen(false)}
          />
        )}
      </>
    );
  },
  (prev, next) =>
    prev.camera === next.camera &&
    prev.stackIndex === next.stackIndex &&
    prev.onBecomeMaximized === next.onBecomeMaximized &&
    prev.onBecomeMinimized === next.onBecomeMinimized &&
    prev.onClose === next.onClose &&
    prev.position === next.position,
);

export default PtzCamera;
