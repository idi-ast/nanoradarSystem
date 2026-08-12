import {
  IconAlertTriangle,
  IconCheck,
  IconX,
} from "@tabler/icons-react";
import type { CalibrationStatus } from "../../../../../stores/cameraCalibrationStore";

export interface CalibrationCoverageInfoProps {
  status: CalibrationStatus | null;
}

/**
 * Muestra el estado de cobertura de las zonas con activarPtz respecto a la
 * calibración actual de la cámara (verde = cubierta, rojo = fuera de alcance).
 */
export function CalibrationCoverageInfo({
  status,
}: CalibrationCoverageInfoProps) {
  if (!status || status.total_zones === 0) return null;

  return (
    <div className="mt-3 border-t border-zinc-700 pt-2">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-zinc-300 text-xs font-semibold flex items-center gap-1.5">
          <IconAlertTriangle size={14} className="text-amber-400 shrink-0" />
          Estado de cobertura
        </span>
        <span
          className={`text-[11px] font-mono ${
            status.all_covered ? "text-green-400" : "text-red-400"
          }`}
        >
          {status.covered_count}/{status.total_zones} zonas
        </span>
      </div>

      <ul className="space-y-1 max-h-40 overflow-y-auto pr-1">
        {status.zones.map((zone) => (
          <li
            key={zone.nombre}
            className="flex items-center gap-1.5 text-xs rounded-md px-2 py-1 bg-zinc-800/60"
          >
            {zone.covered ? (
              <IconCheck size={13} className="text-green-400 shrink-0" />
            ) : (
              <IconX size={13} className="text-red-400 shrink-0" />
            )}
            <span className="text-zinc-200 truncate flex-1">{zone.nombre}</span>
            <span className="text-zinc-500 font-mono text-[10px] shrink-0">
              {zone.pan_deg > 0 ? "+" : ""}
              {zone.pan_deg.toFixed(0)}° · {Math.round(zone.dist_center_m)}m
            </span>
          </li>
        ))}
      </ul>

      {status.warnings.length > 0 && (
        <div className="mt-2 rounded-md bg-red-950/50 border border-red-800/50 px-2 py-1.5">
          {status.warnings.map((warning) => (
            <p
              key={warning}
              className="text-red-300 text-[11px] leading-snug flex items-start gap-1"
            >
              <IconAlertTriangle size={12} className="mt-0.5 shrink-0" />
              {warning}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
