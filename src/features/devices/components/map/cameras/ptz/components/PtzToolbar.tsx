import { IconEye, IconMaximize, IconMinimize } from "@tabler/icons-react";
import type { CameraMode } from "../types";

interface PtzToolbarProps {
  name: string;
  mode: CameraMode;
  onToggleMaximize: () => void;
  onToggleFullscreen: () => void;
  onHide?: () => void;
}

export function PtzToolbar({
  name,
  mode,
  onToggleMaximize,
  onToggleFullscreen,
  onHide,
}: PtzToolbarProps) {
  return (
    <div className="flex items-center gap-3 px-2 py-1 border-b border-border">
      <span className="text-[11px] font-medium text-text-100 flex-1 truncate">
        {name}
      </span>
      <span className="text-[9px] px-1.5 py-0.5 rounded bg-brand-200/20 text-brand-200 font-bold uppercase tracking-wider shrink-0">
        PTZ
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

      {onHide && (
        <button
          onClick={onHide}
          className="flex items-center gap-1 text-[11px] text-text-100/70 hover:text-text-100 hover:bg-bg-300/60 px-1.5 py-0.5 rounded transition-colors"
        >
          <IconEye size={14} stroke={1.5} />
        </button>
      )}
    </div>
  );
}
