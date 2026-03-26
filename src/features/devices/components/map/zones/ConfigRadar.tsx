import { memo, useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  IconRadar,
  IconRefresh,
  IconChevronDown,
  IconChevronRight,
} from "@tabler/icons-react";
import { useRadarVisualStore } from "../../../stores/radarVisualStore";
import type { RadarVisualState } from "../../../stores/radarVisualStore";
import { useMapPanel } from "../MapPanelContext";
import { Tooltip } from "@/components/ui";


interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
  accent?: string;
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
  accent = "accent-emerald-500",
}: SliderRowProps) {
  const display = format ? format(value) : String(value);
  const textColor = accent.replace("accent-", "text-");
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-text-200 leading-none">{label}</span>
        <span className={`text-[10px] font-mono font-bold ${textColor} leading-none`}>
          {display}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`w-full h-1.5 rounded-full cursor-pointer bg-bg-300 ${accent}`}
      />
    </div>
  );
}

interface ToggleRowProps {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}

function ToggleRow({ label, value, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-[10px] text-text-200">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-8 h-4 rounded-full transition-colors duration-200 ${
          value ? "bg-emerald-600" : "bg-bg-300"
        }`}
      >
        <span
          className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform duration-200 ${
            value ? "translate-x-0" : "-translate-x-2.5"
          }`}
        />
      </button>
    </div>
  );
}


interface SectionProps {
  title: string;
  accent?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function Section({ title, accent = "text-emerald-400", defaultOpen = false, children }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-bg-200/60 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between px-2.5 py-1.5 hover:bg-bg-300/40 transition-colors"
      >
        <span className={`text-[9px] font-semibold uppercase tracking-widest ${accent}`}>
          {title}
        </span>
        {open ? (
          <IconChevronDown size={11} className="text-text-200/60" />
        ) : (
          <IconChevronRight size={11} className="text-text-200/60" />
        )}
      </button>
      {open && <div className="px-2.5 pb-2.5 space-y-2.5">{children}</div>}
    </div>
  );
}


function RadarConfigPanel({ onClose }: { onClose: () => void }) {
  const vs = useRadarVisualStore();
  const s = <K extends keyof RadarVisualState>(key: K) =>
    (v: RadarVisualState[K]) => vs.set(key, v);

  const pct = (v: number) => `${Math.round(v * 100)}%`;
  const px = (v: number) => `${v}px`;
  const deg = (v: number) => `${v}°`;
  const ms = (v: number) => `${(v / 1000).toFixed(1)}s`;

  return (
    <div className="w-72 max-h-[85vh] overflow-y-auto bg-bg-100/95 backdrop-blur-sm border border-border rounded-xl shadow-2xl p-4 space-y-3 scrollbar-thin scrollbar-track-bg-300 scrollbar-thumb-bg-400">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <IconRadar size={14} className="text-emerald-400" stroke={1.8} /> 
          <h4 className="text-xs text-text-100 font-bold uppercase tracking-wide">
            Visual del Radar
          </h4>
        </div>
        <button
          onClick={onClose}
          className="text-text-200 hover:text-text-100 transition-colors text-[10px]"
        >
          ✕
        </button>
      </div>
      <Section title="Haz (Beam)" accent="text-text-100" defaultOpen>
        <ToggleRow label="Mostrar haz" value={vs.beamShow} onChange={s("beamShow")} />
        <div className={`space-y-2.5 transition-opacity ${!vs.beamShow ? "opacity-40 pointer-events-none" : ""}`}>
          <SliderRow label="Opacidad del haz" value={vs.beamOpacity} min={0} max={1} step={0.05} format={pct} onChange={s("beamOpacity")} />
          <SliderRow label="Extra apertura visual" value={vs.beamExtraAperture} min={0} max={30} step={1} format={deg} onChange={s("beamExtraAperture")} accent="accent-lime-500" />
          <SliderRow label="Opacidad pico (centro)" value={vs.beamPeakOpacityPercent} min={0} max={100} step={5} format={(v) => `${v}%`} onChange={s("beamPeakOpacityPercent")} accent="accent-lime-500" />
          <SliderRow label="Inicio desvanecimiento radial" value={vs.beamRadialFadeStart} min={0} max={100} step={5} format={(v) => `${v}%`} onChange={s("beamRadialFadeStart")} accent="accent-lime-500" />
          <SliderRow label="Fade de bordes laterales" value={vs.beamEdgeFadeRatio} min={0} max={0.5} step={0.05} format={(v) => `${Math.round(v * 100)}%`} onChange={s("beamEdgeFadeRatio")} accent="accent-lime-500" />
        </div>
      </Section>

      <Section title="Pulso animado" accent="text-text-100">
        <ToggleRow label="Mostrar pulso" value={vs.pulseShow} onChange={s("pulseShow")} />
        <div className={`space-y-2.5 transition-opacity ${!vs.pulseShow ? "opacity-40 pointer-events-none" : ""}`}>
          <SliderRow label="Ondas simultáneas" value={vs.pulseWaveCount} min={1} max={10} step={1} format={String} onChange={s("pulseWaveCount")} accent="accent-cyan-500" />
          <SliderRow label="Velocidad del ciclo" value={vs.pulseCycleMs} min={2_000} max={30_000} step={500} format={ms} onChange={s("pulseCycleMs")} accent="accent-cyan-500" />
          <SliderRow label="Opacidad pico" value={vs.pulsePeakOpacity} min={0} max={1} step={0.02} format={pct} onChange={s("pulsePeakOpacity")} accent="accent-cyan-500" />
          <SliderRow label="Grosor pico" value={vs.pulsePeakWidth} min={1} max={10} step={0.5} format={px} onChange={s("pulsePeakWidth")} accent="accent-cyan-500" />
          <SliderRow label="Desenfoque" value={vs.pulseBlur} min={0} max={8} step={0.5} format={px} onChange={s("pulseBlur")} accent="accent-cyan-500" />
        </div>
      </Section>

      <Section title="Relleno de cobertura" accent="text-text-100">
        <SliderRow label="Opacidad del relleno" value={vs.rangeFillOpacity} min={0} max={0.5} step={0.01} format={pct} onChange={s("rangeFillOpacity")} accent="accent-violet-500" />
      </Section>

      <Section title="Borde de cobertura" accent="text-text-100">
        <ToggleRow label="Mostrar borde" value={vs.rangeBorderShow} onChange={s("rangeBorderShow")} />
        <div className={`space-y-2.5 transition-opacity ${!vs.rangeBorderShow ? "opacity-40 pointer-events-none" : ""}`}>
          <SliderRow label="Grosor" value={vs.rangeBorderWidth} min={0.5} max={4} step={0.5} format={px} onChange={s("rangeBorderWidth")} accent="accent-violet-500" />
          <SliderRow label="Opacidad" value={vs.rangeBorderOpacity} min={0} max={1} step={0.05} format={pct} onChange={s("rangeBorderOpacity")} accent="accent-violet-500" />
        </div>
      </Section>

      <Section title="Líneas de apertura" accent="text-text-100">
        <ToggleRow label="Mostrar límites" value={vs.rangeLimitsShow} onChange={s("rangeLimitsShow")} />
        <div className={`space-y-2.5 transition-opacity ${!vs.rangeLimitsShow ? "opacity-40 pointer-events-none" : ""}`}>
          <SliderRow label="Grosor" value={vs.rangeLimitsWidth} min={0.5} max={4} step={0.5} format={px} onChange={s("rangeLimitsWidth")} accent="accent-yellow-500" />
          <SliderRow label="Opacidad" value={vs.rangeLimitsOpacity} min={0} max={1} step={0.05} format={pct} onChange={s("rangeLimitsOpacity")} accent="accent-yellow-500" />
        </div>
      </Section>

      <Section title="Anillos concéntricos" accent="text-text-100">
        <ToggleRow label="Mostrar anillos" value={vs.ringsShow} onChange={s("ringsShow")} />
        <div className={`space-y-2.5 transition-opacity ${!vs.ringsShow ? "opacity-40 pointer-events-none" : ""}`}>
          <SliderRow label="Grosor" value={vs.ringsWidth} min={0.5} max={5} step={0.5} format={px} onChange={s("ringsWidth")} accent="accent-sky-500" />
          <SliderRow label="Op. arco exterior" value={vs.ringsOpacity} min={0} max={1} step={0.05} format={pct} onChange={s("ringsOpacity")} accent="accent-sky-500" />
          <SliderRow label="Op. arco interior" value={vs.ringsArcOpacity} min={0} max={1} step={0.05} format={pct} onChange={s("ringsArcOpacity")} accent="accent-sky-500" />
        </div>
      </Section>

      <Section title="Línea de dirección" accent="text-text-100">
        <ToggleRow label="Mostrar línea" value={vs.gradoLineShow} onChange={s("gradoLineShow")} />
        <div className={`space-y-2.5 transition-opacity ${!vs.gradoLineShow ? "opacity-40 pointer-events-none" : ""}`}>
          <SliderRow label="Grosor" value={vs.gradoLineWidth} min={0.5} max={5} step={0.5} format={px} onChange={s("gradoLineWidth")} accent="accent-orange-500" />
          <SliderRow label="Opacidad" value={vs.gradoLineOpacity} min={0} max={1} step={0.05} format={pct} onChange={s("gradoLineOpacity")} accent="accent-orange-500" />
        </div>
      </Section>

      <button
        onClick={vs.reset}
        className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[10px] rounded-lg border border-border text-text-200 hover:text-text-100 hover:bg-bg-300 transition-colors"
      >
        <IconRefresh size={12} stroke={2} />
        Restaurar valores por defecto
      </button>
    </div>
  );
}


export const ConfigRadar = memo(function ConfigRadar() {
  const { isOpen, openPanel, closePanel } = useMapPanel();
  const open = isOpen("radar");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [panelStyle, setPanelStyle] = useState<{ top: number; right: number }>({
    top: 0,
    right: 0,
  });

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
      <Tooltip text="Configurar visual del radar">
        <button
          ref={triggerRef}
          onClick={() => open ? closePanel("radar") : openPanel("radar")}
          className={`h-10 w-10 flex justify-center items-center rounded transition-colors ${
            open
              ? "bg-emerald-700 text-white border border-emerald-500/50"
              : "bg-bg-300 border border-transparent hover:bg-emerald-700/60 text-text-100"
          }`}
        >
          <IconRadar size={20} stroke={1.8} />
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
            <RadarConfigPanel onClose={() => closePanel("radar")} />
          </div>,
          document.body,
        )}
    </>
  );
});

export default ConfigRadar;
