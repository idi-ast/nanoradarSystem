import { memo, useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { IconRefresh, IconTarget } from "@tabler/icons-react";
import { useTargetVisualStore } from "../../../stores/targetVisualStore";
import { ZONE_DETECTION_CATEGORIES } from "../../../config";
import { Tooltip } from "@/components/ui";

function TargetVisualPanel({ onClose }: { onClose: () => void }) {
  const { defaultCategoriaDeteccion, setDefaultCategoria, reset } =
    useTargetVisualStore();

  return (
    <div className="w-72 bg-bg-100/95 backdrop-blur-sm border border-border rounded-xl shadow-2xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs text-text-100 font-bold uppercase tracking-wide">
          Icono de Detección
        </h4>
        <button
          onClick={onClose}
          className="text-text-200 hover:text-text-100 transition-colors text-[10px]"
        >
          ✕
        </button>
      </div>

      <div className="bg-bg-200/60 rounded-lg p-2.5 space-y-2.5">
        <p className="text-[9px] text-text-200/60 uppercase font-semibold tracking-widest">
          Icono por defecto
        </p>
        <p className="text-[10px] text-text-200/70 leading-tight">
          Icono que se mostrará en los targets sin zona asignada. Cuando un
          target entra a una zona con categoría, usa el icono de esa zona.
        </p>
        <div className="grid grid-cols-3 gap-1.5 pt-1">
          {ZONE_DETECTION_CATEGORIES.map((cat) => {
            const active = defaultCategoriaDeteccion === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setDefaultCategoria(cat.id)}
                className={`flex flex-col items-center gap-0.5 py-2 px-1 rounded border text-[10px] transition-colors ${
                  active
                    ? "border-brand-100 bg-brand-100/10 text-brand-100"
                    : "border-border bg-bg-100 text-text-200 hover:bg-bg-300"
                }`}
              >
                <cat.icon size={16} stroke={1.5} />
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      <button
        onClick={reset}
        className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[10px] rounded-lg border border-border text-text-200 hover:text-text-100 hover:bg-bg-300 transition-colors"
      >
        <IconRefresh size={12} stroke={2} />
        Restaurar valores por defecto
      </button>
    </div>
  );
}

const ConfigTargets = memo(function ConfigTargets() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [panelStyle, setPanelStyle] = useState<{ top: number; right: number }>(
    { top: 0, right: 0 },
  );

  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const updatePos = () => {
      const rect = triggerRef.current!.getBoundingClientRect();
      setPanelStyle({
        top: rect.top,
        right: window.innerWidth - rect.left + 10,
      });
    };
    updatePos();
    window.addEventListener("resize", updatePos);
    return () => window.removeEventListener("resize", updatePos);
  }, [open]);

  return (
    <>
      <Tooltip text="Icono de detección">
        <button
          ref={triggerRef}
          onClick={() => setOpen((p) => !p)}
          className={`h-10 w-10 flex justify-center items-center rounded transition-colors ${
            open
              ? "bg-sky-700 text-white border border-sky-500/50"
              : "bg-bg-300 border border-transparent hover:bg-sky-700/60 text-text-100"
          }`}
        >
          <IconTarget size={18} stroke={1.8} />
        </button>
      </Tooltip>

      {open &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: panelStyle.top,
              right: panelStyle.right,
              zIndex: 9999,
            }}
          >
            <TargetVisualPanel onClose={() => setOpen(false)} />
          </div>,
          document.body,
        )}
    </>
  );
});

export default ConfigTargets;
