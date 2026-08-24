import { useState } from "react";
import {
  IconAdjustments,
  IconAlertTriangle,
  IconBulb,
  IconCheck,
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
  type DetectPanDirectionResponse,
  type AdjustPanOffsetResponse,
  type VerifyCalibrationResponse,
  type VerifyTestResult,
} from "../service";
import { CalibrationCoverageInfo } from "./CalibrationCoverageInfo";

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

/**
 * Panel flotante de calibración PTZ.
 *
 * Flujo guiado:
 *  - Paso 1: detectar la dirección del PAN (panInvertido) con auto-fix.
 *  - Paso 2: calibrar apuntando la cámara a un punto conocido (por rumbo o
 *    marcándolo en el mapa) y guardando la referencia (azimut + tiltOffset).
 *  - Paso 3: corregir un offset fijo del pan si la cámara se desvía.
 *  - Verificar: mueve la cámara a posiciones de prueba y valida la calibración.
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
  const [panOffsetInput, setPanOffsetInput] = useState(String(panOffsetProp ?? 0));
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

  const calibrationStatus = useCameraCalibrationStore(
    (s) => s.calibrationStatus,
  );
  const clickPoint = useCameraCalibrationStore((s) => s.clickPoint);
  const setResult = useCameraCalibrationStore((s) => s.setResult);
  const setPreviewBearing = useCameraCalibrationStore((s) => s.setPreviewBearing);
  const refreshCalibrationStatus = useCameraCalibrationStore(
    (s) => s.refreshCalibrationStatus,
  );
  const { saveReference } = useCameraCalibration();
  const queryClient = useQueryClient();

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
        zoom: 0,
      });
      setPreviewBearing(d.bearing);
      await refreshCalibrationStatus(cameraId);
      queryClient.invalidateQueries({ queryKey: ["config-devices"] });
      const jumpMsg =
        d.remounted_likely
          ? "El azimut cambió más de 40°: verifica que la cámara apunte al rumbo indicado."
          : "";
      toast.success(`${d.message ?? "Azimut guardado"}.${jumpMsg}`);
    } else {
      toast.error("Error al calibrar azimut");
    }
  };

  const handleSaveReference = () => {
    if (!clickPoint) return;
    saveReference(cameraId, clickPoint.lat, clickPoint.lon);
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

  /** Paso 3 · Corrige un offset fijo del pan (grados a sumar al panOffset). */
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

  return (
    <div className="bg-zinc-900/95 backdrop-blur border border-zinc-700 rounded-xl px-4 py-3 shadow-2xl w-full max-h-[85vh] overflow-x-hidden overflow-y-auto">
      {/* Cabecera */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 rounded-full animate-pulse bg-amber-400" />
        <span className="font-semibold text-sm text-amber-400">
          Calibración PTZ: {cameraName}
        </span>
      </div>

      <div className="grid grid-cols-2">
        {/* ── Estado actual ── */}
        <div className="rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2 mb-2">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">
              Estado actual
            </span>
            {calibrationStatus && (
              <span
                className={`text-[10px] font-mono ${calibrationStatus.all_covered
                  ? "text-green-400"
                  : "text-red-400"
                  }`}
              >
                {calibrationStatus.covered_count}/{calibrationStatus.total_zones}{" "}
                zonas
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

        {/* ── Paso 1: Verificar dirección PAN ── */}
        <div className="rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-2 mb-2">
          <div className="flex items-center gap-1.5 mb-1.5">
            <IconRotate size={14} className="text-purple-400 shrink-0" />
            <span className="text-purple-300 text-[11px] font-semibold">
              Paso 1 · Verificar dirección PAN
            </span>
          </div>
          <p className="text-zinc-400 text-[10px] leading-snug mb-2">
            Mueve la cámara y detecta si{" "}
            <strong className="text-white">panInvertido</strong> está bien
            configurado (corrige automáticamente si hace falta).
          </p>
          <button
            onClick={handleDetectPanDirection}
            disabled={pending !== null}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors"
          >
            <IconCrosshair size={14} />
            {pending === "detect" ? "Detectando..." : "Detectar dirección PAN"}
          </button>

          {detectResult && (
            <div
              className={`mt-2 rounded-md px-2 py-1.5 text-[11px] leading-snug border ${detectResult.match || detectResult.auto_fix_applied
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
        </div>

        {/* ── Paso 2: Calibrar ── */}
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 mb-2">
          <div className="flex items-center gap-1.5 mb-1.5">
            <IconCompass size={14} className="text-emerald-400 shrink-0" />
            <span className="text-emerald-300 text-[11px] font-semibold">
              Paso 2 · Calibrar
            </span>
          </div>
          <p className="text-zinc-300 text-[10px] leading-snug mb-2">
            1. Apunta la cámara al punto conocido (rumbo abajo o flechas del
            joystick). 2. Marca ese punto en el mapa y guarda la calibración.
          </p>

          {/* Puntos cardinales */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-1 mb-2">
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
              className="flex-1 min-w-0 text-[11px] bg-zinc-800 border border-zinc-600 rounded-md px-2 py-1.5 text-white font-mono focus:outline-none focus:border-emerald-500"
            />
            <span className="text-zinc-400 text-xs font-mono">°</span>
            <button
              onClick={() => handleAimBearing(currentBearing)}
              className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-md bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-medium transition-colors"
            >
              <IconTarget size={13} />
              Apuntar
            </button>
          </div>

          {/* Calibrar azimut por rumbo */}
          <button
            onClick={handleCalibrateAzimut}
            className="w-full flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-700 hover:bg-cyan-600 text-white text-xs font-medium transition-colors"
          >
            <IconCrosshair size={14} />
            Calibrar azimut con rumbo {currentBearing}°
          </button>

          {/* Alternativa: punto en el mapa */}
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-2 mt-2">
            <div className="flex items-center gap-2 mb-1.5">
              <IconMapPin size={13} className="text-amber-400 shrink-0" />
              <span className="text-amber-300 text-[10px] font-semibold">
                Alternativa: punto en el mapa
              </span>
              <button
                onClick={onToggleMode}
                className="ml-auto px-2 py-0.5 rounded-md bg-amber-700/60 hover:bg-amber-600 text-white text-[10px] font-medium transition-colors"
              >
                {isSave ? "Volver a girar" : "Guardar referencia"}
              </button>
            </div>

            {isSave ? (
              <>
                <p className="text-zinc-300 text-[10px] leading-snug mb-1.5">
                  Apunta la cámara físicamente a un punto conocido del terreno y
                  haz clic sobre él en el mapa; luego confirma abajo.
                </p>
                {clickPoint && (
                  <div className="flex items-center gap-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 px-2 py-1 mb-1.5 text-[10px]">
                    <IconMapPin size={12} className="text-emerald-400 shrink-0" />
                    <span className="text-emerald-300 font-mono">
                      {clickPoint.lat.toFixed(6)}, {clickPoint.lon.toFixed(6)}
                    </span>
                  </div>
                )}
                <button
                  onClick={handleSaveReference}
                  disabled={!clickPoint}
                  className="w-full flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-700 hover:bg-cyan-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors"
                >
                  <IconTarget size={14} />
                  Guardar calibración
                </button>
              </>
            ) : (
              <p className="text-zinc-300 text-[10px] leading-snug">
                Haz clic en el mapa y la cámara girará hacia ese punto (sin
                guardar). Usa "Guardar referencia" para fijar el punto.
              </p>
            )}
          </div>
        </div>

        {/* ── Paso 3: Corregir offset ── */}
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 mb-2">
          <div className="flex items-center gap-1.5 mb-1.5">
            <IconAdjustments size={14} className="text-amber-400 shrink-0" />
            <span className="text-amber-300 text-[11px] font-semibold">
              Paso 3 · Corregir offset fijo
            </span>
          </div>
          <p className="text-zinc-400 text-[10px] leading-snug mb-2">
            Si la cámara se desvía a la <strong className="text-white">derecha</strong>{" "}
            X° usa <span className="font-mono text-white">+X</span>; si se desvía
            a la <strong className="text-white">izquierda</strong> usa{" "}
            <span className="font-mono text-white">-X</span>.
          </p>
          <div className="flex gap-1.5 items-center">
            <input
              type="number"
              step="any"
              value={panOffsetInput}
              onChange={(e) => setPanOffsetInput(e.target.value)}
              placeholder="0"
              className="flex-1 min-w-0 text-[11px] bg-zinc-800 border border-zinc-600 rounded-md px-2 py-1.5 text-white font-mono focus:outline-none focus:border-amber-500"
            />
            <span className="text-zinc-400 text-xs font-mono">°</span>
            <button
              onClick={handleAdjustOffset}
              disabled={pending !== null}
              className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-md bg-amber-700 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[11px] font-medium transition-colors"
            >
              {pending === "offset" ? "Aplicando..." : "Corregir offset"}
            </button>
          </div>
          {offsetResult && (
            <p className="mt-2 text-[11px] text-emerald-300 flex items-center gap-1.5">
              <IconCheck size={12} className="shrink-0" />
              {offsetResult.message}
            </p>
          )}
        </div>

        {/* ── Verificar calibración ── */}
        <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 mb-2">
          <button
            onClick={handleVerifyCalibration}
            disabled={pending !== null}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-700 hover:bg-cyan-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors"
          >
            <IconShieldCheck size={14} />
            {pending === "verify" ? "Verificando..." : "Verificar calibración"}
          </button>

          {verifyResult && (
            <div className="mt-2 space-y-1.5">
              <p
                className={`text-[11px] flex items-center gap-1.5 font-medium ${verifyResult.all_ok ? "text-green-400" : "text-red-400"
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
        </div>

        {result && (
          <>
            {/* Resultados */}
            <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
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

      </div>
      {/* Estado de cobertura de zonas PTZ activas */}
      <CalibrationCoverageInfo status={calibrationStatus} />

      {/* Cerrar */}
      <button
        onClick={onCancel}
        className="w-full flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition-colors"
      >
        <IconX size={14} />
        Cerrar
      </button>
    </div>
  );
}

/** Resumen de una prueba individual del verify-calibration (home o 90°). */
function TestResult({ label, test }: { label: string; test: VerifyTestResult }) {
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
