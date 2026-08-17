import { useState, type ReactNode, type PointerEvent } from "react";
import {
  IconArrowDown,
  IconArrowLeft,
  IconArrowRight,
  IconArrowUp,
  IconPlayerStop,
  IconZoomIn,
  IconZoomOut,
  IconBulb,
  IconDroplet,
  IconTarget,
} from "@tabler/icons-react";
import {
  ptzZoom,
  ptzLuz,
  ptzLimpiaVidrio,
  ptzStartMove,
  ptzStop,
  PTZ_SPEED_X,
  PTZ_SPEED_Y,
  ptzHome,
} from "../service";
import {
  useCameraCalibrationStore,
} from "../../../../../stores/cameraCalibrationStore";

const BTN_CLS =
  "flex items-center justify-center w-8 h-8 rounded-md bg-black/60 hover:bg-black/80 active:bg-brand-200/30 text-white/80 hover:text-white transition-colors border border-white/10 backdrop-blur-sm";

const BTN_ON_CLS =
  "flex items-center justify-center w-8 h-8 rounded-md bg-yellow-500/70 hover:bg-yellow-400/80 text-white transition-colors border border-yellow-400/50 backdrop-blur-sm";

const BTN_WIPER_ON_CLS =
  "flex items-center justify-center w-8 h-8 rounded-md bg-cyan-500/70 hover:bg-cyan-400/80 text-white transition-colors border border-cyan-400/50 backdrop-blur-sm";

const BTN_CALIB_CLS =
  "flex items-center justify-center w-8 h-8 rounded-md bg-amber-500/70 hover:bg-amber-400/80 text-white transition-colors border border-amber-400/50 backdrop-blur-sm animate-pulse";

/** Botón de flecha con MANTENER PRESIONADO: mueve mientras se sostiene. */
function HoldArrowButton({
  title,
  ptzId,
  pan = 0,
  tilt = 0,
  children,
}: {
  title: string;
  ptzId: number;
  pan?: number;
  tilt?: number;
  children: ReactNode;
}) {
  const stop = () => ptzStop(ptzId);
  const start = (e: PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
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

export function PtzControls({ ptz_id }: { ptz_id: number }) {
  const [luz, setLuz] = useState(false);
  const [limpiaVidrio, setLimpiaVidrio] = useState(false);

  const calibratingCameraId = useCameraCalibrationStore(
    (s) => s.calibratingCameraId,
  );
  const startCalibrating = useCameraCalibrationStore(
    (s) => s.startCalibrating,
  );
  const stopCalibrating = useCameraCalibrationStore(
    (s) => s.stopCalibrating,
  );

  const isThisCalibrating = calibratingCameraId === ptz_id;

  function toggleCalibrar() {
    if (isThisCalibrating) {
      stopCalibrating();
    } else {
      startCalibrating(ptz_id, true);
    }
  }

  function toggleLuz() {
    const next = !luz;
    setLuz(next);
    ptzLuz(ptz_id, next);
  }

  function toggleLimpiaVidrio() {
    const next = !limpiaVidrio;
    setLimpiaVidrio(next);
    ptzLimpiaVidrio(ptz_id, next);
  }

  return (
    <div
      className="absolute bottom-2 left-2 right-2 z-50 flex flex-col items-center gap-1 select-none"
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Zoom + extras row */}
      <div className="flex gap-1">
        <button
          className={BTN_CLS}
          title="Zoom out"
          onClick={() => ptzZoom(ptz_id, -PTZ_SPEED_X)}
        >
          <IconZoomOut size={14} stroke={1.5} />
        </button>
        <button
          className={BTN_CLS}
          title="Zoom in"
          onClick={() => ptzZoom(ptz_id, PTZ_SPEED_X)}
        >
          <IconZoomIn size={14} stroke={1.5} />
        </button>

        {/* Calibración */}
        <button
          className={isThisCalibrating ? BTN_CALIB_CLS : BTN_CLS}
          title={isThisCalibrating ? "Detener calibración" : "Calibrar cámara"}
          onClick={toggleCalibrar}
        >
          <IconTarget size={14} stroke={1.5} />
        </button>

        {/* Luz toggle */}
        <button
          className={luz ? BTN_ON_CLS : BTN_CLS}
          title={luz ? "Apagar luz" : "Encender luz"}
          onClick={toggleLuz}
        >
          <IconBulb size={14} stroke={1.5} />
        </button>

        {/* Limpiavidrio toggle */}
        <button
          className={limpiaVidrio ? BTN_WIPER_ON_CLS : BTN_CLS}
          title={limpiaVidrio ? "Detener limpiavidrio" : "Activar limpiavidrio"}
          onClick={toggleLimpiaVidrio}
        >
          <IconDroplet size={14} stroke={1.5} />
        </button>
      </div>

      {/* D-pad (mantener presionado para mover) */}
      <div className="grid grid-cols-3 gap-1">
        <div />
        <HoldArrowButton title="Arriba" ptzId={ptz_id} tilt={PTZ_SPEED_Y}>
          <IconArrowUp size={14} stroke={1.5} />
        </HoldArrowButton>
        <div />

        <HoldArrowButton title="Izquierda" ptzId={ptz_id} pan={-PTZ_SPEED_X}>
          <IconArrowLeft size={14} stroke={1.5} />
        </HoldArrowButton>
        <button
          className={`${BTN_CLS} bg-sky-600/60 hover:bg-sky-600/80`}
          title="Home"
          onClick={() => ptzHome(ptz_id)}
        >
          <IconPlayerStop size={14} stroke={1.5} />
        </button>
        <HoldArrowButton title="Derecha" ptzId={ptz_id} pan={PTZ_SPEED_X}>
          <IconArrowRight size={14} stroke={1.5} />
        </HoldArrowButton>

        <div />
        <HoldArrowButton title="Abajo" ptzId={ptz_id} tilt={-PTZ_SPEED_Y}>
          <IconArrowDown size={14} stroke={1.5} />
        </HoldArrowButton>
        <div />
      </div>
    </div>
  );
}
