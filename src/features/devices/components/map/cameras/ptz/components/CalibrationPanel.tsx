import { useState } from "react";
import {
  IconBulb,
  IconCompass,
  IconCrosshair,
  IconX,
  IconTarget,
  IconCheck,
  IconMapPin,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCameraCalibrationStore,
  type CalibrationResult,
} from "../../../../../stores/cameraCalibrationStore";
import { useCameraCalibration } from "../../../../../hooks/useCameraCalibration";
import { ptzGotoBearing, ptzCalibrateBearing } from "../service";
import { CalibrationCoverageInfo } from "./CalibrationCoverageInfo";

export type CalibrationMode = "goto" | "save";

export interface CalibrationPanelProps {
  cameraId: number;
  cameraName: string;
  result: CalibrationResult | null;
  mode: CalibrationMode;
  onToggleMode: () => void;
  onCancel: () => void;
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

/**
 * Panel flotante de calibración PTZ v2.
 *
 * Método principal (NUEVO, por rumbo): apuntar la cámara a una dirección de
 * brújula con un clic (giro directo) y luego "Calibrar azimut" con el rumbo
 * al que quedó apuntando. No necesita clic en el mapa.
 *
 * Método secundario (mapa): modo "goto" gira al punto clicado; modo "save"
 * marca el punto y "Guardar referencia" escribe azimut+tiltOffset.
 */
export function CalibrationPanel({
  cameraId,
  cameraName,
  result,
  mode,
  onToggleMode,
  onCancel,
}: CalibrationPanelProps) {
  const isSave = mode === "save";
  const [bearingInput, setBearingInput] = useState("0");
  const calibrationStatus = useCameraCalibrationStore(
    (s) => s.calibrationStatus,
  );
  const clickPoint = useCameraCalibrationStore((s) => s.clickPoint);
  const setResult = useCameraCalibrationStore((s) => s.setResult);
  const setPreviewBearing = useCameraCalibrationStore((s) => s.setPreviewBearing);
  const refreshCalibrationStatus = useCameraCalibrationStore(
    (s) => s.refreshCalibrationStatus,
  );
  const { gotoGps, saveReference } = useCameraCalibration();
  const queryClient = useQueryClient();

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

  const handleVerify = () => {
    const home = calibrationStatus?.home;
    if (home) {
      gotoGps(cameraId, home.lat, home.lon);
    }
  };

  const handleSaveReference = () => {
    if (!clickPoint) return;
    saveReference(cameraId, clickPoint.lat, clickPoint.lon);
  };

  return (
    <div className="absolute -top-7/5 left-1/2 -translate-x-1/2 z-50 bg-zinc-900/95 backdrop-blur border border-zinc-700 rounded-xl px-4 py-3 shadow-2xl min-w-70 max-w-sm max-h-[85vh] overflow-x-hidden overflow-y-auto">
      {/* Cabecera */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 rounded-full animate-pulse bg-amber-400" />
        <span className="font-semibold text-sm text-amber-400">
          Calibración por rumbo: {cameraName}
        </span>
      </div>

      {/* ── Método por rumbo (NUEVO) ── */}
      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 mb-2">
        <p className="text-[11px] text-emerald-300 leading-snug flex items-start gap-1.5 mb-2">
          <IconCompass size={14} className="shrink-0 mt-0.5" />
          Elige una dirección (rumbo) y la cámara gira <strong>directo</strong>{" "}
          en un solo movimiento. Después calibra el azimut con el rumbo al que
          quedó apuntando.
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
        <div className="flex gap-1.5 items-center">
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

        {/* Calibrar azimut */}
        <button
          onClick={handleCalibrateAzimut}
          className="w-full flex items-center justify-center gap-1 mt-2 px-3 py-1.5 rounded-lg bg-cyan-700 hover:bg-cyan-600 text-white text-xs font-medium transition-colors"
        >
          <IconCrosshair size={14} />
          Calibrar azimut con rumbo {currentBearing}°
        </button>
        <p className="text-zinc-400 text-[10px] leading-snug mt-1.5">
          Antes de calibrar, asegúrate de que la cámara esté{" "}
          <strong className="text-white">apuntando físicamente</strong> al rumbo
          que indicas (úsalo arriba o las flechas para moverla).
        </p>
      </div>

      {/* ── Método por mapa (secundario) ── */}
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 mb-2">
        <div className="flex items-center gap-2 mb-1.5">
          <IconMapPin size={14} className="text-amber-400 shrink-0" />
          <span className="text-amber-300 text-[11px] font-semibold">
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
              Guardar referencia
            </button>
          </>
        ) : (
          <p className="text-zinc-300 text-[10px] leading-snug">
            Haz clic en el mapa y la cámara girará hacia ese punto (no guarda).
          </p>
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

      {/* Estado de cobertura de zonas PTZ activas */}
      <CalibrationCoverageInfo status={calibrationStatus} />

      {/* Verificar: girar al centro de zonas con el azimut vigente */}
      {calibrationStatus?.home && (
        <button
          onClick={handleVerify}
          className="w-full flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-700/70 hover:bg-emerald-600 text-white text-xs font-medium transition-colors mb-2"
        >
          <IconCheck size={14} />
          Verificar calibración (girar al centro de zonas)
        </button>
      )}

      {/* Botones */}
      <div className="flex gap-2">
        {isSave ? (
          <>
            <button
              onClick={handleSaveReference}
              disabled={!clickPoint}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-700 hover:bg-cyan-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors"
            >
              <IconTarget size={14} />
              Guardar referencia
            </button>
            <button
              onClick={onToggleMode}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-yellow-600 hover:bg-yellow-500 text-white text-xs font-medium transition-colors"
            >
              <IconCrosshair size={14} />
              Volver a girar
            </button>
          </>
        ) : (
          <button
            onClick={onToggleMode}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium transition-colors"
          >
            <IconTarget size={14} />
            Guardar referencia
          </button>
        )}
        <button
          onClick={onCancel}
          className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition-colors"
        >
          <IconX size={14} />
          Cerrar
        </button>
      </div>
    </div>
  );
}
