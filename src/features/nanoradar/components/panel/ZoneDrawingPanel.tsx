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
  } = useRadarContext();

  return (
    <div className="p-4 bg-bg-200  border-b border-border space-y-4">
      <h4 className="text-[10px] text-text-100 font-bold uppercase">
        Configuración de Zona
      </h4>

      <input
        type="text"
        placeholder="Nombre de la zona..."
        className="w-full bg-bg-100 border border-border text-text-100 text-xs p-2 rounded"
        value={zoneName}
        onChange={(e) => setZoneName(e.target.value)}
      />

      <div className="flex items-center justify-between bg-bg-100/30 p-2 rounded border border-border">
        <label className="text-[10px] text-text-200">COLOR DE ZONA:</label>
        <div className="w-8 h-8 overflow-hidden rounded-full flex justify-center items-center ">
          <input
            type="color"
            value={zoneColor}
            onChange={(e) => setZoneColor(e.target.value)}
            className="min-w-20 min-h-15 bg-transparent cursor-pointer  rounded-full"
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

      <button
        onClick={saveZone}
        disabled={!canSave}
        className="w-full bg-brand-100 text-text-100 font-bold text-xs py-2 rounded hover:bg-bg-100 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        GUARDAR ZONA ({drawingPoints.length} Puntos)
      </button>
    </div>
  );
}
