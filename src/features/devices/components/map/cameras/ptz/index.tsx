import { memo, useState } from "react";
import { createPortal } from "react-dom";
import { useWebRtcPlayer, getWhepBaseUrl } from "./hooks/useWebRtcPlayer";
import { PtzToolbar } from "./components/PtzToolbar";
import { PtzVideo } from "./components/PtzVideo";
import { PtzFullscreenModal } from "./components/PtzFullscreenModal";
import type { PtzCameraProps, CameraMode } from "./types";

const SLOT_HEIGHT = 360;
const BASE_BOTTOM = 80;

const PtzCamera = memo(
  function PtzCamera({
    camera,
    position,
    stackIndex = 0,
    onBecomeMaximized,
    onBecomeMinimized,
    onClose,
  }: PtzCameraProps) {
    const [mode, setMode] = useState<CameraMode>("minimized");
    const streamUrl = getWhepBaseUrl(camera.url_stream);
    const { videoRef, streamRef, connectionError, retry } =
      useWebRtcPlayer(streamUrl);

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
          bottom: `${BASE_BOTTOM + stackIndex * SLOT_HEIGHT}px`,
          left: "3.1%",
        };

    return (
      <>
        {mode === "minimized" && (
          <div className="w-full rounded-xl overflow-hidden border border-border shadow-xl bg-bg-100 flex flex-col transition-all duration-500">
            <PtzToolbar
              name={camera.nombre}
              mode="minimized"
              onToggleMaximize={toggleMaximize}
              onToggleFullscreen={() => setMode("fullscreen")}
              onHide={onClose}
            />
            <PtzVideo
              videoRef={videoRef}
              compact
              connectionError={connectionError}
              onRetry={retry}
              ptz_id={camera.id}
              showControls
            />
          </div>
        )}

        {mode === "maximized" &&
          createPortal(
            <div
              style={maximizedStyle}
              className="z-9000 overflow-hidden border border-border shadow-2xl bg-bg-100 flex flex-col w-150 h-80"
            >
              <PtzToolbar
                name={camera.nombre}
                mode="maximized"
                onToggleMaximize={toggleMaximize}
                onToggleFullscreen={() => setMode("fullscreen")}
                onHide={onClose}
              />
              <PtzVideo
                videoRef={videoRef}
                connectionError={connectionError}
                onRetry={retry}
                ptz_id={camera.id}
                showControls
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
