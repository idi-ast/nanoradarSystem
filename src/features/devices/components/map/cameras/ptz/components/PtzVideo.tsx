import { IconRefresh, IconTarget } from "@tabler/icons-react";
import { PtzControls } from "./PtzControls";

interface PtzVideoProps {
  videoRef: (node: HTMLVideoElement | null) => void;
  compact?: boolean;
  connectionError?: string | null;
  onRetry?: () => void;
  ptz_id: number;
  showControls?: boolean;
  /** Texto informativo temporal sobre el video (ej: "Iniciando detección IA...") */
  overlayText?: string | null;
  /** Etiqueta del badge de lock visual radar↔visión (ej: "boat · T1") */
  fusionLockLabel?: string | null;
}

export function PtzVideo({
  videoRef,
  compact,
  connectionError,
  onRetry,
  ptz_id,
  showControls,
  overlayText,
  fusionLockLabel,
}: PtzVideoProps) {
  return (
    <div
      className={`bg-black overflow-hidden relative ${compact ? "h-36" : "flex-1"}`}
    >
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="w-full h-full object-contain"
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
      {overlayText && !connectionError && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="flex items-center gap-2 bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-white text-[11px] font-medium">
              {overlayText}
            </span>
          </div>
        </div>
      )}
      {fusionLockLabel && !connectionError && (
        <div className="absolute top-2 left-2 pointer-events-none">
          <div className="flex items-center gap-1.5 bg-emerald-500/85 backdrop-blur-sm px-2 py-1 rounded-md">
            <IconTarget size={13} stroke={2} className="text-white" />
            <span className="text-white text-[10px] font-semibold tracking-wide uppercase">
              IA Lock · {fusionLockLabel}
            </span>
          </div>
        </div>
      )}
      {showControls && !connectionError && <PtzControls ptz_id={ptz_id} />}
    </div>
  );
}
