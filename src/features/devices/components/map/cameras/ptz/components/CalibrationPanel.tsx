import {
  IconBulb,
  IconCrosshair,
  IconX,
  IconTarget,
} from "@tabler/icons-react";
import {
  useCameraCalibrationStore,
  type CalibrationResult,
} from "../../../../../stores/cameraCalibrationStore";
import { CalibrationCoverageInfo } from "./CalibrationCoverageInfo";

export type CalibrationMode = "goto" | "setPointZero";

export interface CalibrationPanelProps {
  cameraName: string;
  result: CalibrationResult | null;
  mode: CalibrationMode;
  onToggleMode: () => void;
  onCancel: () => void;
}

/**
 * Panel flotante de calibración.
 *
 * - Modo "goto" (por defecto): al hacer clic en el mapa la cámara GIRA.
 * - Modo "setPointZero": al hacer clic en el mapa se FIJA el punto 0 (azimut).
 */
export function CalibrationPanel({
  cameraName,
  result,
  mode,
  onToggleMode,
  onCancel,
}: CalibrationPanelProps) {
  const isSetPointZero = mode === "setPointZero";
  const calibrationStatus = useCameraCalibrationStore(
    (s) => s.calibrationStatus,
  );

  return (
    <div className="absolute -top-1/2 left-1/2 -translate-x-1/2 z-50 bg-zinc-900/95 backdrop-blur border border-zinc-700 rounded-xl px-4 py-3 shadow-2xl min-w-70">
      {/* Cabecera */}
      <div className="flex items-center gap-2 mb-2">
        <div
          className={`w-2 h-2 rounded-full animate-pulse ${
            isSetPointZero ? "bg-cyan-400" : "bg-yellow-500"
          }`}
        />
        <span
          className={`font-semibold text-sm ${
            isSetPointZero ? "text-cyan-400" : "text-yellow-400"
          }`}
        >
          {isSetPointZero ? "Fijar punto 0" : "Calibrando"}: {cameraName}
        </span>
      </div>

      {/* Instrucciones según el modo */}
      {isSetPointZero ? (
        <p className="text-zinc-400 text-xs mb-3 flex items-center gap-1.5">
          <IconCrosshair size={14} className="text-cyan-400 shrink-0" />
          Apunta la cámara a un punto conocido y haz clic sobre él en el mapa.
          Ese rumbo quedará como referencia (punto 0).
        </p>
      ) : (
        <p className="text-zinc-400 text-xs mb-3 flex items-center gap-1.5">
          <IconTarget size={14} className="text-yellow-400 shrink-0" />
          Haz clic en el mapa y la cámara girará hacia ese punto.
        </p>
      )}

      {result && (
        <>
          {/* Resultados */}
          <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
            <div className="bg-zinc-800/80 rounded-lg px-3 py-2">
              <div className="text-zinc-400">Rumbo objetivo</div>
              <div className="text-green-400 font-mono text-lg font-bold">
                {result.bearing.toFixed(1)}°
              </div>
            </div>
            <div className="bg-zinc-800/80 rounded-lg px-3 py-2">
              <div className="text-zinc-400">Distancia</div>
              <div className="text-green-400 font-mono text-lg font-bold">
                {Math.round(result.distance_m)}m
              </div>
            </div>

            {result.pan !== undefined && (
              <div className="bg-zinc-800/80 rounded-lg px-3 py-2">
                <div className="text-zinc-400">Pan ONVIF</div>
                <div className="text-amber-400 font-mono text-lg font-bold">
                  {result.pan.toFixed(3)}
                </div>
              </div>
            )}
            {result.tilt !== undefined && (
              <div className="bg-zinc-800/80 rounded-lg px-3 py-2">
                <div className="text-zinc-400">Tilt ONVIF</div>
                <div className="text-amber-400 font-mono text-lg font-bold">
                  {result.tilt.toFixed(3)}
                </div>
              </div>
            )}
            {result.zoom !== undefined && (
              <div className="bg-zinc-800/80 rounded-lg px-3 py-2">
                <div className="text-zinc-400">Zoom ONVIF</div>
                <div className="text-amber-400 font-mono text-lg font-bold">
                  {result.zoom.toFixed(3)}
                </div>
              </div>
            )}
            {result.recommended_azimut !== undefined && (
              <div className="bg-zinc-800/80 rounded-lg px-3 py-2">
                <div className="text-zinc-400">Azimut (punto 0)</div>
                <div className="text-amber-400 font-mono text-lg font-bold">
                  {result.recommended_azimut.toFixed(1)}°
                </div>
              </div>
            )}
          </div>

          <p className="text-zinc-400 text-xs mb-3 flex items-center gap-1.5">
            <IconBulb size={14} className="text-yellow-400 shrink-0" />
            La cámara giró físicamente al rumbo{" "}
            <span className="text-white font-medium">
              {result.bearing.toFixed(1)}°
            </span>
            .
          </p>
        </>
      )}

      {/* Estado de cobertura de zonas PTZ activas */}
      <CalibrationCoverageInfo status={calibrationStatus} />

      {/* Botones */}
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition-colors"
        >
          <IconX size={14} />
          Cerrar
        </button>
        <button
          onClick={onToggleMode}
          className={`flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-white text-xs font-medium transition-colors ${
            isSetPointZero
              ? "bg-cyan-600 hover:bg-cyan-500"
              : "bg-yellow-600 hover:bg-yellow-500"
          }`}
        >
          <IconCrosshair size={14} />
          {isSetPointZero ? "Volver a girar" : "Fijar punto 0"}
        </button>
      </div>
    </div>
  );
}

