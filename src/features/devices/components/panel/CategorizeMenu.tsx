import { memo, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { IconTag } from "@tabler/icons-react";
import { fetchBehaviorCategories, labelTrack } from "../../services";

interface Props {
  /** track_id tal como lo espera el backend (ej: "T42") */
  trackId: string;
  /** Variante visual: icono suelto (toolbars) o botón con texto */
  variant?: "icon" | "text";
  /** Se llama tras etiquetar exitosamente */
  onLabeled?: (category: string) => void;
  className?: string;
}

const FALLBACK_CATEGORIES = [
  "bolla", "persona", "lancha", "pajaro", "ola", "animal", "dron", "desconocido",
];

/**
 * Menú de categorías para etiquetar un track ("Categorizar").
 * Reutilizable: se usa en la card de targets y junto a favoritos
 * tanto en el rightbar del mapa como en la pestaña de historial.
 */
export const CategorizeMenu = memo(function CategorizeMenu({
  trackId,
  variant = "icon",
  onLabeled,
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<string[] | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open || categories) return;
    let cancelled = false;
    fetchBehaviorCategories()
      .then((cats) => !cancelled && setCategories(cats.length ? cats : FALLBACK_CATEGORIES))
      .catch(() => !cancelled && setCategories(FALLBACK_CATEGORIES));
    return () => {
      cancelled = true;
    };
  }, [open, categories]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const categorize = useCallback(
    async (category: string) => {
      setSaving(true);
      try {
        await labelTrack(trackId, category);
        toast.success(`Track ${trackId} etiquetado como "${category}"`);
        onLabeled?.(category);
      } catch (err) {
        console.error("[CategorizeMenu] labelTrack:", err);
        toast.error(`No se pudo etiquetar el track ${trackId}`);
      } finally {
        setSaving(false);
        setOpen(false);
      }
    },
    [trackId, onLabeled],
  );

  const base =
    variant === "icon"
      ? "flex h-6 w-6 items-center justify-center rounded-md border transition-colors " +
        "border-border text-text-100/60 hover:bg-bg-200 hover:text-sky-400"
      : "flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border border-bg-400 " +
        "text-text-200 hover:text-text-100 hover:border-bg-300 transition-colors";

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={saving}
        className={base}
        title="Categorizar track"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <IconTag size={variant === "icon" ? 12 : 13} stroke={1.8} />
        {variant === "text" && <span>{saving ? "..." : "Categorizar"}</span>}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 w-40 rounded-md border border-border bg-bg-100 p-1 shadow-xl"
        >
          {(categories ?? FALLBACK_CATEGORIES).map((c) => (
            <button
              key={c}
              role="menuitem"
              onClick={() => categorize(c)}
              disabled={saving}
              className="block w-full rounded px-2 py-1 text-left text-[11px] text-text-100 hover:bg-bg-200 disabled:opacity-50"
            >
              {c}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
