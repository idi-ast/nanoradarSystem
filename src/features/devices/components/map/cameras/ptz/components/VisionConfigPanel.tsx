import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconCheck, IconLoader2, IconSettings, IconX } from "@tabler/icons-react";
import { useDraggable, dragTransform } from "@/hooks/useDraggable";
import {
  fetchVisionClasses,
  fetchVisionDefaults,
  fetchVisionDetections,
  type VisionClass,
  type VisionConfigPayload,
  type VisionDefaults,
  type VisionDetection,
} from "@/features/devices/services/visionService";

interface VisionConfigPanelProps {
  ptzId: number;
  visionOn: boolean;
  current: VisionConfigPayload;
  onApply: (config: VisionConfigPayload) => Promise<boolean>;
  onClose: () => void;
}

const CLASSES = ["person", "bicycle", "car", "motorcycle", "bus", "truck", "boat"];
const RESOLUTIONS = [640, 960, 1280, 1920];
const BITRATES = [1_000_000, 2_500_000, 4_000_000, 6_000_000];
const INFERENCE_SIZES = [320, 480, 640];

export function VisionConfigPanel({
  ptzId,
  visionOn,
  current,
  onApply,
  onClose,
}: VisionConfigPanelProps) {
  const [defaults, setDefaults] = useState<VisionDefaults | null>(null);
  const [classes, setClasses] = useState<VisionClass[]>([]);
  const [confidence, setConfidence] = useState(current.confidence ?? 0.35);
  const [targetFps, setTargetFps] = useState(current.targetFps ?? 12);
  const [maxWidth, setMaxWidth] = useState(current.maxWidth ?? 1280);
  const [bitrate, setBitrate] = useState(current.bitrate ?? 2_500_000);
  const [imgsz, setImgsz] = useState(current.imgsz ?? 480);
  const [selectedClasses, setSelectedClasses] = useState<string[]>(current.classes ?? []);
  const [applying, setApplying] = useState(false);
  const [stats, setStats] = useState<{ state: string; actualFps: number; detections: VisionDetection[] } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const {
    delta,
    isDragging,
    dragHandleProps,
  } = useDraggable({ enabled: true, containerRef: panelRef });

  useEffect(() => {
    fetchVisionDefaults().then((value) => {
      setDefaults(value);
      setConfidence((currentValue) => currentValue || value.confidence);
      setTargetFps((currentValue) => currentValue || value.targetFps);
      setMaxWidth((currentValue) => currentValue || value.maxWidth);
      setBitrate((currentValue) => currentValue || value.bitrate);
      setImgsz((currentValue) => currentValue || value.imgsz);
    }).catch(() => {});
    fetchVisionClasses().then(setClasses).catch(() => {});
  }, []);

  useEffect(() => {
    if (!visionOn) return;
    let active = true;
    const poll = () => fetchVisionDetections(ptzId)
      .then((value) => active && setStats(value))
      .catch(() => active && setStats(null));
    poll();
    const timer = setInterval(poll, 2000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [ptzId, visionOn]);

  function toggleClass(name: string) {
    setSelectedClasses((previous) => previous.includes(name)
      ? previous.filter((value) => value !== name)
      : [...previous, name]);
  }

  async function handleApply() {
    setApplying(true);
    try {
      const applied = await onApply({
        confidence,
        targetFps,
        maxWidth,
        bitrate,
        imgsz,
        classes: selectedClasses.length > 0 ? selectedClasses : null,
      });
      if (applied) onClose();
    } finally {
      setApplying(false);
    }
  }

  const availableClasses = classes.length > 0 ? classes.map((item) => item.name) : CLASSES;

  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/60 p-4">
      <div
        ref={panelRef}
        style={{
          ...dragTransform(delta),
          userSelect: isDragging ? "none" : "auto",
        }}
        className="w-full max-w-sm max-h-[85vh] overflow-y-auto bg-bg-100 border border-border rounded-xl shadow-2xl"
      >
        <div
          {...dragHandleProps}
          className="flex items-center justify-between px-4 py-3 border-b border-border sticky top-0 bg-bg-100 z-10 cursor-grab active:cursor-grabbing select-none"
        >
          <div className="flex items-center gap-2">
            <IconSettings size={16} className="text-brand-200" />
            <span className="text-sm font-semibold text-text-100">Configuración IA</span>
          </div>
          <button onClick={onClose} className="p-1 text-text-100/60 hover:text-text-100" title="Cerrar">
            <IconX size={15} />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-4">
          {visionOn && (
            <div className="bg-bg-300/30 rounded-lg px-3 py-2 flex justify-between text-[10px] text-text-100/70">
              <span className={stats?.state === "online" ? "text-emerald-400" : "text-amber-400"}>
                {stats?.state ?? "Conectando"}
              </span>
              <span>{stats ? `${stats.actualFps.toFixed(1)} FPS · ${stats.detections.length} objetos` : ""}</span>
            </div>
          )}

          <label className="text-[11px] text-text-100">
            <span className="flex justify-between mb-1"><span>Confianza mínima</span><strong>{Math.round(confidence * 100)}%</strong></span>
            <input className="w-full accent-emerald-500" type="range" min="10" max="90" step="5" value={confidence * 100} onChange={(event) => setConfidence(Number(event.target.value) / 100)} />
          </label>
          <label className="text-[11px] text-text-100">
            <span className="flex justify-between mb-1"><span>FPS objetivo</span><strong>{targetFps}</strong></span>
            <input className="w-full accent-emerald-500" type="range" min="5" max="20" step="1" value={targetFps} onChange={(event) => setTargetFps(Number(event.target.value))} />
          </label>

          <OptionRow label="Resolución" values={RESOLUTIONS} value={maxWidth} onChange={setMaxWidth} />
          <OptionRow label="Bitrate" values={BITRATES} value={bitrate} onChange={setBitrate} format={(value) => `${Math.round(value / 1000)}k`} />
          <OptionRow label="Precisión YOLO" values={INFERENCE_SIZES} value={imgsz} onChange={setImgsz} />

          <div>
            <div className="flex justify-between mb-1.5 text-[11px] text-text-100">
              <span>Objetos a detectar</span>
              {selectedClasses.length === 0 && <span className="text-text-100/50">todas</span>}
            </div>
            <div className="flex flex-wrap gap-1">
              {availableClasses.map((name) => (
                <button key={name} onClick={() => toggleClass(name)} className={`text-[10px] px-2 py-0.5 rounded-full border ${selectedClasses.includes(name) ? "border-emerald-400/60 bg-emerald-500/20 text-emerald-400" : "border-border text-text-100/60"}`}>
                  {name}
                </button>
              ))}
            </div>
          </div>
          {defaults && <p className="text-[9px] text-text-100/40">Modelo: {defaults.model} · dispositivo: {defaults.device}</p>}
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t border-border sticky bottom-0 bg-bg-100">
          <button onClick={onClose} className="text-[11px] text-text-100/70 px-3 py-1.5">Cancelar</button>
          <button onClick={() => void handleApply()} disabled={applying} className="flex items-center gap-1.5 text-[11px] text-white bg-emerald-600 px-3 py-1.5 rounded-lg disabled:opacity-60">
            {applying ? <IconLoader2 size={13} className="animate-spin" /> : <IconCheck size={13} />}
            {visionOn ? "Aplicar y reiniciar" : "Guardar"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function OptionRow({
  label,
  values,
  value,
  onChange,
  format = String,
}: {
  label: string;
  values: number[];
  value: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
}) {
  return (
    <div>
      <span className="block text-[11px] text-text-100 mb-1">{label}</span>
      <div className="grid grid-cols-4 gap-1">
        {values.map((item) => (
          <button key={item} onClick={() => onChange(item)} className={`text-[10px] py-1 rounded ${value === item ? "bg-brand-200/25 text-brand-200 font-semibold" : "bg-bg-300/50 text-text-100/70"}`}>
            {format(item)}
          </button>
        ))}
      </div>
    </div>
  );
}
