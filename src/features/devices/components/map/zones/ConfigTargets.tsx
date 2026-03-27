import { memo, useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { IconRefresh, IconTarget, IconBox, IconMapPin, IconMapPinFilled, IconChevronDown, IconChevronRight, IconEye, IconEyeOff } from "@tabler/icons-react";
import { useTargetVisualStore } from "../../../stores/targetVisualStore";
import { ZONE_DETECTION_CATEGORIES } from "../../../config";
import { useMapPanel } from "../MapPanelContext";
import { Tooltip } from "@/components/ui";
import {
  updateBoat3DConfig,
  DEFAULT_BOAT3D_CONFIG,
  type Boat3DConfig,
} from "../boatSingleRenderer";
import { DEFAULT_CATEGORY_MODELS } from "../../../stores/targetVisualStore";
import { DEFAULT_ICON_STYLE_2D } from "../../../stores/targetVisualStore";

/** Opciones de modelo GLB disponibles por categoría */
const CATEGORY_MODEL_OPTIONS: Record<number, { path: string; label: string }[]> = {
  1: [{ path: "/3d/glb/people.glb", label: "Persona" }],
  2: [
    { path: "/3d/glb/cargo_ship.glb", label: "Cargo" },
    { path: "/3d/glb/bote.glb", label: "Bote" },
  ],
  3: [{ path: "/3d/glb/car2.glb", label: "Auto" }],
  4: [{ path: "/3d/glb/pet.glb", label: "Mascota" }],
  5: [
    { path: "/3d/glb/dron.glb", label: "Dron" },
    { path: "/3d/glb/dron2.glb", label: "Dron 2" },
  ],
};


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

function Section({
  title,
  children,
  defaultOpen = true,
  accent,
  right,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  accent?: boolean;
  right?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`bg-bg-200/60 rounded-lg overflow-hidden`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between px-2.5 py-2 gap-2 text-left hover:bg-bg-300/40 transition-colors ${accent ? "text-sky-400/80" : "text-text-200/60"}`}
      >
        <span className="text-[9px] uppercase font-semibold tracking-widest flex-1">{title}</span>
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          {right}
        </div>
        {open
          ? <IconChevronDown size={12} stroke={2} className="shrink-0 opacity-50" />
          : <IconChevronRight size={12} stroke={2} className="shrink-0 opacity-50" />
        }
      </button>
      {open && <div className="px-2.5 pb-2.5 space-y-1.5">{children}</div>}
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-4 w-7 shrink-0 rounded-full border border-transparent transition-colors duration-200 focus:outline-none ${value ? "bg-brand-100" : "bg-bg-400"}`}
      role="switch"
      aria-checked={value}
    >
      <span className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ${value ? "translate-x-3" : "translate-x-0"}`} />
    </button>
  );
}

function IconToggle({ show, onChange }: { show: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      title={show ? "Ocultar ícono" : "Mostrar ícono"}
      onClick={() => onChange(!show)}
      className={`transition-colors ${show ? "text-text-200/60 hover:text-text-200" : "text-text-200/25 hover:text-text-200/60"}`}
    >
      {show ? <IconEye size={12} stroke={2} /> : <IconEyeOff size={12} stroke={2} />}
    </button>
  );
}

function Preview2D({
  size, iconSize, borderRadius, borderWidth, borderColor, bgColor, bgOpacity, iconColor, showIcon, glow,
}: {
  size: number; iconSize: number; borderRadius: number; borderWidth: number;
  borderColor: string; bgColor: string; bgOpacity: number; iconColor: string; showIcon: boolean; glow?: string;
}) {
  const displaySize = Math.min(size, 32);
  const displayIconSize = Math.round(iconSize * (displaySize / size));
  return (
    <div
      className="flex items-center justify-center shrink-0"
      style={{
        width: displaySize, height: displaySize,
        borderRadius: `${borderRadius}%`,
        borderWidth: borderWidth, borderStyle: "solid",
        borderColor,
        backgroundColor: bgColor + Math.round(bgOpacity * 255).toString(16).padStart(2, "0"),
        boxShadow: glow ? `0 0 0 3px ${glow}40` : undefined,
      }}
    >
      {showIcon && (
        <svg width={displayIconSize} height={displayIconSize} viewBox="0 0 24 24" fill="none"
          stroke={iconColor.startsWith("rgba") ? "#7f8ea3" : iconColor} strokeWidth="2">
          <path d="M3 17l4-8 5 5 3-4 4 4" />
        </svg>
      )}
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
    categoryModels,
    setCategoryModel,
    iconStyle2D,
    setIconStyle2D,
    customMapCenter,
    customMapZoom,
    currentViewportCenter,
    currentViewportZoom,
    setCustomMapCenter,
    setCustomMapZoom,
    reset,
  } = useTargetVisualStore();

  const [inactiveOpen, setInactiveOpen] = useState(true);
  const [activeOpen, setActiveOpen] = useState(true);

  function handleConfig(key: keyof Boat3DConfig, value: number | string) {
    const next = { [key]: value } as Partial<Boat3DConfig>;
    setBoat3DConfig(next);
    updateBoat3DConfig(next);
  }

  return (
    <div className="w-72 bg-bg-100/95 backdrop-blur-sm border border-border rounded-xl shadow-2xl p-4 space-y-2 max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-1">
        <h4 className="text-xs text-text-100 font-bold uppercase tracking-wide">
          Configuración del mapa
        </h4>
        <button onClick={onClose} className="text-text-200 hover:text-text-100 transition-colors text-[10px]">✕</button>
      </div>

      {/* Centro del mapa */}
      <Section title="Centro del mapa al iniciar" defaultOpen={false}>
        {customMapCenter ? (
          <div className="flex items-start gap-1.5">
            <IconMapPinFilled size={13} stroke={1.5} className="text-brand-100 shrink-0 mt-0.5" />
            <div className="flex-1 text-[10px] text-text-200 leading-tight">
              <p className="tabular-nums">{customMapCenter.latitude.toFixed(6)}</p>
              <p className="tabular-nums">{customMapCenter.longitude.toFixed(6)}</p>
              {customMapZoom !== null && (
                <p className="tabular-nums">Zoom: <span className="text-lime-300">{customMapZoom.toFixed(1)}</span> <small className="opacity-50">predeterminado</small></p>
              )}
            </div>
            <button type="button" onClick={() => { setCustomMapCenter(null); setCustomMapZoom(null); }}
              className="text-[9px] text-text-200/50 hover:text-red-400 transition-colors shrink-0" title="Eliminar posición guardada">✕</button>
          </div>
        ) : (
          <p className="text-[10px] text-text-200/50 leading-tight">Sin posición guardada. Se usará la posición por defecto del sistema.</p>
        )}
        <button type="button" disabled={!currentViewportCenter}
          onClick={() => { if (currentViewportCenter) { setCustomMapCenter(currentViewportCenter); setCustomMapZoom(currentViewportZoom); } }}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[10px] rounded-lg border border-border text-text-200 hover:text-text-100 hover:bg-bg-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <IconMapPin size={12} stroke={2} />
          Usar posición actual del mapa
        </button>
      </Section>

      {/* Icono por defecto */}
      <Section title="Icono por defecto" defaultOpen={false}>
        <div className="grid grid-cols-3 gap-1.5">
          {ZONE_DETECTION_CATEGORIES.map((cat) => {
            const active = defaultCategoriaDeteccion === cat.id;
            return (
              <button key={cat.id} type="button" onClick={() => setDefaultCategoria(cat.id)}
                className={`flex flex-col items-center gap-0.5 py-2 px-1 rounded border text-[10px] transition-colors ${active ? "border-brand-100 bg-brand-100/10 text-brand-100" : "border-border bg-bg-100 text-text-200 hover:bg-bg-300"}`}
              >
                <cat.icon size={16} stroke={1.5} />
                {cat.label}
              </button>
            );
          })}
        </div>
      </Section>

      {/* Estilo 2D */}
      <Section
        title="Estilo del icono 2D"
        right={
          <button type="button" onClick={() => setIconStyle2D(DEFAULT_ICON_STYLE_2D)}
            className="text-[9px] text-text-200/40 hover:text-text-200 transition-colors">↺ Reset</button>
        }
      >
        {/* Fondo compartido */}
        <div className="flex items-center gap-2 pb-1.5">
          <span className="text-[9px] text-text-200/40 shrink-0">Fondo</span>
          <input type="color" value={iconStyle2D.bgColor}
            onChange={(e) => setIconStyle2D({ bgColor: e.target.value })}
            className="h-6 w-10 rounded cursor-pointer border border-border bg-transparent shrink-0" />
          <span className="text-[9px] text-text-200/40 tabular-nums">{iconStyle2D.bgColor}</span>
        </div>

        {/* Inactivo sub-section */}
        <div className="border border-border/30 rounded-lg overflow-hidden">
          <button type="button" onClick={() => setInactiveOpen((o) => !o)}
            className="w-full flex items-center justify-between px-2 py-1.5 hover:bg-bg-300/30 transition-colors gap-1.5">
            <span className="text-[9px] text-text-200/50 uppercase tracking-widest font-semibold">Inactivo</span>
            <Preview2D size={iconStyle2D.size} iconSize={iconStyle2D.iconSize}
              borderRadius={iconStyle2D.borderRadius} borderWidth={iconStyle2D.borderWidth}
              borderColor={iconStyle2D.borderColor} bgColor={iconStyle2D.bgColor}
              bgOpacity={iconStyle2D.bgOpacity} iconColor={iconStyle2D.iconColor.startsWith("rgba") ? "#7f8ea3" : iconStyle2D.iconColor}
              showIcon={iconStyle2D.showIcon} />
            {inactiveOpen ? <IconChevronDown size={10} stroke={2} className="opacity-40 shrink-0" /> : <IconChevronRight size={10} stroke={2} className="opacity-40 shrink-0" />}
          </button>
          {inactiveOpen && (
            <div className="px-2 pb-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-text-200/40">Mostrar ícono</span>
                <IconToggle show={iconStyle2D.showIcon} onChange={(v) => setIconStyle2D({ showIcon: v })} />
              </div>
              <SliderRow label="Tamaño" min={20} max={80} step={2} value={iconStyle2D.size}
                format={(v) => `${v}px`} onChange={(v) => setIconStyle2D({ size: v })} />
              <SliderRow label="Ícono" min={8} max={48} step={1} value={iconStyle2D.iconSize}
                format={(v) => `${v}px`} onChange={(v) => setIconStyle2D({ iconSize: v })} />
              <SliderRow label="Radio" min={0} max={50} step={1} value={iconStyle2D.borderRadius}
                format={(v) => v === 50 ? "círculo" : `${v * 2}%`} onChange={(v) => setIconStyle2D({ borderRadius: v })} />
              <SliderRow label="Borde" min={0} max={6} step={0.5} value={iconStyle2D.borderWidth}
                format={(v) => `${v}px`} onChange={(v) => setIconStyle2D({ borderWidth: v })} />
              <SliderRow label="Opacidad" min={0.1} max={1} step={0.05} value={iconStyle2D.bgOpacity}
                format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => setIconStyle2D({ bgOpacity: v })} />
              <div className="grid grid-cols-2 gap-2 pt-0.5">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] text-text-200/40">Color ícono</span>
                  <input type="color" value={iconStyle2D.iconColor.startsWith("rgba") ? "#7f8ea3" : iconStyle2D.iconColor}
                    onChange={(e) => setIconStyle2D({ iconColor: e.target.value })}
                    className="w-full h-6 rounded cursor-pointer border border-border bg-transparent" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] text-text-200/40">Color borde</span>
                  <input type="color" value={iconStyle2D.borderColor.startsWith("rgba") ? "#ffffff" : iconStyle2D.borderColor}
                    onChange={(e) => setIconStyle2D({ borderColor: e.target.value })}
                    className="w-full h-6 rounded cursor-pointer border border-border bg-transparent" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Activo sub-section */}
        <div className="border border-sky-500/20 rounded-lg overflow-hidden">
          <button type="button" onClick={() => setActiveOpen((o) => !o)}
            className="w-full flex items-center justify-between px-2 py-1.5 hover:bg-sky-500/5 transition-colors gap-1.5">
            <span className="text-[9px] text-sky-400/70 uppercase tracking-widest font-semibold">Activo</span>
            <Preview2D size={iconStyle2D.movingSize} iconSize={iconStyle2D.movingIconSize}
              borderRadius={iconStyle2D.movingBorderRadius} borderWidth={iconStyle2D.movingBorderWidth}
              borderColor={iconStyle2D.movingBorderColor} bgColor={iconStyle2D.bgColor}
              bgOpacity={iconStyle2D.movingBgOpacity} iconColor={iconStyle2D.movingIconColor}
              showIcon={iconStyle2D.movingShowIcon} glow={iconStyle2D.movingBorderColor} />
            {activeOpen ? <IconChevronDown size={10} stroke={2} className="opacity-40 shrink-0" /> : <IconChevronRight size={10} stroke={2} className="opacity-40 shrink-0" />}
          </button>
          {activeOpen && (
            <div className="px-2 pb-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-text-200/40">Mostrar ícono</span>
                <IconToggle show={iconStyle2D.movingShowIcon} onChange={(v) => setIconStyle2D({ movingShowIcon: v })} />
              </div>
              <SliderRow label="Tamaño" min={20} max={80} step={2} value={iconStyle2D.movingSize}
                format={(v) => `${v}px`} onChange={(v) => setIconStyle2D({ movingSize: v })} />
              <SliderRow label="Ícono" min={8} max={48} step={1} value={iconStyle2D.movingIconSize}
                format={(v) => `${v}px`} onChange={(v) => setIconStyle2D({ movingIconSize: v })} />
              <SliderRow label="Radio" min={0} max={50} step={1} value={iconStyle2D.movingBorderRadius}
                format={(v) => v === 50 ? "círculo" : `${v * 2}%`} onChange={(v) => setIconStyle2D({ movingBorderRadius: v })} />
              <SliderRow label="Borde" min={0} max={6} step={0.5} value={iconStyle2D.movingBorderWidth}
                format={(v) => `${v}px`} onChange={(v) => setIconStyle2D({ movingBorderWidth: v })} />
              <SliderRow label="Opacidad" min={0.1} max={1} step={0.05} value={iconStyle2D.movingBgOpacity}
                format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => setIconStyle2D({ movingBgOpacity: v })} />
              <div className="grid grid-cols-2 gap-2 pt-0.5">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] text-text-200/40">Color ícono</span>
                  <input type="color" value={iconStyle2D.movingIconColor}
                    onChange={(e) => setIconStyle2D({ movingIconColor: e.target.value })}
                    className="w-full h-6 rounded cursor-pointer border border-border bg-transparent" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] text-text-200/40">Color borde</span>
                  <input type="color" value={iconStyle2D.movingBorderColor}
                    onChange={(e) => setIconStyle2D({ movingBorderColor: e.target.value })}
                    className="w-full h-6 rounded cursor-pointer border border-border bg-transparent" />
                </div>
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* Modelo 3D */}
      <Section title="Modelo 3D · Configuración" defaultOpen={false}>
        <div className="flex items-center justify-between gap-2 pb-1">
          <div className="flex items-center gap-1.5 text-[10px] text-text-200">
            <IconBox size={13} stroke={1.6} />
            <span>{use3DBoat ? "Modelo 3D activo" : "Alto rendimiento (2D)"}</span>
          </div>
          <Toggle value={use3DBoat} onChange={set3DBoat} />
        </div>
        {use3DBoat && (
          <div className="space-y-2 border-t border-border/40 pt-2">
            <p className="text-[9px] text-text-200/40 uppercase tracking-widest">Modelo por categoría</p>
            {ZONE_DETECTION_CATEGORIES.map((cat) => {
              const options = CATEGORY_MODEL_OPTIONS[cat.id];
              if (!options || options.length === 0) return null;
              const currentPath = categoryModels[cat.id] ?? DEFAULT_CATEGORY_MODELS[cat.id];
              return (
                <div key={cat.id} className="flex items-center gap-1.5">
                  <cat.icon size={13} stroke={1.6} className="text-text-200/60 shrink-0" />
                  <span className="text-[9px] text-text-200/60 w-13 shrink-0">{cat.label}</span>
                  <div className="flex flex-wrap gap-1">
                    {options.map((m) => (
                      <button key={m.path} type="button" onClick={() => setCategoryModel(cat.id, m.path)}
                        className={`px-2 py-0.5 text-[9px] rounded border transition-colors ${currentPath === m.path ? "border-brand-100 bg-brand-100/15 text-brand-100" : "border-border bg-bg-100 text-text-200 hover:bg-bg-300"}`}
                      >{m.label}</button>
                    ))}
                  </div>
                </div>
              );
            })}
            <SliderRow label="Escala" min={0.1} max={10} step={0.05} value={boat3DConfig.scale}
              format={(v) => `${v.toFixed(2)}×`} onChange={(v) => handleConfig("scale", v)} />
            <SliderRow label="Rot. inicial" min={-180} max={180} step={5} value={boat3DConfig.rotationOffset}
              format={(v) => `${v}°`} onChange={(v) => handleConfig("rotationOffset", v)} />
            <p className="text-[9px] text-text-200/40 uppercase tracking-widest pt-0.5">Cámara</p>
            <SliderRow label="Altura" min={0.5} max={12} step={0.25} value={boat3DConfig.camHeight}
              format={(v) => v.toFixed(2)} onChange={(v) => handleConfig("camHeight", v)} />
            <SliderRow label="Distancia" min={0.5} max={12} step={0.25} value={boat3DConfig.camDist}
              format={(v) => v.toFixed(2)} onChange={(v) => handleConfig("camDist", v)} />
            <SliderRow label="FOV" min={15} max={90} step={5} value={boat3DConfig.fov}
              format={(v) => `${v}°`} onChange={(v) => handleConfig("fov", v)} />
            <p className="text-[9px] text-text-200/40 uppercase tracking-widest pt-0.5">Luces</p>
            <SliderRow label="Ambiental" min={0} max={3} step={0.05} value={boat3DConfig.ambientInt}
              format={(v) => v.toFixed(2)} onChange={(v) => handleConfig("ambientInt", v)} />
            <SliderRow label="Direccional" min={0} max={5} step={0.1} value={boat3DConfig.dirInt}
              format={(v) => v.toFixed(1)} onChange={(v) => handleConfig("dirInt", v)} />
            <button type="button"
              onClick={() => { setBoat3DConfig(DEFAULT_BOAT3D_CONFIG); updateBoat3DConfig(DEFAULT_BOAT3D_CONFIG); }}
              className="w-full text-[9px] text-text-200/50 hover:text-text-200 transition-colors pt-0.5"
            >↺ Resetear ajustes 3D</button>
          </div>
        )}
      </Section>

      <button onClick={reset}
        className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[10px] rounded-lg border border-border text-text-200 hover:text-text-100 hover:bg-bg-300 transition-colors"
      >
        <IconRefresh size={12} stroke={2} />
        Restaurar valores por defecto
      </button>
    </div>
  );
}


const ConfigTargets = memo(function ConfigTargets() {
  const { isOpen, openPanel, closePanel } = useMapPanel();
  const open = isOpen("targets");
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
      <Tooltip text="Configuración del mapa">
        <button
          ref={triggerRef}
          onClick={() => open ? closePanel("targets") : openPanel("targets")}
          className={`h-10 w-10 flex justify-center items-center rounded transition-colors ${open
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
            <TargetVisualPanel onClose={() => closePanel("targets")} />
          </div>,
          document.body,
        )}
    </>
  );
});

export default ConfigTargets;
