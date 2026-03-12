import { useRadarContext } from "../../context/useRadarContext";

const ALERT_LEVELS = [
  { value: 1, label: "Nivel 1: Informativa" },
  { value: 2, label: "Nivel 2: Precaución" },
  { value: 3, label: "Nivel 3: Peligro" },
  { value: 4, label: "Nivel 4: CRÍTICO" },
] as const;

/**
 * Panel de formulario para configurar y guardar una nueva zona.
 * Solo se muestra cuando el modo de dibujo está activo.
 */
export function ZoneDrawingPanel() {
  const {
    drawingPoints,
    zoneName,
    zoneColor,
    alertLevel,
    canSave,
    setZoneName,
    setZoneColor,
    setAlertLevel,
    saveZone,
    removeLastDrawingPoint,
  } = useRadarContext();

  return (
    <div className="p-4 bg-bg-200 border-b border-border space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] text-text-100 font-bold uppercase">
          Configuración de Zona
        </h4>
        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded px-2 py-0.5">
          {drawingPoints.length} pts
        </span>
      </div>

      {/* Instrucción contextual */}
      <p className="text-[9px] text-text-100/40 italic leading-tight">
        {drawingPoints.length === 0
          ? "Haz clic en el mapa para agregar vértices."
          : drawingPoints.length < 3
            ? `Agrega al menos ${3 - drawingPoints.length} punto${3 - drawingPoints.length > 1 ? "s" : ""} más.`
            : "Zona lista para guardar. Puedes seguir agregando puntos."}
      </p>

      <input
        type="text"
        placeholder="Nombre de la zona..."
        className="w-full bg-bg-100 border border-border text-text-100 text-xs p-2 rounded"
        value={zoneName}
        onChange={(e) => setZoneName(e.target.value)}
      />

      <div className="flex items-center justify-between bg-bg-100/30 p-2 rounded border border-border">
        <label className="text-[10px] text-text-200">COLOR DE ZONA:</label>
        <div className="w-8 h-8 overflow-hidden rounded-full flex justify-center items-center">
          <input
            type="color"
            value={zoneColor}
            onChange={(e) => setZoneColor(e.target.value)}
            className="min-w-20 min-h-15 bg-transparent cursor-pointer rounded-full"
          />
        </div>
      </div>

      <div>
        <label className="text-[10px] text-text-200 block mb-1">
          TIPO DE ALERTA:
        </label>
        <select
          className="w-full bg-bg-100 border border-border text-text-100 text-xs p-2 rounded"
          value={alertLevel}
          onChange={(e) =>
            setAlertLevel(Number(e.target.value) as 1 | 2 | 3 | 4)
          }
        >
          {ALERT_LEVELS.map((lvl) => (
            <option key={lvl.value} value={lvl.value}>
              {lvl.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-2">
        <button
          onClick={removeLastDrawingPoint}
          disabled={drawingPoints.length === 0}
          className="flex-1 px-2 py-1.5 text-[10px] rounded border border-yellow-500/40 bg-yellow-900/20 text-yellow-300 hover:bg-yellow-500/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ↩ DESHACER
        </button>
        <button
          onClick={saveZone}
          disabled={!canSave}
          className="flex-1 bg-brand-100 text-text-100 font-bold text-xs py-1.5 rounded hover:bg-bg-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          GUARDAR
        </button>
      </div>
    </div>
  );
}
