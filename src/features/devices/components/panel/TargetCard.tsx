import { memo } from "react";
import type { RadarTarget } from "../../types";

const DEVICE_LABEL: Record<string, string> = {
  nanoRadar: "NanoRadar",
  spotter: "Spotter",
};

const DEVICE_COLOR: Record<string, string> = {
  nanoRadar: "bg-cyan-500/20 text-text-100 border-cyan-500/40",
  spotter: "bg-violet-500/10 text-text-100 border-violet-500/40",
};

interface Props {
  target: RadarTarget;
}

export const TargetCard = memo(function TargetCard({ target }: Props) {
  const isCritical = target.nivel === 4;
  const deviceLabel = DEVICE_LABEL[target.deviceType] ?? target.deviceType;
  const deviceColor =
    DEVICE_COLOR[target.deviceType] ??
    "bg-slate-500/20 text-slate-300 border-slate-500/40";
  const rawId = target.id.replace(/^(nanoRadar|spotter)_/, "");

  return (
    <div className={`p-3`}>
      <div className="flex justify-between items-start gap-1">
        <span className="text-text-100 font-bold text-xs">
          Detección id: {rawId.slice(-4)}
        </span>
        <div className="flex gap-1">
          <span className={`text-[9px] px-1.5 py-0.5  border ${deviceColor}`}>
            {deviceLabel}
          </span>
          <span
            className={`text-[9px] px-2 py-0.5  ${
              isCritical
                ? "bg-brand-100 text-text-100"
                : "bg-emerald-500 text-text-100 font-bold"
            }`}
          >
            LVL {target.nivel}
          </span>
        </div>
      </div>
      <p className="text-[10px] text-text-200 mt-1">
        Zona: {target.zona || "N/A"}
      </p>
    </div>
  );
});
