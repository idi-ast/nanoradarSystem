import { memo, useCallback, useState } from "react";
import { toast } from "sonner";
import { labelTrack, fetchBehaviorCategories } from "../../services";

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
  prototipo: "prototipo",
  none: "sin clasificar",
};

function confidenceColor(conf: number, category?: string): string {
  if (category === "sin_clasificar" || !category) return "#9ca3af";
  if (conf >= 0.8) return "#22c55e";
  if (conf >= 0.5) return "#eab308";
  return "#9ca3af";
}

function confidenceLabel(conf: number, category?: string): string {
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
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<string[] | null>(null);

  const color = confidenceColor(behaviorConfidence, behaviorClass);

  const openPicker = useCallback(async () => {
    setOpen((o) => !o);
    if (categories) return;
    try {
      const cats = await fetchBehaviorCategories();
      setCategories(cats);
    } catch {
      // fallback local si el endpoint no responde
      setCategories([
        "bolla", "persona", "lancha", "pajaro", "ola", "animal", "dron", "desconocido",
      ]);
    }
  }, [categories]);

  const categorize = useCallback(
    async (category: string) => {
      setSaving(true);
      try {
        await labelTrack(trackId, category);
        toast.success(`Track ${trackId} etiquetado como "${category}"`);
        onLabeled?.(category);
      } catch (err) {
        console.error("[ClassificationBadge] labelTrack:", err);
        toast.error(`No se pudo etiquetar el track ${trackId}`);
      } finally {
        setSaving(false);
        setOpen(false);
      }
    },
    [trackId, onLabeled],
  );

  return (
    <div className="mt-1">
      <div className="flex items-center gap-1.5">
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
          style={{ backgroundColor: color }}
          title={behaviorSource ? `Origen: ${SOURCE_LABEL[behaviorSource] ?? behaviorSource}` : undefined}
        >
          {behaviorClass ?? "sin_clasificar"} ·{" "}
          {confidenceLabel(behaviorConfidence, behaviorClass)}
        </span>
        <button
          onClick={openPicker}
          disabled={saving}
          className="text-[10px] px-1.5 py-0.5 rounded border border-bg-400 text-text-200 hover:text-text-100 hover:border-bg-300 transition-colors disabled:opacity-50"
        >
          {saving ? "..." : "Categorizar"}
        </button>
      </div>

      {open && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {(categories ?? []).map((c) => (
            <button
              key={c}
              onClick={() => categorize(c)}
              disabled={saving}
              className="text-[10px] px-2 py-0.5 rounded-full bg-bg-200 text-text-100 hover:bg-bg-300 transition-colors disabled:opacity-50"
            >
              {c}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
