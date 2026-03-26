import { memo, useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  IconAdjustmentsHorizontal,
  IconEye,
  IconEyeOff,
  IconRefresh,
} from "@tabler/icons-react";
import { useZoneStyleStore } from "../../../stores/zoneStyleStore";
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
  accentClass?: string;
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
  accentClass = "accent-emerald-500",
}: SliderRowProps) {
  const display = format ? format(value) : String(value);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-text-200">{label}</span>
        <span className={`text-[10px] font-mono font-bold ${accentClass.replace("accent-", "text-")}`}>
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
        className={`w-full h-1.5 rounded-full cursor-pointer bg-bg-300 ${accentClass}`}
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
            value ? "translate-x-0.5" : "-translate-x-4"
          }`}
        />
      </button>
    </div>
  );
}


function ZoneStylePanel({ onClose }: { onClose: () => void }) {
  const {
    fillOpacity,
    lineOpacity,
    lineWidth,
    visible,
    setFillOpacity,
    setLineOpacity,
    setLineWidth,
    setVisible,
    reset,
  } = useZoneStyleStore();

  return (
    <div className="w-64 bg-bg-100/95 backdrop-blur-sm border border-border rounded-xl shadow-2xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs text-text-100 font-bold uppercase tracking-wide">
          Estilo de Zonas
        </h4>
        <button
          onClick={onClose}
          className="text-text-200 hover:text-text-100 transition-colors text-[10px] flex items-center gap-1"
        >
          ✕
        </button>
      </div>

      <div className="bg-bg-200/60 rounded-lg p-2.5 space-y-1.5">
        <p className="text-[9px] text-text-200/60 uppercase font-semibold tracking-widest">
          Visibilidad
        </p>
        <ToggleRow
          label="Mostrar zonas"
          value={visible}
          onChange={setVisible}
        />
      </div>

      <div className={`bg-bg-200/60 rounded-lg p-2.5 space-y-3 transition-opacity ${!visible ? "opacity-40 pointer-events-none" : ""}`}>
        <p className="text-[9px] text-text-200/60 uppercase font-semibold tracking-widest">
          Relleno
        </p>
        <SliderRow
          label="Opacidad del relleno"
          value={fillOpacity}
          min={0}
          max={1}
          step={0.05}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={setFillOpacity}
          accentClass="accent-emerald-500"
        />
      </div>

      <div className={`bg-bg-200/60 rounded-lg p-2.5 space-y-3 transition-opacity ${!visible ? "opacity-40 pointer-events-none" : ""}`}>
        <p className="text-[9px] text-text-200/60 uppercase font-semibold tracking-widest">
          Trazo
        </p>
        <SliderRow
          label="Opacidad del trazo"
          value={lineOpacity}
          min={0}
          max={1}
          step={0.05}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={setLineOpacity}
          accentClass="accent-sky-500"
        />
        <SliderRow
          label="Grosor del trazo"
          value={lineWidth}
          min={1}
          max={8}
          step={0.5}
          format={(v) => `${v}px`}
          onChange={setLineWidth}
          accentClass="accent-sky-500"
        />
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


const ConfigZones = memo(function ConfigZones() {
  const { isOpen, openPanel, closePanel } = useMapPanel();
  const open = isOpen("zones");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [panelStyle, setPanelStyle] = useState<{ top: number; right: number }>({
    top: 0,
    right: 0,
  });
  const { visible } = useZoneStyleStore();

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
      <Tooltip text="Configurar estilo de zonas">
        <button
          ref={triggerRef}
          onClick={() => open ? closePanel("zones") : openPanel("zones")}
          className={`h-10 w-10 flex justify-center items-center rounded transition-colors ${
            open
              ? "bg-emerald-700 text-white border border-emerald-500/50"
              : `bg-bg-300 border border-transparent hover:bg-emerald-700/60 ${
                  !visible ? "text-text-200/40" : "text-text-100"
                }`
          }`}
        >
          {visible ? (
            <IconEye size={18} stroke={1.8} />
          ) : (
            <IconEyeOff size={18} stroke={1.8} className="text-text-200/50" />
          )}
          <IconAdjustmentsHorizontal
            size={11}
            stroke={2}
            className="absolute translate-x-2.5 translate-y-2.5"
          />
        </button>
      </Tooltip>

      {open &&
        createPortal(
          <div
            style={{ position: "fixed", top: panelStyle.top, right: panelStyle.right, zIndex: 9999 }}
          >
            <ZoneStylePanel onClose={() => closePanel("zones")} />
          </div>,
          document.body,
        )}
    </>
  );
});

export default ConfigZones;
