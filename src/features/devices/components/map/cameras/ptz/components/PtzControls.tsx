import { useState } from "react";
import {
  IconZoomIn,
  IconZoomOut,
  IconBulb,
  IconDroplet,
} from "@tabler/icons-react";
import { ptzZoom, ptzLuz, ptzLimpiaVidrio, PTZ_SPEED_X } from "../service";

const BTN_CLS =
  "relative text-white hover:text-text-400 hover:bg-bg-450 outline outline-transparent p-0.5 border-t border-t-white/20 shadow-sm backdrop-blur-lg bg-bg-100/20 rounded h-10 w-10 flex justify-center items-center transition-all";

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
      className="absolute bottom-0 -right-12  z-50 flex flex-col items-center gap-1 select-none"
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Zoom + extras row */}
      <div className="flex flex-col gap-1">
        <button
          className={BTN_CLS}
          title="Zoom out"
          onClick={() => ptzZoom(ptz_id, -PTZ_SPEED_X)}
        >
          <IconZoomOut size={19} stroke={1.5} />
        </button>
        <button
          className={BTN_CLS}
          title="Zoom in"
          onClick={() => ptzZoom(ptz_id, PTZ_SPEED_X)}
        >
          <IconZoomIn size={19} stroke={1.5} />
        </button>

        {/* Luz toggle */}
        <button
          className={luz ? BTN_ON_CLS : BTN_CLS}
          title={luz ? "Apagar luz" : "Encender luz"}
          onClick={toggleLuz}
        >
          <IconBulb size={19} stroke={1.5} />
        </button>

        {/* Limpiavidrio toggle */}
        <button
          className={limpiaVidrio ? BTN_WIPER_ON_CLS : BTN_CLS}
          title={limpiaVidrio ? "Detener limpiavidrio" : "Activar limpiavidrio"}
          onClick={toggleLimpiaVidrio}
        >
          <IconDroplet size={19} stroke={1.5} />
        </button>
      </div>
    </div>
  );
}
