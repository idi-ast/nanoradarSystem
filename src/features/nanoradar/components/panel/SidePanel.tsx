import { useRadarContext } from "../../context/useRadarContext";
import { useRadarTargets } from "../../context/useRadarContext";
import { TargetCard } from "./TargetCard";
import { ZoneCard } from "./ZoneCard";
import { ZoneDrawingPanel } from "./ZoneDrawingPanel";

const DEVICE_SECTION: { key: "nanoRadar" | "spotter"; label: string }[] = [
  { key: "nanoRadar", label: "NanoRadar" },
  { key: "spotter",   label: "Spotter" },
];

/**
 * Panel lateral derecho con controles, zonas activas y lista de detecciones.
 */
export function SidePanel() {
  const {
    zones,
    isDrawing,
    startDrawing,
    cancelDrawing,
  } = useRadarContext();
  const { clearTargets } = useRadarContext();
  const { targets } = useRadarTargets();

  return (
    <div className="w-80 bg-slate-900 p-4 flex flex-col gap-4 overflow-y-auto border-l border-emerald-500/30">
      {/* Encabezado Zonas Activas */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-emerald-500 text-xs font-bold uppercase tracking-widest border-b border-emerald-500/20 pb-2">
          Zonas Activas
        </h3>
        <div className="flex gap-2">
          <button
            onClick={clearTargets}
            className="flex-1 px-2 py-1 text-[10px] rounded border border-red-500/50 bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
          >
            ⚠️ BORRAR CACHÉ RADAR
          </button>
          <button
            onClick={isDrawing ? cancelDrawing : startDrawing}
            className={`px-3 py-1 text-[10px] rounded border ${
              isDrawing
                ? "bg-red-500 border-red-400"
                : "bg-emerald-600 border-emerald-400"
            } text-white`}
          >
            {isDrawing ? "CANCELAR" : "+ NUEVA"}
          </button>
        </div>
      </div>

      {/* Formulario de dibujo */}
      {isDrawing && <ZoneDrawingPanel />}

      {/* Lista de zonas */}
      <div className="space-y-2">
        {zones.map((zone) => (
          <ZoneCard key={zone.id ?? zone.nombre} zone={zone} />
        ))}
      </div>

      {/* Detecciones agrupadas por dispositivo */}
      <h3 className="text-emerald-500 text-xs font-bold uppercase tracking-widest border-b border-emerald-500/20 pb-2 mt-4">
        Últimas Detecciones
      </h3>

      {DEVICE_SECTION.map(({ key, label }) => {
        const group = targets.filter((t) => t.deviceType === key);
        return (
          <div key={key}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {label}
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-700 text-slate-300">
                {group.length}
              </span>
              {group.length === 0 && (
                <span className="text-[9px] text-slate-600 italic">desconectado</span>
              )}
            </div>
            <div className="space-y-2 mb-3">
              {group.length === 0 ? (
                <p className="text-slate-500 text-[10px] italic pl-1">
                  Sin objetivos...
                </p>
              ) : (
                group.map((t) => <TargetCard key={t.id} target={t} />)
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
