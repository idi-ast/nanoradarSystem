import { IconRefresh } from "@tabler/icons-react";
import { PtzControls } from "./PtzControls";

interface PtzVideoProps {
  videoRef: (node: HTMLVideoElement | null) => void;
  compact?: boolean;
  connectionError?: string | null;
  onRetry?: () => void;
  ptz_id: number;
  showControls?: boolean;
}

export function PtzVideo({
  videoRef,
  compact,
  connectionError,
  onRetry,
  ptz_id,
  showControls,
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
      {showControls && !connectionError && <PtzControls ptz_id={ptz_id} />}
    </div>
  );
}
