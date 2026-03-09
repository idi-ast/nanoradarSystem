import type { RadarTarget } from "../../types";

interface Props {
  target: RadarTarget;
}

export function TargetCard({ target }: Props) {
  const isCritical = target.nivel === 4;

  return (
    <div
      className={`p-3 border rounded ${
        isCritical
          ? "border-brand-100 bg-brand-100/20"
          : "border-border-200 bg-bg-200"
      }`}
    >
      <div className="flex justify-between items-start">
        <span className="text-white font-bold text-xs">
          OBJ_{target.id.slice(-4)}
        </span>
        <span
          className={`text-[9px] px-1 rounded ${
            isCritical
              ? "bg-brand-100 text-text-100"
              : "bg-emerald-500 text-text-100 font-bold"
          }`}
        >
          LVL {target.nivel}
        </span>
      </div>
      <p className="text-[10px] text-text-200 mt-1">
        Zona: {target.zona || "N/A"}
      </p>
    </div>
  );
}
