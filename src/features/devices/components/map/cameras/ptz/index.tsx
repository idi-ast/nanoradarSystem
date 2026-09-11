import { memo, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useWebRtcPlayer, getWhepBaseUrl } from "./hooks/useWebRtcPlayer";
import { useDraggable, dragTransform } from "@/hooks/useDraggable";
import { PtzToolbar } from "./components/PtzToolbar";
import { PtzVideo } from "./components/PtzVideo";
import { PtzFullscreenModal } from "./components/PtzFullscreenModal";
import { VisionConfigPanel } from "./components/VisionConfigPanel";
import { VisionLoadingModal } from "./components/VisionLoadingModal";
import { useVisionDetection } from "@/features/devices/hooks/useVisionDetection";
import type { PtzCameraProps, CameraMode } from "./types";
import { useBreakpoint } from "@/hooks/useBreakpoints";

const SLOT_HEIGHT = 360;
const BASE_TOP = 50;

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
      connecting: visionConnecting,
      connectingMode: visionConnectingMode,
      config: visionConfig,
      toggleVision,
      applyConfig,
      finishConnecting,
    } = useVisionDetection(camera.id);
    const [visionGrace, setVisionGrace] = useState(false);
    const [visionConfigOpen, setVisionConfigOpen] = useState(false);
    const connectionErrorRef = useRef<string | null>(null);
    const aiStreamUrl = camera.url_stream.replace(
      /^(.*ptz_\d+)(\/?)$/,
      "$1_ai$2",
    );
    const streamUrl = getWhepBaseUrl(
      visionOn ? aiStreamUrl : camera.url_stream,
    );
    const { videoRef, streamRef, stream, connectionError, retry } =
      useWebRtcPlayer(streamUrl);

    useEffect(() => {
      connectionErrorRef.current = connectionError;
    }, [connectionError]);

    useEffect(() => {
      if (!visionOn) return;
      const startTimer = setTimeout(() => setVisionGrace(true), 0);
      const graceTimer = setTimeout(() => setVisionGrace(false), 12000);
      const retryTimer = setInterval(() => {
        if (connectionErrorRef.current) retry();
      }, 2500);
      return () => {
        clearTimeout(startTimer);
        clearTimeout(graceTimer);
        clearInterval(retryTimer);
      };
    }, [retry, visionOn]);

    function toggleMaximize() {
      if (mode === "minimized") {
        setMode("maximized");
        onBecomeMaximized?.();
      } else {
        setMode("minimized");
        onBecomeMinimized?.();
      }
    }

    function handleToggleVision() {
      void toggleVision();
    }

    async function handleApplyVisionConfig(config: Parameters<typeof applyConfig>[0]) {
      const applied = await applyConfig(config);
      if (applied && visionOn) setVisionGrace(true);
      return applied;
    }

    const { isDesktop, isTablet } = useBreakpoint();

    const maximizedRef = useRef<HTMLDivElement>(null);
    const {
      delta,
      reset: resetDrag,
      dragHandleProps,
    } = useDraggable({
      enabled: mode === "maximized",
      containerRef: maximizedRef,
    });

    useEffect(() => {
      if (mode === "maximized") resetDrag();
    }, [mode, resetDrag]);

    const leftPosition = isDesktop ? "78px" : isTablet ? "60px" : "2px";
    const sizeClass = isDesktop
      ? "w-165 h-100"
      : isTablet
        ? "w-125 h-75"
        : "w-80 h-55";

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
        left: leftPosition,
      };

    return (
      <>
        {mode === "minimized" && (
          <div className="w-full rounded-xl  border border-border shadow-xl bg-bg-100 flex flex-col relative overflow-hidden transition-all duration-500">
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
            />
            {visionConnecting && visionConnectingMode && (
              <VisionLoadingModal
                name={camera.nombre}
                ptzId={camera.id}
                mode={visionConnectingMode}
                onComplete={finishConnecting}
              />
            )}
          </div>
        )}

        {mode === "maximized" &&
          createPortal(
            <div
              ref={maximizedRef}
              style={{
                ...maximizedStyle,
                ...dragTransform(delta),
              }}
              className={`z-9000 border border-border shadow-2xl bg-bg-100 flex flex-col ${sizeClass}`}
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
                dragHandleProps={dragHandleProps}
              />

              <PtzVideo
                videoRef={videoRef}
                connectionError={connectionError}
                onRetry={retry}
                ptz_id={camera.id}
                showControls
                overlayText={
                  visionGrace && !connectionError
                    ? "Iniciando detección IA..."
                    : null
                }
              />
              {visionConnecting && visionConnectingMode && (
                <VisionLoadingModal
                  name={camera.nombre}
                  ptzId={camera.id}
                  mode={visionConnectingMode}
                  onComplete={finishConnecting}
                />
              )}
            </div>,
            document.body,
          )}

        {mode === "fullscreen" && (
          <PtzFullscreenModal
            name={camera.nombre}
            ptz_id={camera.id}
            streamRef={streamRef}
            stream={stream}
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
