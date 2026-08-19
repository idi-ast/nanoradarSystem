import type { ReactNode, PointerEvent } from "react";
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
  PTZ_SPEED_X,
  PTZ_SPEED_Y,
} from "../service";

const BTN_CLS =
  "flex items-center justify-center w-8 h-8 rounded-md bg-black/60 hover:bg-black/80 active:bg-brand-200/30 text-white/80 hover:text-white transition-colors border border-white/10 backdrop-blur-sm";

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

/**
 * Joystick D-pad para mover la cámara PTZ (mantener presionado).
 * Reutilizable: dentro del video de la cámara o fuera de ella (menú del mapa).
 */
export function PtzDpad({ ptz_id }: { ptz_id: number }) {
  return (
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
  );
}

export default PtzDpad;
