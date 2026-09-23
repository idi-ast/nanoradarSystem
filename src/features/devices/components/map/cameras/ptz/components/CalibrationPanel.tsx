import { useState, useEffect, type ReactNode } from "react";
import {
  IconAdjustments,
  IconAlertTriangle,
  IconBulb,
  IconCheck,
  IconChecklist,
  IconClock,
  IconCompass,
  IconCrosshair,
  IconMapPin,
  IconRotate,
  IconShieldCheck,
  IconTarget,
  IconX,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCameraCalibrationStore,
  type CalibrationResult,
} from "../../../../../stores/cameraCalibrationStore";
import { useCameraCalibration } from "../../../../../hooks/useCameraCalibration";
import {
  ptzGotoBearing,
  ptzCalibrateBearing,
  ptzDetectPanDirection,
  ptzAdjustPanOffset,
  ptzVerifyCalibration,
  ptzGetTiltInclination,
  ptzSetTiltInclination,
  ptzCalibrateTilt,
  type DetectPanDirectionResponse,
  type AdjustPanOffsetResponse,
  type VerifyCalibrationResponse,
  type VerifyTestResult,
} from "../service";
import { CalibrationCoverageInfo } from "./CalibrationCoverageInfo";
import { TiltSlider } from "./TiltSlider";

// Altura del objetivo considerada en la conversión ángulo→altura (metros)
const OBJ_ALT = 0.5;

export type CalibrationMode = "goto" | "save";

export interface CalibrationPanelProps {
  cameraId: number;
  cameraName: string;
  result: CalibrationResult | null;
  mode: CalibrationMode;
  onToggleMode: () => void;
  onCancel: () => void;
  /** Azimut actual de la cámara (grados) — usado si no hay estado refrescado */
  azimut?: number;
  /** panOffset actual de la cámara (grados) */
  panOffset?: number;
  /** panInvertido actual (0/1) */
  panInvertido?: number;
}

const COMPASS_DIRECTIONS = [
  { label: "N", bearing: 0 },
  { label: "NE", bearing: 45 },
  { label: "E", bearing: 90 },
  { label: "SE", bearing: 135 },
  { label: "S", bearing: 180 },
  { label: "SO", bearing: 225 },
  { label: "O", bearing: 270 },
  { label: "NO", bearing: 315 },
];

type PendingAction = "detect" | "offset" | "verify" | null;

/** Qué se aplicó en cada paso (label + hora) para mostrar el estado persistente. */
interface AppliedStep {
  label: string;
  at: string;
}

const nowTime = () =>
  new Date().toLocaleTimeString("es", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

/**
 * Panel flotante de calibración PTZ.
 *
 * Flujo GUIADO paso a paso (1-5). Cada paso tiene UN botón de confirmación
 * explícito y muestra un badge "Aplicado" con el valor guardado y la hora.
 * El slider de inclinación MUEVE la cámara en vivo pero NO guarda: solo se
 * persiste al confirmar (0° de referencia).
 */
export function CalibrationPanel({
  cameraId,
  cameraName,
  result,
  mode,
  onToggleMode,
  onCancel,
  azimut: azimutProp,
  panOffset: panOffsetProp,
  panInvertido: panInvertidoProp,
}: CalibrationPanelProps) {
  const isSave = mode === "save";
  const [bearingInput, setBearingInput] = useState("0");
  const [panOffsetInput, setPanOffsetInput] = useState(
    String(panOffsetProp ?? 0),
  );
  const [pending, setPending] = useState<PendingAction>(null);
  const [localPanOffset, setLocalPanOffset] = useState(panOffsetProp ?? 0);
  const [localPanInvertido, setLocalPanInvertido] = useState(
    panInvertidoProp ?? 0,
  );
  const [detectResult, setDetectResult] =
    useState<DetectPanDirectionResponse | null>(null);
  const [offsetResult, setOffsetResult] =
    useState<AdjustPanOffsetResponse | null>(null);
  const [verifyResult, setVerifyResult] =
    useState<VerifyCalibrationResponse | null>(null);

  // ── Inclinación real (tilt) para calibrar altura ──
  const [tiltAngle, setTiltAngle] = useState<number | null>(null);
  const [tiltMoved, setTiltMoved] = useState(false);
  // Distancia al punto de referencia; se persiste por cámara (localStorage).
  const [refDistance, setRefDistance] = useState<number>(() => {
    const saved = Number(localStorage.getItem(`ptz-ref-distance-${cameraId}`));
    return Number.isFinite(saved) && saved > 0 ? saved : 50;
  });
  const [savingTilt, setSavingTilt] = useState(false);

  // ── Estado "aplicado" por paso (lo que se confirmó) ──
  const [applied, setApplied] = useState<Record<string, AppliedStep>>({});

  const calibrationStatus = useCameraCalibrationStore(
    (s) => s.calibrationStatus,
  );
  const clickPoint = useCameraCalibrationStore((s) => s.clickPoint);
  const setResult = useCameraCalibrationStore((s) => s.setResult);
  const setPreviewBearing = useCameraCalibrationStore(
    (s) => s.setPreviewBearing,
  );
  const refreshCalibrationStatus = useCameraCalibrationStore(
    (s) => s.refreshCalibrationStatus,
  );
  const { saveReference } = useCameraCalibration();
  const queryClient = useQueryClient();

  const markApplied = (key: string, label: string) =>
    setApplied((prev) => ({ ...prev, [key]: { label, at: nowTime() } }));

  // Valores mostrados en "Estado actual" (prioriza el estado refrescado del backend)
  const azimutActual = calibrationStatus?.azimut ?? azimutProp ?? 0;
  const panInvertidoActual = calibrationStatus
    ? calibrationStatus.invert_pan
      ? 1
      : 0
    : localPanInvertido;

  const currentBearing = (() => {
    const b = Number(bearingInput);
    return Number.isFinite(b) ? ((b % 360) + 360) % 360 : 0;
  })();

  const handleAimBearing = (bearing: number) => {
    setBearingInput(String(Math.round(bearing)));
    setPreviewBearing(bearing);
    ptzGotoBearing(cameraId, bearing);
  };

  const handleCalibrateAzimut = async () => {
    const res = await ptzCalibrateBearing(cameraId, currentBearing);
    if (res.ok && res.data) {
      const d = res.data;
      setResult({
        bearing: d.current_pan_deg !== undefined ? d.bearing : d.new_azimut,
        distance_m: 0,
        recommended_azimut: d.new_azimut,
        recommended_height: null,
        recommended_max_range: 1000,
        tilt_angle_used: null,
        pan: d.current_pan_deg,
        tilt: d.current_tilt_deg,
        zoom: d.current_pan_deg !== undefined ? d.zoom : 0,
      });
      setPreviewBearing(d.bearing);
      await refreshCalibrationStatus(cameraId);
      queryClient.invalidateQueries({ queryKey: ["config-devices"] });
      const jumpMsg = d.remounted_likely
        ? " El azimut cambió más de 40°: verifica que la cámara apunte al rumbo indicado."
        : "";
      toast.success(`${d.message ?? "Azimut guardado"}.${jumpMsg}`);
      markApplied("azimut", `azimut ${d.new_azimut.toFixed(1)}°`);
    } else {
      toast.error("Error al calibrar azimut");
    }
  };

  const handleSaveReference = async () => {
    if (!clickPoint) {
      toast.warning("Haz clic sobre el punto de referencia en el mapa primero");
      return;
    }
    const ok = await saveReference(cameraId, clickPoint.lat, clickPoint.lon);
    if (ok) {
      markApplied("azimut", "referencia azimut + tilt");
    } else {
      toast.error("No se pudo guardar la referencia");
    }
  };

  /** Paso 1 · Detecta la dirección del PAN y corrige panInvertido si hace falta. */
  const handleDetectPanDirection = async () => {
    setPending("detect");
    try {
      const res = await ptzDetectPanDirection(cameraId, true);
      if (res.ok && res.data) {
        setDetectResult(res.data);
        if (res.data.new_panInvertido !== undefined) {
          setLocalPanInvertido(res.data.new_panInvertido);
        }
        if (res.data.auto_fix_applied) {
          markApplied("pan", `panInvertido → ${res.data.new_panInvertido}`);
        } else if (res.data.match) {
          markApplied("pan", "dirección PAN correcta");
        }
        toast.success(res.data.message);
        await refreshCalibrationStatus(cameraId);
        queryClient.invalidateQueries({ queryKey: ["config-devices"] });
      } else {
        toast.error("Error al detectar la dirección PAN");
      }
    } finally {
      setPending(null);
    }
  };

  /** Paso 3 · Establece el valor ABSOLUTO del panOffset (no lo suma). */
  const handleAdjustOffset = async () => {
    const deg = Number(panOffsetInput);
    if (!Number.isFinite(deg)) {
      toast.error("Ingresa un valor de offset válido");
      return;
    }
    setPending("offset");
    try {
      const res = await ptzAdjustPanOffset(cameraId, deg);
      if (res.ok && res.data) {
        setOffsetResult(res.data);
        setLocalPanOffset(res.data.new_offset);
        setPanOffsetInput(String(res.data.new_offset));
        toast.success(res.data.message);
        markApplied("offset", `panOffset ${res.data.new_offset.toFixed(1)}°`);
        await refreshCalibrationStatus(cameraId);
        queryClient.invalidateQueries({ queryKey: ["config-devices"] });
      } else {
        toast.error("Error al corregir el offset");
      }
    } finally {
      setPending(null);
    }
  };

  /** Verifica la calibración moviendo la cámara a posiciones de prueba. */
  const handleVerifyCalibration = async () => {
    setPending("verify");
    try {
      const res = await ptzVerifyCalibration(cameraId);
      if (res.ok && res.data) {
        setVerifyResult(res.data);
        if (res.data.all_ok) {
          markApplied("verify", "calibración coherente");
          toast.success("Calibración verificada correctamente");
        } else {
          toast.warning("La calibración no es coherente. Revisa los detalles.");
        }
      } else {
        toast.error("Error al verificar la calibración");
      }
    } finally {
      setPending(null);
    }
  };

  // ── Inclinación real: leer al abrir y sincronizar tras cada movimiento ──
  useEffect(() => {
    let active = true;
    ptzGetTiltInclination(cameraId).then((res) => {
      if (active && res.ok && res.data) {
        setTiltAngle(Number(res.data.inclination.toFixed(1)));
      }
    });
    return () => {
      active = false;
    };
  }, [cameraId]);

  const onCommitTilt = (angle: number) => {
    if (Number.isNaN(angle)) return;
    setTiltMoved(true);
    ptzSetTiltInclination(cameraId, angle, true).then((res) => {
      if (res.ok && res.data) {
        setTiltAngle(Number(res.data.inclination.toFixed(1)));
      }
    });
  };

  /** Guarda la posición actual como nueva referencia de inclinación (0°). */
  const handleSaveTiltCalibration = async () => {
    setSavingTilt(true);
    try {
      const usedRef = refDistance > 0;
      const res = await ptzCalibrateTilt(
        cameraId,
        usedRef ? refDistance : undefined,
        usedRef && calcHeight != null ? calcHeight : undefined,
      );
      if (res.ok && res.data) {
        setTiltAngle(0);
        setTiltMoved(false);
        markApplied(
          "tilt",
          usedRef
            ? `0° a ${refDistance} m (altura ${calcHeight?.toFixed(1) ?? "—"} m)`
            : "0° = inclinación 0° (horizonte)",
        );
        toast.success(
          usedRef
            ? `Referencia guardada: 0° calibrado a ${refDistance} m`
            : "Referencia de inclinación guardada (nuevo 0°)",
        );
        await refreshCalibrationStatus(cameraId);
        queryClient.invalidateQueries({ queryKey: ["config-devices"] });
      } else {
        toast.error("Error al guardar la referencia de inclinación");
      }
    } finally {
      setSavingTilt(false);
    }
  };

  // Altura equivalente (ángulo → altura sobre el objetivo) en metros
  const calcHeight =
    tiltAngle == null
      ? null
      : OBJ_ALT + refDistance * Math.tan((tiltAngle * Math.PI) / 180);

  const stepsDone = Object.keys(applied).filter((k) =>
    ["pan", "azimut", "offset", "tilt", "verify"].includes(k),
  ).length;

  return (
    <div className="max-w-140 px-4 py-3 shadow-2xl w-full max-h-[85vh] overflow-x-hidden overflow-y-auto">
      <div className="flex items-center gap-2 mb-2">
        <span className="font-semibold text-sm text-text-100">
          Calibración PTZ: {cameraName}
        </span>
      </div>

      {/* ── Leyenda del mapa ── */}
      <div className="rounded-lg border border-border bg-bg-200/40 px-3 py-2 mb-2">
        <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest block mb-1.5">
          Líneas en el mapa
        </span>
        <div className="flex flex-col gap-1 text-[10px] leading-snug">
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-0.5 w-6 rounded"
              style={{
                backgroundColor: "#00d4ff",
                boxShadow: "0 0 6px rgba(0,212,255,0.8)",
              }}
            />
            <span className="text-white font-medium">Vista actual de la cámara</span>
            <span className="text-zinc-400">— girá hasta que coincida con el punto</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-1 w-6 rounded"
              style={{
                backgroundColor: "#ebbe35",
                boxShadow: "0 0 6px rgba(235,190,53,0.6)",
              }}
            />
            <span className="text-zinc-300">Punto 0 (referencia pan 0°)</span>
            <span className="text-zinc-500">— no es hacia dónde mira la cámara</span>
          </div>
        </div>
      </div>

      {/* ── Progreso del flujo guiado ── */}
      <div className="flex items-center gap-1 mb-3 rounded-lg border border-border bg-bg-200/40 px-3 py-2">
        <IconChecklist size={14} className="text-blue-400 shrink-0" />
        <div className="flex flex-1 items-center justify-between gap-0.5">
          {[
            { key: "pan", label: "1 PAN" },
            { key: "azimut", label: "2 Rumbo" },
            { key: "offset", label: "3 Offset" },
            { key: "tilt", label: "4 Tilt" },
            { key: "verify", label: "5 Verificar" },
          ].map((s) => {
            const done = applied[s.key];
            return (
              <span
                key={s.key}
                title={done ? `Aplicado: ${done.label} · ${done.at}` : s.label}
                className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-bold transition-colors ${
                  done
                    ? "bg-emerald-950/60 text-emerald-400 border border-emerald-700/50"
                    : "bg-bg-300/50 text-zinc-500 border border-transparent"
                }`}
              >
                {done ? <IconCheck size={10} /> : null}
                {s.label}
              </span>
            );
          })}
        </div>
        <span className="text-[9px] font-mono text-zinc-400 shrink-0">
          {stepsDone}/5
        </span>
      </div>

      {/* ── Estado actual ── */}
      <div className="rounded-lg border border-border bg-bg-200/40 px-3 py-2 mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">
            Estado actual
          </span>
          {calibrationStatus && (
            <span
              className={`text-[10px] font-mono ${
                calibrationStatus.all_covered
                  ? "text-green-400"
                  : "text-red-400"
              }`}
            >
              {calibrationStatus.covered_count}/
              {calibrationStatus.total_zones} zonas
            </span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-1 text-center">
          <div className="bg-zinc-800/80 rounded-md py-1">
            <div className="text-zinc-500 text-[9px] uppercase">Azimut</div>
            <div className="text-green-400 font-mono text-sm font-bold">
              {azimutActual.toFixed(1)}°
            </div>
          </div>
          <div className="bg-zinc-800/80 rounded-md py-1">
            <div className="text-zinc-500 text-[9px] uppercase">Pan offset</div>
            <div className="text-amber-400 font-mono text-sm font-bold">
              {localPanOffset > 0 ? "+" : ""}
              {localPanOffset.toFixed(1)}°
            </div>
          </div>
          <div className="bg-zinc-800/80 rounded-md py-1">
            <div className="text-zinc-500 text-[9px] uppercase">Pan inv.</div>
            <div className="text-cyan-400 font-mono text-sm font-bold">
              {panInvertidoActual === 1 ? "Sí" : "No"}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {/* ── Paso 1: Verificar dirección PAN ── */}
        <StepCard
          step={1}
          title="Verificar dirección PAN"
          accent="purple"
          icon={<IconRotate size={14} />}
          applied={applied.pan}
        >
          <p className="text-zinc-400 text-[10px] leading-snug mb-2">
            Mueve la cámara y detecta si{" "}
            <strong className="text-white">panInvertido</strong> está bien
            configurado. Corrige automáticamente si hace falta y recalcula el
            azimut.
          </p>
          <button
            onClick={handleDetectPanDirection}
            disabled={pending !== null}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors"
          >
            <IconCrosshair size={14} />
            {pending === "detect"
              ? "Detectando..."
              : "1 · Confirmar y guardar dirección"}
          </button>

          {detectResult && (
            <div
              className={`mt-2 rounded-md px-2 py-1.5 text-xs leading-snug border ${
                detectResult.match || detectResult.auto_fix_applied
                  ? "bg-emerald-950/50 border-emerald-800/50 text-emerald-300"
                  : "bg-red-950/50 border-red-800/50 text-red-300"
              }`}
            >
              <p className="flex items-start gap-1.5">
                {detectResult.match || detectResult.auto_fix_applied ? (
                  <IconCheck size={12} className="mt-0.5 shrink-0" />
                ) : (
                  <IconAlertTriangle size={12} className="mt-0.5 shrink-0" />
                )}
                <span>{detectResult.message}</span>
              </p>
              <p className="text-zinc-400 mt-1 font-mono">
                pan {detectResult.pan_before.toFixed(1)}° →{" "}
                {detectResult.pan_after.toFixed(1)}° · Δ{" "}
                {detectResult.delta_deg.toFixed(1)}°
                {detectResult.auto_fix_applied &&
                  detectResult.new_panInvertido !== undefined &&
                  ` · panInvertido → ${detectResult.new_panInvertido}`}
              </p>
            </div>
          )}
        </StepCard>

        {/* ── Paso 2: Calibrar azimut / rumbo ── */}
        <StepCard
          step={2}
          title="Calibrar azimut (rumbo)"
          accent="emerald"
          icon={<IconCompass size={14} />}
          applied={applied.azimut}
        >
          <p className="text-zinc-300 text-[10px] leading-snug mb-2">
            1. Apunta la cámara al punto conocido (joystick o "girar").
            2. Haz clic en el mapa sobre ese punto y confirma la referencia.
          </p>

          {/* Principal: punto en el mapa → guardar referencia */}
          <div className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-2">
            <div className="flex items-center gap-2 mb-1.5">
              <IconMapPin size={13} className="text-cyan-400 shrink-0" />
              <span className="text-cyan-200 text-[10px] font-semibold">
                Punto en el mapa + confirmar
              </span>
              <button
                onClick={onToggleMode}
                className="ml-auto px-2 py-0.5 rounded-md bg-cyan-700/60 hover:bg-cyan-600 text-white text-[10px] font-medium transition-colors"
              >
                {isSave ? "Volver a girar" : "Guardar referencia"}
              </button>
            </div>

            {isSave ? (
              <>
                <p className="text-zinc-300 text-[10px] leading-snug mb-1.5">
                  Al hacer clic marcás el punto en el mapa (la cámara no se
                  mueve). Apuntala al punto conocido con el joystick, hace clic
                  y confirma abajo:
                </p>
                {clickPoint && (
                  <div className="flex items-center gap-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 px-2 py-1 mb-1.5 text-[10px]">
                    <IconMapPin
                      size={12}
                      className="text-emerald-400 shrink-0"
                    />
                    <span className="text-emerald-300 font-mono">
                      {clickPoint.lat.toFixed(6)}, {clickPoint.lon.toFixed(6)}
                    </span>
                  </div>
                )}
                <button
                  onClick={handleSaveReference}
                  disabled={!clickPoint}
                  className="w-full flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors"
                >
                  <IconCheck size={14} />
                  2 · Guardar y confirmar referencia
                </button>
              </>
            ) : (
              <>
                <p className="text-zinc-300 text-[10px] leading-snug mb-1.5">
                  Con "girar" activo, al hacer clic en el mapa la cámara
                  apunta a ese punto (sin guardar). Usala para llevarla al
                  lugar correcto y después tocá{" "}
                  <strong className="text-white">"Guardar referencia"</strong>.
                </p>
                <button
                  onClick={onToggleMode}
                  className="w-full flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-700/60 hover:bg-cyan-600 text-white text-xs font-medium transition-colors"
                >
                  <IconMapPin size={13} />
                  Entrar en "Guardar referencia"
                </button>
              </>
            )}
          </div>

          {/* Alternativa: confirmar por rumbo numérico */}
          <details className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-2 mt-2">
            <summary className="cursor-pointer flex items-center gap-1.5 text-amber-300 text-[10px] font-semibold select-none">
              <IconCompass size={13} className="shrink-0" />
              Alternativa: escribir el rumbo en grados
            </summary>

            <div className="mt-2">
              {/* Puntos cardinales */}
              <div className="grid grid-cols-4 gap-1 mb-2">
                {COMPASS_DIRECTIONS.map((d) => (
                  <button
                    key={d.label}
                    onClick={() => handleAimBearing(d.bearing)}
                    className="px-1 py-1.5 rounded-md bg-emerald-700/60 hover:bg-emerald-600 text-white text-[10px] font-bold transition-colors"
                    title={`Apuntar al rumbo ${d.bearing}°`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>

              {/* Entrada numérica + apuntar */}
              <div className="flex gap-1.5 items-center mb-2">
                <input
                  type="number"
                  min={0}
                  max={359}
                  value={bearingInput}
                  onChange={(e) => setBearingInput(e.target.value)}
                  className="flex-1 min-w-0 text-xs bg-zinc-800 border border-zinc-600 rounded-md px-2 py-1.5 text-white font-mono focus:outline-none focus:border-emerald-500"
                />
                <span className="text-zinc-400 text-xs font-mono">°</span>
                <button
                  onClick={() => handleAimBearing(currentBearing)}
                  className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-md bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-medium transition-colors"
                >
                  <IconTarget size={13} />
                  Apuntar
                </button>
              </div>

              {/* Confirmar por rumbo */}
              <button
                onClick={handleCalibrateAzimut}
                className="w-full flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-600 text-white text-xs font-medium transition-colors"
              >
                <IconCheck size={14} />
                Confirmar azimut ({currentBearing}°)
              </button>
            </div>
          </details>
        </StepCard>

        {/* ── Paso 3: Corregir offset ── */}
        <StepCard
          step={3}
          title="Corregir offset fijo"
          accent="amber"
          icon={<IconAdjustments size={14} />}
          applied={applied.offset}
        >
          <p className="text-zinc-400 text-[10px] leading-snug mb-2">
            Este campo es el{" "}
            <strong className="text-white">valor absoluto</strong> del
            panOffset (el que se suma al rumbo del encoder para llegar al de
            brújula) y se precarga con el valor actual de la cámara. Escribe el
            número tal cual debe quedar, sin sumar: si dice{" "}
            <span className="font-mono text-white">30</span> y guardas, queda{" "}
            <span className="font-mono text-white">30</span>, no 60.
          </p>
          <div className="flex gap-1.5 items-center">
            <input
              type="number"
              step="any"
              value={panOffsetInput}
              onChange={(e) => setPanOffsetInput(e.target.value)}
              placeholder="0"
              className="flex-1 min-w-0 text-xs bg-zinc-800 border border-zinc-600 rounded-md px-2 py-1.5 text-white font-mono focus:outline-none focus:border-amber-500"
            />
            <span className="text-zinc-400 text-xs font-mono">°</span>
            <button
              onClick={handleAdjustOffset}
              disabled={pending !== null}
              className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-md bg-amber-700 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors"
            >
              {pending === "offset" ? "Aplicando..." : "3 · Guardar offset"}
            </button>
          </div>
          {offsetResult && (
            <p className="mt-2 text-xs text-emerald-300 flex items-center gap-1.5">
              <IconCheck size={12} className="shrink-0" />
              {offsetResult.message}
            </p>
          )}
        </StepCard>

        {/* ── Paso 4: Calibrar altura / inclinación ── */}
        <StepCard
          step={4}
          title="Calibrar inclinación (tilt)"
          accent="indigo"
          icon={<IconAdjustments size={14} />}
          applied={applied.tilt}
        >
          <p className="text-zinc-400 text-[10px] leading-snug mb-2">
            El slider <strong className="text-white">mueve la cámara en vivo
            pero no guarda</strong>. Cuando esté apuntando como quieras,
            confirma esa posición como nuevo{" "}
            <strong className="text-white">0°</strong> (horizonte).
          </p>

          {tiltMoved && !applied.tilt && (
            <div className="flex items-center gap-1.5 rounded-md bg-amber-950/40 border border-amber-700/40 px-2 py-1 mb-2 text-amber-300 text-[10px]">
              <IconClock size={12} className="shrink-0" />
              Cambio sin guardar: confirma la inclinación abajo para aplicarlo.
            </div>
          )}

          <TiltSlider
            value={tiltAngle == null ? "" : String(tiltAngle)}
            onChange={(v) => setTiltAngle(v === "" ? 0 : Number(v))}
            onCommit={onCommitTilt}
            label="Inclinación actual (°)"
            hint="Ángulo real de la cámara"
          />

          {/* Distancia de referencia + altura calculada */}
          <div className="mt-2 flex items-end gap-2">
            <label className="flex flex-col gap-0.5 flex-1 min-w-0">
              <span className="text-[9px] font-semibold text-zinc-400 uppercase tracking-widest">
                Distancia de referencia (m)
              </span>
              <input
                type="number"
                min={1}
                max={10000}
                value={String(refDistance)}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (!Number.isNaN(v) && v > 0) {
                    setRefDistance(v);
                    localStorage.setItem(
                      `ptz-ref-distance-${cameraId}`,
                      String(v),
                    );
                  }
                }}
                className="text-xs bg-zinc-800 border border-zinc-600 rounded-md px-2 py-1.5 text-white font-mono focus:outline-none focus:border-orange-500 w-full"
              />
            </label>
            <div className="rounded-md bg-zinc-800/70 border border-zinc-700 px-2 py-1 text-center min-w-[7rem]">
              <div className="text-zinc-500 text-[9px] uppercase">
                Altura eq.
              </div>
              <div className="text-indigo-300 font-mono text-sm font-bold">
                {calcHeight == null ? "—" : `${calcHeight.toFixed(1)} m`}
              </div>
            </div>
          </div>
          {tiltAngle != null && (
            <p className="text-zinc-400 text-[9px] leading-snug mt-1">
              Equivale a apuntar a un objetivo a {refDistance} m de distancia
              con la cámara a{" "}
              {calcHeight == null ? "—" : calcHeight.toFixed(1)} m de altura
              {calibrationStatus && calibrationStatus.altura_m > 0
                ? ` (montaje: ${calibrationStatus.altura_m.toFixed(1)} m)`
                : ""}
              .
            </p>
          )}

          <button
            onClick={handleSaveTiltCalibration}
            disabled={savingTilt || tiltAngle == null}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-700 hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors mt-2"
          >
            <IconCheck size={14} />
            {savingTilt
              ? "Guardando..."
              : "4 · Confirmar y guardar como 0°"}
          </button>
        </StepCard>

        {/* ── Paso 5: Verificar calibración ── */}
        <StepCard
          step={5}
          title="Verificar calibración"
          accent="cyan"
          icon={<IconShieldCheck size={14} />}
          applied={applied.verify}
        >
          <p className="text-zinc-400 text-[10px] leading-snug mb-2">
            Mueve la cámara a posiciones de prueba (home y 90°) y valida que la
            calibración esté coherente. No guarda nada.
          </p>
          <button
            onClick={handleVerifyCalibration}
            disabled={pending !== null}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-700 hover:bg-cyan-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors"
          >
            <IconShieldCheck size={14} />
            {pending === "verify" ? "Verificando..." : "5 · Verificar calibración"}
          </button>

          {verifyResult && (
            <div className="mt-2 space-y-1.5">
              <p
                className={`text-xs flex items-center gap-1.5 font-medium ${
                  verifyResult.all_ok ? "text-green-400" : "text-red-400"
                }`}
              >
                {verifyResult.all_ok ? (
                  <IconCheck size={12} className="shrink-0" />
                ) : (
                  <IconAlertTriangle size={12} className="shrink-0" />
                )}
                {verifyResult.all_ok
                  ? "Calibración verificada correctamente"
                  : "Calibración no coherente"}
              </p>
              <div className="grid grid-cols-2 gap-1">
                <TestResult label="Home" test={verifyResult.test_home} />
                <TestResult label="90°" test={verifyResult.test_90} />
              </div>
              {verifyResult.issues.length > 0 && (
                <ul className="space-y-0.5">
                  {verifyResult.issues.map((issue) => (
                    <li
                      key={issue}
                      className="text-red-300 text-[10px] leading-snug flex items-start gap-1"
                    >
                      <IconAlertTriangle size={11} className="mt-0.5 shrink-0" />
                      {issue}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </StepCard>
      </div>

      {result && (
        <>
          {/* Resultados */}
          <div className="grid grid-cols-2 gap-2 mb-3 text-xs mt-3">
            <div className="bg-zinc-800/80 rounded-lg px-3 py-2">
              <div className="text-zinc-400">Azimut (pan 0°)</div>
              <div className="text-green-400 font-mono text-lg font-bold">
                {result.recommended_azimut.toFixed(1)}°
              </div>
            </div>
            <div className="bg-zinc-800/80 rounded-lg px-3 py-2">
              <div className="text-zinc-400">Rumbo</div>
              <div className="text-green-400 font-mono text-lg font-bold">
                {result.bearing.toFixed(1)}°
              </div>
            </div>
            {result.pan !== undefined && (
              <div className="bg-zinc-800/80 rounded-lg px-3 py-2">
                <div className="text-zinc-400">Pan (encoder)</div>
                <div className="text-amber-400 font-mono text-lg font-bold">
                  {result.pan.toFixed(1)}°
                </div>
              </div>
            )}
            {result.tilt !== undefined && (
              <div className="bg-zinc-800/80 rounded-lg px-3 py-2">
                <div className="text-zinc-400">Tilt (encoder)</div>
                <div className="text-amber-400 font-mono text-lg font-bold">
                  {result.tilt.toFixed(1)}°
                </div>
              </div>
            )}
          </div>

          <p className="text-zinc-400 text-xs mb-3 flex items-center gap-1.5">
            <IconBulb size={14} className="text-yellow-400 shrink-0" />
            El azimut quedó fijado al último rumbo calibrado.
          </p>
        </>
      )}
      {/* Estado de cobertura de zonas PTZ activas */}
      <CalibrationCoverageInfo status={calibrationStatus} />

      {/* Cerrar */}
      <button
        onClick={onCancel}
        className="w-full flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition-colors mt-2"
      >
        <IconX size={14} />
        Cerrar
      </button>
    </div>
  );
}

/** Tarjeta de paso del flujo guiado con badge de "aplicado". */
function StepCard({
  step,
  title,
  accent,
  icon,
  applied,
  children,
}: {
  step: number;
  title: string;
  accent: "purple" | "emerald" | "amber" | "indigo" | "cyan";
  icon: ReactNode;
  applied?: AppliedStep;
  children: ReactNode;
}) {
  const styles: Record<string, string> = {
    purple: "border-purple-500/30 bg-purple-500/10 text-purple-300",
    emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    indigo: "border-indigo-500/30 bg-indigo-500/10 text-indigo-300",
    cyan: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
  };
  return (
    <div
      className={`rounded-lg border px-3 py-2 ${styles[accent]}`}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-bg-300 text-[9px] font-bold text-text-100 shrink-0">
          {step}
        </span>
        <span className="text-xs font-semibold">{title}</span>
        {applied ? (
          <span
            title={`Aplicado a las ${applied.at}`}
            className="ml-auto flex items-center gap-1 rounded-md bg-emerald-950/60 border border-emerald-700/40 px-1.5 py-0.5 text-[9px] font-bold text-emerald-300"
          >
            <IconCheck size={10} className="shrink-0" />
            {applied.label}
            <span className="text-emerald-400/50 font-mono">{applied.at}</span>
          </span>
        ) : (
          <span className="ml-auto text-[9px] font-semibold text-zinc-500">
            sin confirmar
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

/** Resumen de una prueba individual del verify-calibration (home o 90°). */
function TestResult({
  label,
  test,
}: {
  label: string;
  test: VerifyTestResult;
}) {
  return (
    <div className="rounded-md bg-zinc-800/70 px-2 py-1">
      <div className="text-zinc-500 text-[9px] uppercase">{label}</div>
      <div className="flex items-center justify-between">
        <span className="text-zinc-300 font-mono text-[10px]">
          {test.target_pan.toFixed(1)}° → {test.actual_pan.toFixed(1)}°
        </span>
        <span
          className={
            test.ok ? "text-green-400 text-[10px]" : "text-red-400 text-[10px]"
          }
        >
          {test.error_deg.toFixed(1)}° {test.ok ? "✓" : "✗"}
        </span>
      </div>
    </div>
  );
}