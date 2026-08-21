import {
  IconEye,
  IconMaximize,
  IconMinimize,
  IconSettings,
  IconSparkles,
} from "@tabler/icons-react";
import type { CameraMode } from "../types";

interface PtzToolbarProps {
  name: string;
  mode: CameraMode;
  onToggleMaximize: () => void;
  onToggleFullscreen: () => void;
  onHide?: () => void;
  /** Estado de la detección IA */
  visionOn?: boolean;
  visionStarting?: boolean;
  onToggleVision?: () => void;
  /** Abrir menú de configuración IA */
  onOpenVisionConfig?: () => void;
}

export function PtzToolbar({
  name,
  mode,
  onToggleMaximize,
  onToggleFullscreen,
  onHide,
  visionOn,
  visionStarting,
  onToggleVision,
  onOpenVisionConfig,
}: PtzToolbarProps) {
  return (
    <div className="flex items-center gap-3 px-2 py-1 border-b border-border">
      <span className="text-[11px] font-medium text-text-100 flex-1 truncate">
        {name}
      </span>
      <span className="text-[9px] px-1.5 py-0.5 rounded bg-brand-200/20 text-brand-200 font-bold uppercase tracking-wider shrink-0">
        PTZ
      </span>

      {onToggleVision && (
        <button
          onClick={onToggleVision}
          disabled={visionStarting}
          title={
            visionOn ? "Desactivar detección IA" : "Activar detección IA (YOLO)"
          }
          className={`flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded transition-colors disabled:opacity-60 ${
            visionOn
              ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
              : "text-text-100/70 hover:text-text-100 hover:bg-bg-300/60"
          }`}
        >
          <IconSparkles
            size={14}
            stroke={1.5}
            className={visionStarting ? "animate-pulse" : ""}
          />
          <span>{visionStarting ? "Iniciando..." : "IA"}</span>
        </button>
      )}

      {onOpenVisionConfig && (
        <button
          onClick={onOpenVisionConfig}
          title="Configuración de detección IA"
          className={`flex items-center px-1.5 py-0.5 rounded transition-colors ${
            visionOn
              ? "text-emerald-400/80 hover:text-emerald-400 hover:bg-emerald-500/10"
              : "text-text-100/70 hover:text-text-100 hover:bg-bg-300/60"
          }`}
        >
          <IconSettings size={14} stroke={1.5} />
        </button>
      )}

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
