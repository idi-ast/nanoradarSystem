import { useState, useCallback, useEffect, useRef, memo } from "react";
import { createPortal } from "react-dom";
import {
  IconX,
  IconEye,
  IconEyeOff,
  IconCategory,
} from "@tabler/icons-react";
import { MAGOS_CATEGORIES } from "./devicesConfig";
import { Tooltip } from "@/components/ui";

interface Props {
  hiddenCategories: Set<number>;
  onChange: (hidden: Set<number>) => void;
}

function toggleCat(set: Set<number>, id: number): Set<number> {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

export const MagosCategoryFilter = memo(function MagosCategoryFilter({
  hiddenCategories,
  onChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<{ top: number; right: number }>({
    top: 0,
    right: 0,
  });
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const updatePos = () => {
      const rect = triggerRef.current!.getBoundingClientRect();
      setPanelStyle({
        top: rect.top,
        right: window.innerWidth - rect.left + 8,
      });
    };
    updatePos();
    window.addEventListener("resize", updatePos);
    return () => window.removeEventListener("resize", updatePos);
  }, [open]);

  const toggle = useCallback(
    (id: number) => onChange(toggleCat(hiddenCategories, id)),
    [hiddenCategories, onChange],
  );

  const toggleAll = useCallback(() => {
    const allIds = MAGOS_CATEGORIES.map((c) => c.id);
    const allVisible = allIds.every((id) => !hiddenCategories.has(id));
    onChange(allVisible ? new Set(allIds) : new Set());
  }, [hiddenCategories, onChange]);

  const hiddenCount = hiddenCategories.size;
  const total = MAGOS_CATEGORIES.length;
  const allVisible = hiddenCount === 0;

  return (
    <div>
      <Tooltip text="Filtrar categorías MagosRadar">
        <button
          ref={triggerRef}
          onClick={() => setOpen((p) => !p)}
          className={`relative w-10 h-10 flex items-center justify-center rounded-md transition-colors ${
            open
              ? "bg-brand-200/20 text-brand-200"
              : allVisible
                ? "text-text-100 bg-bg-300 hover:text-text-100 hover:bg-bg-200"
                : "text-amber-400 bg-amber-400/10 hover:bg-amber-400/20"
          }`}
        >
          <IconCategory size={20} />
          {!allVisible && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-amber-500 text-[9px] font-bold text-black flex items-center justify-center">
              {hiddenCount}
            </span>
          )}
        </button>
      </Tooltip>

      {open &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: panelStyle.top,
              right: panelStyle.right,
            }}
            className="w-52 bg-bg-100/95 backdrop-blur-sm border border-border rounded-xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-border">
              <span className="text-xs font-bold uppercase tracking-widest text-text-100/70">
                Categorías
              </span>
              <div className="flex items-center gap-1">
                <span className="text-xs text-text-100/30">
                  {total - hiddenCount}/{total}
                </span>
                <button
                  onClick={() => setOpen(false)}
                  className="text-text-100/30 hover:text-text-100/70 ml-1"
                >
                  <IconX size={13} />
                </button>
              </div>
            </div>

            <div className="p-2 space-y-1 max-h-64 overflow-y-auto">
              <div className="flex items-center gap-2 px-2 py-1">
                <span className="flex-1 text-xs font-bold uppercase tracking-widest text-text-100/50">
                  MagosRadar
                </span>
                <button
                  onClick={toggleAll}
                  className="text-[9px] text-text-100/40 hover:text-text-100/70 transition-colors"
                >
                  {allVisible ? "Ocultar todo" : "Mostrar todo"}
                </button>
              </div>

              {MAGOS_CATEGORIES.map((cat) => {
                const isHidden = hiddenCategories.has(cat.id);
                return (
                  <div
                    key={cat.id}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors text-left ${
                      isHidden ? "opacity-40" : ""
                    }`}
                  >
                    <button
                      onClick={() => toggle(cat.id)}
                      className="flex items-center gap-2 flex-1 min-w-0 hover:opacity-80 transition-opacity"
                    >
                      <span
                        className="shrink-0 w-2.5 h-2.5 rounded-full"
                        style={{
                          backgroundColor: isHidden ? "#555" : cat.color,
                        }}
                      />
                      <span className="text-[11px] font-medium text-text-100 truncate">
                        {cat.nombre}
                      </span>
                      {isHidden ? (
                        <IconEyeOff size={13} className="shrink-0 text-text-100/30 ml-auto" />
                      ) : (
                        <IconEye size={13} className="shrink-0 text-text-100/50 ml-auto" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
});
