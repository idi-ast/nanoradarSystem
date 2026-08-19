import { memo } from "react";
import type { RadarTarget } from "../../types";
import { DEVICE_LABEL, DEVICE_COLOR } from "../map/devicesConfig";

interface Props {
  target: RadarTarget;
  onClick?: (targetId: string) => void;
  isSelected?: boolean;
  /** Color hex de la zona donde está el track (ej: "#ff0000") */
  zoneColor?: string | null;
}

export const TargetCard = memo(function TargetCard({ target, onClick, isSelected, zoneColor }: Props) {
  const isCritical = target.nivel === 4;
  const deviceLabel = DEVICE_LABEL[target.deviceType] ?? target.deviceType;
  const deviceColor =
    DEVICE_COLOR[target.deviceType] ??
    "bg-slate-500/20 text-slate-300 border-slate-500/40";
  const rawId = target.id.replace(/^(nanoRadar|magosradar|spotter)_/, "");
  const inZone = !!zoneColor;

  return (
    <div
      className={`p-3 cursor-pointer transition-colors hover:bg-bg-300/50 ${
        isSelected ? "ring-1 ring-sky-400/60" : ""
      }`}
      style={{
        borderLeft: inZone ? `3px solid ${zoneColor}` : undefined,
        backgroundColor: inZone ? `${zoneColor}12` : undefined,
      }}
      onClick={() => onClick?.(target.id)}
    >
      <div className="flex justify-between items-start gap-1">
        <span className="text-text-100 tracking-wide font-bold text-xs flex items-center gap-1.5">
          {inZone && (
            <span
              className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: zoneColor! }}
            />
          )}
          Track id: {rawId.slice(-4)}
        </span>
        <div className="flex gap-1">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${deviceColor}`}>
            {deviceLabel}
          </span>
          <span
            className={`text-[10px] rounded px-2 py-0.5  ${
              isCritical
                ? "bg-brand-100 text-text-100"
                : "bg-sky-500 text-text-100 font-bold"
            }`}
          >
            LVL {target.nivel}
          </span>
        </div>
      </div>
      {target.speed != null && (
        <p className="text-[10px] text-text-200 mt-0.5">
          Velocidad:{" "}
          <span className="text-sky-300 font-bold">
            {target.speed.toFixed(1)} km/h
          </span>
        </p>
      )}
    </div>
  );
});
