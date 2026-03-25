import { memo, useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { IconRefresh, IconTarget, IconBox } from "@tabler/icons-react";
import { useTargetVisualStore } from "../../../stores/targetVisualStore";
import { ZONE_DETECTION_CATEGORIES } from "../../../config";
import { Tooltip } from "@/components/ui";
import {
  updateBoat3DConfig,
  DEFAULT_BOAT3D_CONFIG,
  type Boat3DConfig,
} from "../boatSingleRenderer";

const AVAILABLE_MODELS: { path: string; label: string }[] = [
  { path: "/3d/glb/cargo_ship.glb",  label: "Auto" },
  { path: "/3d/glb/bote.glb",  label: "Bote" },
  { path: "/3d/glb/cargo_ship.glb", label: "Barco"  },
  { path: "/3d/glb/people.glb", label: "Persona"  },
  { path: "/3d/glb/car2.glb", label: "Auto"  },
  { path: "/3d/glb/pet.glb", label: "Mascota"  },
  { path: "/3d/glb/dron2.glb", label: "Dron2"  },
  { path: "/3d/glb/dron.glb", label: "Dron"  },
];


function SliderRow({
  label,
  min,
  max,
  step,
  value,
  format,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const fmt = format ?? ((v: number) => String(v));
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[9px] text-text-200/60 uppercase tracking-wide w-18 shrink-0 leading-none">
        {label}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 h-1 cursor-pointer accent-brand-100"
      />
      <span className="text-[10px] text-text-200 w-9 text-right tabular-nums shrink-0">
        {fmt(value)}
      </span>
    </div>
  );
}

function TargetVisualPanel({ onClose }: { onClose: () => void }) {
  const {
    defaultCategoriaDeteccion,
    setDefaultCategoria,
    use3DBoat,
    set3DBoat,
    boat3DConfig,
    setBoat3DConfig,
    reset,
  } = useTargetVisualStore();

  function handleConfig(key: keyof Boat3DConfig, value: number | string) {
    const next = { [key]: value } as Partial<Boat3DConfig>;
    setBoat3DConfig(next);
    updateBoat3DConfig(next);
  }

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

      <div className="bg-bg-200/60 rounded-lg p-2.5 space-y-2">
        <p className="text-[9px] text-text-200/60 uppercase font-semibold tracking-widest">
          Modelo 3D · Barco
        </p>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[10px] text-text-200">
            <IconBox size={13} stroke={1.6} />
            <span>
              {use3DBoat ? "Modelo 3D activo" : "Alto rendimiento (2D)"}
            </span>
          </div>
          <button
            type="button"
            onClick={() => set3DBoat(!use3DBoat)}
            className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
              use3DBoat ? "bg-brand-100" : "bg-bg-400"
            }`}
            role="switch"
            aria-checked={use3DBoat}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform duration-200 ${
                use3DBoat ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {use3DBoat && (
          <div className="pt-1 space-y-2 border-t border-border/40">

            <p className="text-[9px] text-text-200/40 uppercase tracking-widest pt-0.5">Modelo</p>

            <div className="flex flex-wrap gap-1">
              {AVAILABLE_MODELS.map((m) => {
                const active = boat3DConfig.modelPath === m.path;
                return (
                  <button
                    key={m.path}
                    type="button"
                    onClick={() => handleConfig("modelPath", m.path)}
                    className={`px-2 py-0.5 text-[9px] rounded border transition-colors ${
                      active
                        ? "border-brand-100 bg-brand-100/15 text-brand-100"
                        : "border-border bg-bg-100 text-text-200 hover:bg-bg-300"
                    }`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>

            <SliderRow
              label="Escala"
              min={0.1} max={10} step={0.05}
              value={boat3DConfig.scale}
              format={(v) => `${v.toFixed(2)}×`}
              onChange={(v) => handleConfig("scale", v)}
            />
            <SliderRow
              label="Rot. inicial"
              min={-180} max={180} step={5}
              value={boat3DConfig.rotationOffset}
              format={(v) => `${v}°`}
              onChange={(v) => handleConfig("rotationOffset", v)}
            />

            <p className="text-[9px] text-text-200/40 uppercase tracking-widest pt-0.5">Cámara</p>
            <SliderRow
              label="Altura"
              min={0.5} max={12} step={0.25}
              value={boat3DConfig.camHeight}
              format={(v) => v.toFixed(2)}
              onChange={(v) => handleConfig("camHeight", v)}
            />
            <SliderRow
              label="Distancia"
              min={0.5} max={12} step={0.25}
              value={boat3DConfig.camDist}
              format={(v) => v.toFixed(2)}
              onChange={(v) => handleConfig("camDist", v)}
            />
            <SliderRow
              label="FOV"
              min={15} max={90} step={5}
              value={boat3DConfig.fov}
              format={(v) => `${v}°`}
              onChange={(v) => handleConfig("fov", v)}
            />

            <p className="text-[9px] text-text-200/40 uppercase tracking-widest pt-0.5">Luces</p>
            <SliderRow
              label="Ambiental"
              min={0} max={3} step={0.05}
              value={boat3DConfig.ambientInt}
              format={(v) => v.toFixed(2)}
              onChange={(v) => handleConfig("ambientInt", v)}
            />
            <SliderRow
              label="Direccional"
              min={0} max={5} step={0.1}
              value={boat3DConfig.dirInt}
              format={(v) => v.toFixed(1)}
              onChange={(v) => handleConfig("dirInt", v)}
            />

            <button
              type="button"
              onClick={() => {
                setBoat3DConfig(DEFAULT_BOAT3D_CONFIG);
                updateBoat3DConfig(DEFAULT_BOAT3D_CONFIG);
              }}
              className="w-full text-[9px] text-text-200/50 hover:text-text-200 transition-colors pt-0.5"
            >
              ↺ Resetear ajustes 3D
            </button>
          </div>
        )}
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
