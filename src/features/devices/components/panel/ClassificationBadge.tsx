import { memo } from "react";
import { CategorizeMenu } from "./CategorizeMenu";
import { BEHAVIOR_CATEGORIES } from "../../config";

interface Props {
  /** track_id tal como lo espera el backend (ej: "T42", sin prefijo) */
  trackId: string;
  behaviorClass?: string;
  behaviorConfidence?: number;
  behaviorSource?: string;
  /** Se llama tras etiquetar para refrescar el estado del padre */
  onLabeled?: (category: string) => void;
}

const SOURCE_LABEL: Record<string, string> = {
  manual: "manual",
  geo_aprendido: "boyas aprendidas",
  regla_estatica: "regla estática",
  zona_boya: "zona de boya",
  prototipo: "prototipo",
  regla_velocidad: "regla automática",
  regla_comportamiento: "firma de comportamiento",
  none: "sin clasificar",
};

export function confidenceColor(conf: number, category?: string): string {
  if (category === "sin_clasificar" || !category) return "#9ca3af";
  if (conf >= 0.8) return "#22c55e";
  if (conf >= 0.5) return "#eab308";
  return "#9ca3af";
}

export function confidenceLabel(conf: number, category?: string): string {
  if (!category || category === "sin_clasificar") return "sin clasificar";
  return `${Math.round(conf * 100)}%`;
}

export const ClassificationBadge = memo(function ClassificationBadge({
  trackId,
  behaviorClass,
  behaviorConfidence = 0,
  behaviorSource,
  onLabeled,
}: Props) {
  const color = confidenceColor(behaviorConfidence, behaviorClass);
  const cat = behaviorClass ? BEHAVIOR_CATEGORIES[behaviorClass] : undefined;
  const Icon = cat?.icon;

  return (
    <div
      className="mt-1"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      role="group"
      aria-label="Clasificación de comportamiento"
    >
      <div className="flex items-center gap-1.5">
        <span
          className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
          style={{ backgroundColor: color }}
          title={behaviorSource ? `Origen: ${SOURCE_LABEL[behaviorSource] ?? behaviorSource}` : undefined}
        >
          {Icon && <Icon size={12} stroke={2.5} />}
          {cat?.label ?? behaviorClass ?? "sin_clasificar"} ·{" "}
          {confidenceLabel(behaviorConfidence, behaviorClass)}
        </span>
        <CategorizeMenu
          trackId={trackId}
          variant="text"
          onLabeled={onLabeled}
        />
      </div>
    </div>
  );
});
