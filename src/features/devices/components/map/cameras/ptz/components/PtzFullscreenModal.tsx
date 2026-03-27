import { IconRefresh, IconX } from "@tabler/icons-react";
import { useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { PtzControls } from "./PtzControls";

interface PtzFullscreenModalProps {
  name: string;
  ptz_id: number;
  streamRef: React.RefObject<MediaStream | null>;
  connectionError?: string | null;
  onRetry?: () => void;
  onClose: () => void;
}

export function PtzFullscreenModal({
  name,
  ptz_id,
  streamRef,
  connectionError,
  onRetry,
  onClose,
}: PtzFullscreenModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

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
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-text-100">{name}</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-brand-200/20 text-brand-200 font-bold uppercase tracking-wider">
            PTZ
          </span>
        </div>
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-text-100/70 hover:text-text-100 hover:bg-bg-300/60 px-2 py-1 rounded transition-colors"
        >
          <IconX size={16} stroke={1.5} />
          <span className="text-xs">Salir (Esc)</span>
        </button>
      </div>
      <div className="flex-1 bg-black relative">
        <video
          ref={attachRef}
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
        <PtzControls ptz_id={ptz_id} />
      </div>
    </div>,
    document.body,
  );
}
