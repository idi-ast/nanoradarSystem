import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  IconCheck,
  IconLoader2,
  IconSettings,
  IconX,
} from "@tabler/icons-react";
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
  /** Configuración actual del hook (pendiente o aplicada) */
  current: VisionConfigPayload;
  onApply: (config: VisionConfigPayload) => Promise<boolean>;
  onClose: () => void;
}

const RESOLUTIONS = [
  { label: "640p", value: 640 },
  { label: "960p", value: 960 },
  { label: "1280p", value: 1280 },
  { label: "Nativa", value: 1920 },
];

const QUALITIES = [
  { label: "Baja", value: 1_000_000 },
  { label: "Media", value: 2_500_000 },
  { label: "Alta", value: 4_000_000 },
  { label: "Máxima", value: 6_000_000 },
];

const INFERENCES = [
  { label: "Rápida", value: 320 },
  { label: "Equilibrada", value: 480 },
  { label: "Precisa", value: 640 },
];

const ALL_CLASSES = [
  "person",
  "bicycle",
  "car",
  "motorcycle",
  "bus",
  "truck",
  "boat",
];

function OptionRow({
  label,
  hint,
  options,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  options: { label: string; value: number }[];
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-[11px] font-medium text-text-100">{label}</span>
        {hint && (
          <span className="text-[9px] text-text-100/50">{hint}</span>
        )}
      </div>
      <div className="grid grid-cols-4 gap-1">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`text-[10px] py-1 rounded transition-colors ${
              value === opt.value
                ? "bg-brand-200/25 text-brand-200 font-semibold"
                : "bg-bg-300/50 text-text-100/70 hover:bg-bg-300"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Menú de configuración de la detección IA de una PTZ.
 * Permite ajustar confianza, FPS, resolución, calidad del stream,
 * tamaño de inferencia y clases detectadas.
 */
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
  const [selectedClasses, setSelectedClasses] = useState<string[]>(
    current.classes ?? [],
  );
  const [applying, setApplying] = useState(false);
  const [liveStats, setLiveStats] = useState<{
    state: string;
    actualFps: number;
    detections: VisionDetection[];
  } | null>(null);

  // Defaults + catálogo de clases
  useEffect(() => {
    fetchVisionDefaults()
      .then((d) => {
        setDefaults(d);
        setConfidence((c) => c ?? d.confidence);
        setTargetFps((f) => f ?? d.targetFps);
        setMaxWidth((w) => w ?? d.maxWidth);
        setBitrate((b) => b ?? d.bitrate);
        setImgsz((i) => i ?? d.imgsz);
      })
      .catch(() => {});
    fetchVisionClasses()
      .then(setClasses)
      .catch(() => {});
  }, []);

  // Estadísticas en vivo mientras el panel está abierto
  useEffect(() => {
    if (!visionOn) return;
    let alive = true;
    const poll = () =>
      fetchVisionDetections(ptzId)
        .then((d) => alive && setLiveStats(d))
        .catch(() => alive && setLiveStats(null));
    poll();
    const timer = setInterval(poll, 2000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [ptzId, visionOn]);

  function toggleClass(name: string) {
    setSelectedClasses((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name],
    );
  }

  async function handleApply() {
    setApplying(true);
    try {
      const ok = await onApply({
        confidence,
        targetFps,
        maxWidth,
        bitrate,
        imgsz,
        classes: selectedClasses.length > 0 ? selectedClasses : null,
      });
      if (ok) onClose();
    } finally {
      setApplying(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm max-h-[85vh] overflow-y-auto bg-bg-100 border border-border rounded-xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border sticky top-0 bg-bg-100 z-10">
          <div className="flex items-center gap-2">
            <IconSettings size={16} stroke={1.5} className="text-brand-200" />
            <span className="text-sm font-semibold text-text-100">
              Configuración IA
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-text-100/60 hover:text-text-100 hover:bg-bg-300/60 p-1 rounded transition-colors"
          >
            <IconX size={15} stroke={1.5} />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-4">
          {/* Estado en vivo */}
          {visionOn && (
            <div className="bg-bg-300/30 rounded-lg px-3 py-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    liveStats?.state === "online"
                      ? "bg-emerald-400"
                      : "bg-amber-400 animate-pulse"
                  }`}
                />
                <span className="text-[10px] text-text-100/70">
                  {liveStats?.state ?? "—"}
                </span>
              </div>
              <span className="text-[10px] text-text-100/70">
                {liveStats ? `${liveStats.actualFps.toFixed(1)} FPS reales` : ""}
              </span>
              <span className="text-[10px] text-emerald-400 font-medium">
                {liveStats ? `${liveStats.detections.length} objetos` : ""}
              </span>
            </div>
          )}

          {/* Confianza */}
          <div>
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-[11px] font-medium text-text-100">
                Confianza mínima
              </span>
              <span className="text-[10px] text-brand-200 font-semibold">
                {Math.round(confidence * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={10}
              max={90}
              step={5}
              value={Math.round(confidence * 100)}
              onChange={(e) => setConfidence(Number(e.target.value) / 100)}
              className="w-full accent-emerald-500 h-1 cursor-pointer"
            />
            <p className="text-[9px] text-text-100/50 mt-0.5">
              Mayor = menos falsas detecciones, puede omitir objetos lejanos
            </p>
          </div>

          {/* FPS */}
          <div>
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-[11px] font-medium text-text-100">
                FPS objetivo
              </span>
              <span className="text-[10px] text-brand-200 font-semibold">
                {targetFps}
              </span>
            </div>
            <input
              type="range"
              min={5}
              max={20}
              step={1}
              value={targetFps}
              onChange={(e) => setTargetFps(Number(e.target.value))}
              className="w-full accent-emerald-500 h-1 cursor-pointer"
            />
            <p className="text-[9px] text-text-100/50 mt-0.5">
              Bájalo si el video se ve entrecortado (menos carga de CPU)
            </p>
          </div>

          {/* Resolución */}
          <OptionRow
            label="Resolución del stream IA"
            options={RESOLUTIONS}
            value={maxWidth}
            onChange={setMaxWidth}
          />

          {/* Calidad */}
          <OptionRow
            label="Calidad de video"
            hint={`${Math.round(bitrate / 1000)} kbps`}
            options={QUALITIES}
            value={bitrate}
            onChange={setBitrate}
          />

          {/* Inferencia */}
          <OptionRow
            label="Precisión de detección"
            options={INFERENCES}
            value={imgsz}
            onChange={setImgsz}
          />

          {/* Clases */}
          <div>
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="text-[11px] font-medium text-text-100">
                Objetos a detectar
              </span>
              {selectedClasses.length === 0 && (
                <span className="text-[9px] text-text-100/50">todas</span>
              )}
            </div>
            <div className="flex flex-wrap gap-1">
              {(classes.length > 0
                ? classes.map((c) => c.name)
                : ALL_CLASSES
              ).map((name) => (
                <button
                  key={name}
                  onClick={() => toggleClass(name)}
                  className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                    selectedClasses.includes(name)
                      ? "border-emerald-400/60 bg-emerald-500/20 text-emerald-400"
                      : "border-border text-text-100/60 hover:bg-bg-300/60"
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          {defaults && (
            <p className="text-[9px] text-text-100/40 leading-snug">
              Modelo: {defaults.model} · dispositivo: {defaults.device}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border sticky bottom-0 bg-bg-100">
          <button
            onClick={onClose}
            className="text-[11px] text-text-100/70 hover:text-text-100 px-3 py-1.5 rounded-lg hover:bg-bg-300/60 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => void handleApply()}
            disabled={applying}
            className="flex items-center gap-1.5 text-[11px] font-medium text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 px-3 py-1.5 rounded-lg transition-colors"
          >
            {applying ? (
              <IconLoader2 size={13} stroke={2} className="animate-spin" />
            ) : (
              <IconCheck size={13} stroke={2} />
            )}
            {visionOn ? "Aplicar y reiniciar" : "Guardar"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
