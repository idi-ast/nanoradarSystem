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
} from "@tabler/icons-react";
import { useState } from "react";
import { ptzMove, ptzStop, ptzZoom, ptzLuz, ptzLimpiaVidrio, PTZ_SPEED_X, PTZ_SPEED_Y } from "../service";

const BTN_CLS =
  "flex items-center justify-center w-8 h-8 rounded-md bg-black/60 hover:bg-black/80 active:bg-brand-200/30 text-white/80 hover:text-white transition-colors border border-white/10 backdrop-blur-sm";

const BTN_ON_CLS =
  "flex items-center justify-center w-8 h-8 rounded-md bg-yellow-500/70 hover:bg-yellow-400/80 text-white transition-colors border border-yellow-400/50 backdrop-blur-sm";

const BTN_WIPER_ON_CLS =
  "flex items-center justify-center w-8 h-8 rounded-md bg-cyan-500/70 hover:bg-cyan-400/80 text-white transition-colors border border-cyan-400/50 backdrop-blur-sm";

export function PtzControls({ ptz_id }: { ptz_id: number }) {
  const [luz, setLuz] = useState(false);
  const [limpiaVidrio, setLimpiaVidrio] = useState(false);

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
      className="absolute bottom-2 right-2 flex flex-col items-center gap-1 select-none"
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

      {/* D-pad */}
      <div className="grid grid-cols-3 gap-1">
        <div />
        <button
          className={BTN_CLS}
          title="Arriba"
          onClick={() => ptzMove(ptz_id, 0, PTZ_SPEED_Y)}
        >
          <IconArrowUp size={14} stroke={1.5} />
        </button>
        <div />

        <button
          className={BTN_CLS}
          title="Izquierda"
          onClick={() => ptzMove(ptz_id, -PTZ_SPEED_X, 0)}
        >
          <IconArrowLeft size={14} stroke={1.5} />
        </button>
        <button
          className={`${BTN_CLS} bg-red-600/60 hover:bg-red-600/80`}
          title="Detener"
          onClick={() => ptzStop(ptz_id)}
        >
          <IconPlayerStop size={14} stroke={1.5} />
        </button>
        <button
          className={BTN_CLS}
          title="Derecha"
          onClick={() => ptzMove(ptz_id, PTZ_SPEED_X, 0)}
        >
          <IconArrowRight size={14} stroke={1.5} />
        </button>

        <div />
        <button
          className={BTN_CLS}
          title="Abajo"
          onClick={() => ptzMove(ptz_id, 0, -PTZ_SPEED_Y)}
        >
          <IconArrowDown size={14} stroke={1.5} />
        </button>
        <div />
      </div>
    </div>
  );
}
