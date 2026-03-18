import { IconMaximize, IconMinimize, IconX } from "@tabler/icons-react";
import Hls from "hls.js";
import { memo, useCallback, useRef, useState } from "react";
import type { Camaras } from "@/features/config-devices/types/ConfigServices.type";

interface CameraProps {
  camera: Camaras;
}

const Camera = memo(function Camera({ camera }: CameraProps) {
  const streamUrl = camera.url_stream;
  const [minimize, setMinimize] = useState(true);
  const [fullScreen, setFullScreen] = useState(false);
  const hlsRef = useRef<Hls | null>(null);

  const videoCallbackRef = useCallback((node: HTMLVideoElement | null) => {
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
        node.play().catch(() => {
          /* autoplay bloqueado por el navegador */
        });
      });
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal)
          console.error("[HLS] Error fatal:", data.type, data.details);
      });
    } else if (node.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari — HLS nativo
      node.src = streamUrl;
      node.addEventListener("loadedmetadata", () => {
        node.play().catch(() => { });
      });
    }
  }, [streamUrl]);

  return (
    <div
      className={`rounded-b-2xl px-2 ${fullScreen ? "absolute inset-0" : minimize ? "relative w-60" : "relative min-w-80"}`}
    >
      <div className="absolute flex justify-start gap-5 items-center left-0 top-0 bg-bg-100  z-10">
        <small className={`p-2 ${minimize ? "text-xs" : ""}`}>{camera.nombre}</small>
        <button
          className={`rounded flex items-center gap-1 ${!minimize ? "hover:bg-brand-100/80" : "hover:bg-brand-200/80"} p-0.5`}
          onClick={() => setMinimize(!minimize)}
        >
          {minimize ? (
            <IconMaximize size={24} stroke={1.5} />
          ) : (
            <IconMinimize size={24} stroke={1.5} />
          )}
          {minimize ? <span>maximizar</span> : <span>minimizar</span>}
        </button>

        {!minimize && (
          <button
            className="flex items-center text-nowrap gap-1 hover:bg-brand-200/80 p-0.5"
            onClick={() => setFullScreen(!fullScreen)}
          >
            {fullScreen ? (
              <IconMinimize size={24} stroke={1.5} />
            ) : (
              <IconMaximize size={24} stroke={1.5} />
            )}
            <span>{fullScreen ? "Salir" : "Pantalla Completa"}</span>
          </button>
        )}
      </div>

      <div
        className={`overflow-hidden pt-9 ${minimize ? "h-50" : fullScreen ? "h-screen" : ""} rounded-2xl bg-black`}
      >
        {fullScreen && (
          <button
            onClick={() => setFullScreen(false)}
            className="absolute top-1 right-15 bg-brand-100/80 text-text-100 rounded-full z-10"
          >
            <IconX size={35} stroke={1.5} />
          </button>
        )}
        <video
          ref={videoCallbackRef}
          controls
          muted
          playsInline
          className="w-full h-full object-contain"
        />
      </div>
    </div>
  );
});

export default Camera;
