import { IconArrowBackUp, IconHexagon } from "@tabler/icons-react";
import { useRadarContext } from "../../context/useRadarContext";

const ALERT_LEVELS = [
  { value: 1, label: "Nivel 1: Informativa" },
  { value: 2, label: "Nivel 2: Precaución" },
  { value: 3, label: "Nivel 3: Peligro" },
  { value: 4, label: "Nivel 4: CRÍTICO" },
] as const;


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
    <div className="p-5 min-w-80 bg-bg-100/95 backdrop-blur-sm border border-border rounded-xl shadow-2xl space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs text-text-100 font-bold uppercase">
          Configuración de Zona
        </h4>
        <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded px-2 py-0.5">
          {drawingPoints.length} pts
        </span>
      </div>

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
        <label className="text-xs text-text-200">Color de zona:</label>
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
        <label className="text-xs text-text-200 block mb-1">
          Tipo de alerta:
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
          className="w-1/2  px-2 py-1.5 flex items-center justify-center gap-2 text-xs rounded border border-yellow-500/40 bg-yellow-900/20 text-yellow-300 hover:bg-yellow-500/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <IconArrowBackUp size={16} stroke={2} /> Deshacer
        </button>
        <button
          onClick={saveZone}
          disabled={!canSave}
          className="flex items-center w-1/2 justify-center gap-2 bg-brand-100 text-text-100 font-bold text-xs py-1.5 rounded hover:bg-bg-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <IconHexagon size={16} stroke={2} /> Crear
        </button>
      </div>
    </div>
  );
}
