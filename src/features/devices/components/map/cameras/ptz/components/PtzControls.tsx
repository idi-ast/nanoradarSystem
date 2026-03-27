import {
  IconArrowDown,
  IconArrowLeft,
  IconArrowRight,
  IconArrowUp,
  IconHome,
  IconPlayerStop,
  IconZoomIn,
  IconZoomOut,
} from "@tabler/icons-react";
import { ptzMove, ptzStop, ptzZoom, PTZ_SPEED } from "../service";

const BTN_CLS =
  "flex items-center justify-center w-8 h-8 rounded-md bg-black/60 hover:bg-black/80 active:bg-brand-200/30 text-white/80 hover:text-white transition-colors border border-white/10 backdrop-blur-sm";

export function PtzControls({ ptz_id }: { ptz_id: number }) {
  return (
    <div
      className="absolute bottom-2 right-2 flex flex-col items-center gap-1 select-none"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="flex gap-1">
        <button
          className={BTN_CLS}
          title="Zoom out"
          onClick={() => ptzZoom(ptz_id, -PTZ_SPEED)}
        >
          <IconZoomOut size={14} stroke={1.5} />
        </button>
        <button
          className={BTN_CLS}
          title="Zoom in"
          onClick={() => ptzZoom(ptz_id, PTZ_SPEED)}
        >
          <IconZoomIn size={14} stroke={1.5} />
        </button>
      </div>

      {/* D-pad */}
      <div className="grid grid-cols-3 gap-1">
        <div />
        <button
          className={BTN_CLS}
          title="Arriba"
          onClick={() => ptzMove(ptz_id, 0, PTZ_SPEED)}
        >
          <IconArrowUp size={14} stroke={1.5} />
        </button>
        <div />

        <button
          className={BTN_CLS}
          title="Izquierda"
          onClick={() => ptzMove(ptz_id, -PTZ_SPEED, 0)}
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
          onClick={() => ptzMove(ptz_id, PTZ_SPEED, 0)}
        >
          <IconArrowRight size={14} stroke={1.5} />
        </button>

        <div />
        <button
          className={BTN_CLS}
          title="Abajo"
          onClick={() => ptzMove(ptz_id, 0, -PTZ_SPEED)}
        >
          <IconArrowDown size={14} stroke={1.5} />
        </button>
        <div />
      </div>
    </div>
  );
}
