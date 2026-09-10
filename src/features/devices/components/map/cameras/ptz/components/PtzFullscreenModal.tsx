import { IconRefresh, IconX } from "@tabler/icons-react";
import { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { PtzControls } from "./PtzControls";
import { useDraggable, dragTransform } from "@/hooks/useDraggable";

interface PtzFullscreenModalProps {
  name: string;
  ptz_id: number;
  streamRef: React.RefObject<MediaStream | null>;
  stream: MediaStream | null;
  connectionError?: string | null;
  onRetry?: () => void;
  onClose: () => void;
}

export function PtzFullscreenModal({
  name,
  ptz_id,
  streamRef,
  stream,
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

  const videoNodeRef = useRef<HTMLVideoElement | null>(null);
  const attachRef = useCallback((node: HTMLVideoElement | null) => {
    videoNodeRef.current = node;
  }, []);

  useEffect(() => {
    const node = videoNodeRef.current;
    const currentStream = stream ?? streamRef.current;
    if (!node || !currentStream) return;
    node.srcObject = currentStream;
    node.play().catch(() => { });
  }, [stream, streamRef]);

  const barRef = useRef<HTMLDivElement>(null);
  const { delta, dragHandleProps } = useDraggable({
    enabled: true,
    containerRef: barRef,
  });

  return createPortal(
    <div className="fixed inset-0 z-99999 bg-green-900 flex flex-col">
      <div
        ref={barRef}
        {...dragHandleProps}
        style={dragTransform(delta)}
        className="flex items-center justify-between px-4 py-2 backdrop-blur-sm shrink-0 cursor-grab active:cursor-grabbing select-none"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-text-100">{name}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-700 text-font-bold uppercase tracking-wider">
            Pantalla Completa
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
