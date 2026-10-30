import { IconRefresh } from "@tabler/icons-react";
import { PtzControls } from "./PtzControls";

interface PtzVideoProps {
  videoRef: (node: HTMLVideoElement | null) => void;
  compact?: boolean;
  connectionError?: string | null;
  onRetry?: () => void;
  ptz_id: number;
  showControls?: boolean;
  overlayText?: string | null;
}

export function PtzVideo({
  videoRef,
  compact,
  connectionError,
  onRetry,
  ptz_id,
  showControls,
  overlayText,
}: PtzVideoProps) {
  return (
    <div
      className={`bg-black   relative ${compact ? "h-36" : "flex-1"}`}
    >
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="w-full h-full object-contain"
      />
      {connectionError && (
        <>
          {/* Indicador discreto en la esquina inferior derecha: no tapa la PTZ.
              La reconexión es automática; el icono permite forzarla manualmente. */}
          <div className="absolute bottom-2 right-2 flex items-center gap-1.5 bg-black/80 border border-red-500/40 rounded-md px-2 py-1 z-20">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-red-300 text-[10px] leading-none">Sin señal</span>
            {onRetry && (
              <button
                onClick={onRetry}
                title="Reconectar ahora"
                className="text-text-100/70 hover:text-text-100 transition-colors"
              >
                <IconRefresh size={13} stroke={1.5} />
              </button>
            )}
          </div>
        </>
      )}
      {overlayText && !connectionError && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="flex items-center gap-2 bg-black/70 px-3 py-1.5 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-white text-[11px] font-medium">
              {overlayText}
            </span>
          </div>
        </div>
      )}
      {showControls && !connectionError && <PtzControls ptz_id={ptz_id} />}
    </div>
  );
}
