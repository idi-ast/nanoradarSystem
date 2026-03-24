import { IconMaximize, IconMinimize, IconRefresh, IconX } from "@tabler/icons-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Camaras } from "@/features/config-devices/types/ConfigServices.type";
import type { CamaraActividad } from "@/features/devices/types";

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

/**
 * Normaliza url_stream para usarla como base WHEP:
 * elimina "/index.m3u8" y la barra final si las trae.
 * Ejemplo: "http://10.30.7.14:8889/camara_1/index.m3u8" → "http://10.30.7.14:8889/camara_1"
 */
function getWhepBaseUrl(urlStream: string): string {
  try {
    const u = new URL(urlStream);
    u.pathname = u.pathname.replace(/\/index\.m3u8$/, "").replace(/\/$/, "");
    return u.toString();
  } catch {
    return "";
  }
}

/**
 * Hook WebRTC WHEP para MediaMTX.
 * Flujo correcto WHEP: enviar el offer SDP sin esperar a ICE gathering;
 * MediaMTX responde con el answer completo (incluye sus candidatos ICE).
 *
 * Expone `streamRef` para que otros elementos <video> puedan reutilizar
 * el mismo MediaStream sin abrir una segunda conexión WebRTC.
 */
function useWebRtcPlayer(streamUrl: string) {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Expone una función para forzar reconexión desde la UI
  const retry = useCallback(() => {
    setConnectionError(null);
    setRetryCount((n) => n + 1);
  }, []);

  const videoRef = useCallback(
    (node: HTMLVideoElement | null) => {
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      if (!node) return;

      let destroyed = false;
      setConnectionError(null);

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      pcRef.current = pc;

      pc.ontrack = (event) => {
        streamRef.current = event.streams[0];
        if (node.srcObject !== event.streams[0]) {
          node.srcObject = event.streams[0];
        }
      };

      pc.onconnectionstatechange = () => {
        if (
          (pc.connectionState === "failed" ||
            pc.connectionState === "disconnected") &&
          !destroyed
        ) {
          setConnectionError("Conexión perdida");
        }
      };

      // Recibir solo — sin enviar audio/video local
      pc.addTransceiver("video", { direction: "recvonly" });
      pc.addTransceiver("audio", { direction: "recvonly" });

      async function negotiate() {
        // WHEP: enviar offer inmediatamente, sin esperar ICE gathering.
        // MediaMTX devuelve un answer que ya incluye sus candidatos ICE.
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        if (destroyed) return;

        const resp = await fetch(`${streamUrl}/whep`, {
          method: "POST",
          headers: { "Content-Type": "application/sdp" },
          body: offer.sdp,
        });

        if (!resp.ok) {
          throw new Error(`WHEP ${resp.status} ${resp.statusText}`);
        }
        if (destroyed) return;

        const answerSdp = await resp.text();
        await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
      }

      negotiate().catch((e) => {
        if (!destroyed) {
          const msg =
            e instanceof TypeError
              ? "No se pudo conectar al servidor (red o CORS)"
              : String(e.message ?? e);
          console.error("[WebRTC]", streamUrl, e);
          setConnectionError(msg);
        }
      });

      return () => {
        destroyed = true;
        pc.close();
        pcRef.current = null;
        streamRef.current = null;
      };
    },
    // retryCount hace que el callback-ref se recree al presionar Reintentar
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [streamUrl, retryCount],
  );

  return { videoRef, streamRef, connectionError, retry };
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
    <div className="flex items-center gap-3 px-2 py-1  border-b border-border">
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
  connectionError,
  onRetry,
}: {
  videoRef: (node: HTMLVideoElement | null) => void;
  compact?: boolean;
  activity?: CamaraActividad;
  connectionError?: string | null;
  onRetry?: () => void;
}) {
  const isActive = !!activity;
  return (
    <div className={`bg-black overflow-hidden relative ${compact ? "h-36" : "flex-1"}`}>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="w-full h-full object-contain"
        style={{
          transform: isActive ? "scale(1.7)" : "scale(1)",
          transition: "transform 0.65s cubic-bezier(0.4, 0, 0.2, 1)",
          transformOrigin: activity ? getBBoxOrigin(activity.bbox) : "center center",
        }}
      />
      {connectionError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-2">
          <p className="text-red-400 text-[11px] font-medium text-center px-3 leading-tight">
            {connectionError}
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center gap-1 text-[11px] text-white bg-bg-300/60 hover:bg-bg-300 px-2 py-1 rounded transition-colors"
            >
              <IconRefresh size={13} stroke={1.5} />
              Reintentar
            </button>
          )}
        </div>
      )}
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

/**
 * Reutiliza el MediaStream ya establecido para evitar abrir una segunda
 * conexión WebRTC solo por entrar a pantalla completa.
 */
function FullscreenModal({
  name,
  streamRef,
  connectionError,
  onRetry,
  onClose,
}: {
  name: string;
  streamRef: React.RefObject<MediaStream | null>;
  connectionError?: string | null;
  onRetry?: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Asigna el stream existente al elemento <video> del modal sin nueva conexión
  const attachRef = useCallback(
    (node: HTMLVideoElement | null) => {
      if (!node) return;
      if (streamRef.current) {
        node.srcObject = streamRef.current;
        node.play().catch(() => {});
      }
    },
    [streamRef],
  );

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
        <CameraVideo videoRef={attachRef} connectionError={connectionError} onRetry={onRetry} />
      </div>
    </div>,
    document.body,
  );
}

const Camera = memo(
  function Camera({
    camera,
    position,
    stackIndex = 0,
    onBecomeMaximized,
    onBecomeMinimized,
    activity,
  }: CameraProps) {
  const [mode, setMode] = useState<CameraMode>("minimized");
  const streamUrl = getWhepBaseUrl(camera.url_stream);
  const { videoRef, streamRef, connectionError, retry } = useWebRtcPlayer(streamUrl);
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
      className="z-9000  overflow-hidden border border-border shadow-2xl bg-bg-100 flex flex-col w-150 h-80"
    >
      <CameraToolbar
        name={camera.nombre}
        mode="maximized"
        onToggleMaximize={toggleMaximize}
        onToggleFullscreen={openFullscreen}
      />
      <CameraVideo videoRef={videoRef} activity={activity} connectionError={connectionError} onRetry={retry} />
    </div>
  );

  return (
    <>
      {mode === "minimized" && (
        <div
          className="w-full rounded-xl overflow-hidden border border-border shadow-xl bg-bg-100 flex flex-col transition-all duration-500"
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
          <CameraVideo videoRef={videoRef} compact activity={activity} connectionError={connectionError} onRetry={retry} />
        </div>
      )}

      {mode === "maximized" && createPortal(maximizedWidget, document.body)}

      {mode === "fullscreen" && (
        <FullscreenModal
          name={camera.nombre}
          streamRef={streamRef}
          connectionError={connectionError}
          onRetry={retry}
          onClose={closeFullscreen}
        />
      )}
    </>
  );
  },
  (prev, next) => {
    if (prev.camera !== next.camera) return false;
    if (prev.stackIndex !== next.stackIndex) return false;
    if (prev.onBecomeMaximized !== next.onBecomeMaximized) return false;
    if (prev.onBecomeMinimized !== next.onBecomeMinimized) return false;
    if (prev.position !== next.position) return false;
    // Compara activity por valor para ignorar cambios de referencia sin datos nuevos
    const pa = prev.activity;
    const na = next.activity;
    if (pa === na) return true;
    if (!pa || !na) return false;
    return (
      pa.ip === na.ip &&
      pa.objeto_tipo === na.objeto_tipo &&
      pa.tipo_evento === na.tipo_evento &&
      JSON.stringify(pa.bbox) === JSON.stringify(na.bbox)
    );
  },
);

export default Camera;
