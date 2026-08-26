import { useCallback, useEffect, useRef, type ReactNode, type PointerEvent } from "react";
import {
  IconArrowDown,
  IconArrowLeft,
  IconArrowRight,
  IconArrowUp,
  IconPlayerStop,
} from "@tabler/icons-react";
import {
  ptzStartMove,
  ptzStop,
  ptzHome,
  ptzPauseTracking,
  ptzResumeTracking,
  PTZ_SPEED_X,
  PTZ_SPEED_Y,
} from "../service";
import { useCameraCalibrationStore } from "../../../../../stores/cameraCalibrationStore";

const BTN_CLS =
  "flex items-center justify-center w-8 h-8 rounded-md bg-black/60 hover:bg-black/80 active:bg-brand-200/30 text-white/80 hover:text-white transition-colors border border-white/10 backdrop-blur-sm";

/** Tiempo sin usar el control antes de reanudar el auto-tracking (ms). */
const RESUME_TRACKING_AFTER_MS = 10_000;

/**
 * Gestiona la pausa del auto-tracking mientras se usa el control manual:
 *  - Al primer toque se pausa el tracking (zonas + cámara).
 *  - Cada interacción reinicia un temporizador de inactividad.
 *  - Tras 10 s sin usar el control se reanuda el tracking.
 * Durante la calibración no actúa: el flujo de calibración gestiona
 * la pausa/reanudación por su cuenta.
 */
function useManualControlTracking(ptzId: number) {
  const calibratingCameraId = useCameraCalibrationStore(
    (s) => s.calibratingCameraId,
  );

  const pausedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const calibratingRef = useRef(calibratingCameraId === ptzId);
  calibratingRef.current = calibratingCameraId === ptzId;

  const notifyActivity = useCallback(() => {
    if (calibratingRef.current) return;
    if (!pausedRef.current) {
      pausedRef.current = true;
      ptzPauseTracking(ptzId);
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      if (!pausedRef.current || calibratingRef.current) return;
      pausedRef.current = false;
      ptzResumeTracking(ptzId);
    }, RESUME_TRACKING_AFTER_MS);
  }, [ptzId]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      // Si el control se desmonta con la pausa activa (y no hay calibración
      // gestionándola), reanudar para no dejar el tracking apagado.
      if (pausedRef.current && !calibratingRef.current) {
        ptzResumeTracking(ptzId);
      }
    },
    [ptzId],
  );

  return notifyActivity;
}

/** Botón de flecha con MANTENER PRESIONADO: mueve mientras se sostiene. */
function HoldArrowButton({
  title,
  ptzId,
  pan = 0,
  tilt = 0,
  onActivity,
  children,
}: {
  title: string;
  ptzId: number;
  pan?: number;
  tilt?: number;
  onActivity: () => void;
  children: ReactNode;
}) {
  const stop = () => {
    onActivity();
    ptzStop(ptzId);
  };
  const start = (e: PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    onActivity();
    ptzStartMove(ptzId, pan, tilt);
  };

  return (
    <button
      className={BTN_CLS}
      title={title}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
    >
      {children}
    </button>
  );
}

/**
 * Joystick D-pad para mover la cámara PTZ (mantener presionado).
 * Reutilizable: dentro del video de la cámara o fuera de ella (menú del mapa).
 * Mientras se usa, pausa el auto-tracking; se reanuda tras 10 s de inactividad.
 *
 * `disableAutoTracking`: al ser true, NO gestiona pausa/reanudación del
 * tracking. El componente padre es responsable de ello (útil para el botón
 * manual del mapa donde la pausa se控制a al abrir/cerrar el panel).
 */
export function PtzDpad({
  ptz_id,
  disableAutoTracking = false,
}: {
  ptz_id: number;
  disableAutoTracking?: boolean;
}) {
  const hookActivity = useManualControlTracking(ptz_id);
  const notifyActivity = disableAutoTracking ? () => {} : hookActivity;

  return (
    <div className="grid grid-cols-3 gap-1">
      <div />
      <HoldArrowButton
        title="Arriba"
        ptzId={ptz_id}
        tilt={PTZ_SPEED_Y}
        onActivity={notifyActivity}
      >
        <IconArrowUp size={14} stroke={1.5} />
      </HoldArrowButton>
      <div />

      <HoldArrowButton
        title="Izquierda"
        ptzId={ptz_id}
        pan={-PTZ_SPEED_X}
        onActivity={notifyActivity}
      >
        <IconArrowLeft size={14} stroke={1.5} />
      </HoldArrowButton>
      <button
        className={`${BTN_CLS} bg-sky-600/60 hover:bg-sky-600/80`}
        title="Home"
        onClick={() => {
          notifyActivity();
          ptzHome(ptz_id);
        }}
      >
        <IconPlayerStop size={14} stroke={1.5} />
      </button>
      <HoldArrowButton
        title="Derecha"
        ptzId={ptz_id}
        pan={PTZ_SPEED_X}
        onActivity={notifyActivity}
      >
        <IconArrowRight size={14} stroke={1.5} />
      </HoldArrowButton>

      <div />
      <HoldArrowButton
        title="Abajo"
        ptzId={ptz_id}
        tilt={-PTZ_SPEED_Y}
        onActivity={notifyActivity}
      >
        <IconArrowDown size={14} stroke={1.5} />
      </HoldArrowButton>
      <div />
    </div>
  );
}

export default PtzDpad;
