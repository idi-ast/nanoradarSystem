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

export const TargetCard = memo(function TargetCard({
  target,
  onClick,
  isSelected,
  zoneColor,
}: Props) {
  const isCritical = target.nivel === 4;
  const deviceLabel = DEVICE_LABEL[target.deviceType] ?? target.deviceType;
  const rawId = target.id.replace(/^(nanoRadar|magosradar|spotter)_/, "");
  const inZone = !!zoneColor;

  return (
    <div
      className={`p-3 border-t border-t-white/20  bg-bg-400/10 backdrop-blur-lg border border-transparent cursor-pointer rounded-xl transition-colors hover:bg-bg-300 ${
        isSelected ? "ring-1 ring-bg-400/60" : ""
      }`}
      style={{
        border: inZone ? `1px solid ${zoneColor}69` : undefined,
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
          <span
            className={`text-[10px] font-bold px-1.5 py-0.5 pe-2 me-1 border-e`}
          >
            {deviceLabel}
          </span>
          <span
            className={`text-[10px] rounded-full px-2 py-0.5  ${
              isCritical
                ? " border border-brand-100 bg-brand-100/20 text-text-100"
                : "  text-text-200 font-bold"
            }`}
          >
            Nivel {target.nivel}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-5">
        <p className="text-[10px] text-text-200 mt-0.5">
          SNR:{" "}
          <span className="text-lime-300 font-bold">
            {target.snr?.toFixed(4)}
          </span>
        </p>
        <p className="text-[10px] text-text-200 mt-0.5">
          Nro Tracks:{" "}
          <span className="text-sky-300 font-bold">
            {target.history?.length ? `(${target.history.length})` : ""}
          </span>
        </p>
      </div>
    </div>
  );
});
