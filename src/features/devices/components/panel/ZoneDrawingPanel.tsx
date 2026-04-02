import { useRef } from "react";
import { IconArrowBackUp, IconHexagon, IconUpload, IconTrash } from "@tabler/icons-react";
import { useRadarContext } from "../../context/useRadarContext";
import { ZONE_SOUNDS, ZONE_DETECTION_CATEGORIES } from "../../config";
import { useCustomSounds, MAX_CUSTOM_SOUNDS } from "../../hooks/useCustomSounds";

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
    zoneSound,
    destello,
    categoriaDeteccion,
    canSave,
    setZoneName,
    setZoneColor,
    setAlertLevel,
    setZoneSound,
    setDestello,
    setCategoriaDeteccion,
    saveZone,
    removeLastDrawingPoint,
  } = useRadarContext();
  const { customSounds, isUploading, addSound, removeSound } = useCustomSounds();
  const fileInputRef = useRef<HTMLInputElement>(null);

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

      <div>
        <label className="text-xs text-text-200 flex items-center justify-between mb-1">
          <span>Sonido de alerta:</span>
          <button
            title={customSounds.length >= MAX_CUSTOM_SOUNDS ? `Límite de ${MAX_CUSTOM_SOUNDS} alcanzado` : "Subir nuevo sonido"}
            type="button"
            disabled={isUploading || customSounds.length >= MAX_CUSTOM_SOUNDS}
            onClick={() => fileInputRef.current?.click()}
            className="px-1.5 py-0.5 rounded bg-bg-300 hover:bg-bg-100 text-[10px] text-text-200 hover:text-text-100 flex items-center gap-1 border border-border transition-colors disabled:opacity-50"
          >
            <IconUpload size={12} /> {isUploading ? "..." : "Subir"}
          </button>
          <input
            type="file"
            ref={fileInputRef}
            accept=".mp3,audio/mpeg"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) addSound(file);
              if (e.target) e.target.value = "";
            }}
          />
        </label>
        <div className="flex items-center gap-1">
          <select
            className="flex-1 bg-bg-100 border border-border text-text-100 text-xs p-2 rounded truncate"
            value={zoneSound ?? ""}
            onChange={(e) =>
              setZoneSound(e.target.value === "" ? null : Number(e.target.value))
            }
          >
            <option value="">Sin sonido</option>
            <optgroup label="Sistemas predeterminados">
              {ZONE_SOUNDS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id} — {s.label}
                </option>
              ))}
            </optgroup>
            {customSounds.length > 0 && (
              <optgroup label="Sonidos Subidos">
                {customSounds.map((cs) => (
                  <option key={cs.id} value={cs.id}>
                    {cs.label}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          {customSounds.some((s) => s.id === zoneSound) && (
            <button
              type="button"
              title="Eliminar este sonido personalizado"
              onClick={() => {
                if (zoneSound) {
                  removeSound(zoneSound);
                  setZoneSound(null);
                }
              }}
              className="p-1.5 rounded bg-bg-100 text-red-400 hover:bg-bg-300 border border-border transition-colors"
            >
              <IconTrash size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between bg-bg-100/30 p-2 rounded border border-border">
        <label className="text-xs text-text-200">Destello de pantalla:</label>
        <button
          type="button"
          onClick={() => setDestello(!destello)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${destello ? "bg-brand-100" : "bg-bg-300"
            }`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${destello ? "translate-x-4.5" : "translate-x-0.5"
              }`}
          />
        </button>
      </div>

      <div>
        <label className="text-xs text-text-200 block mb-1">
          Categoría de detección:
        </label>
        <div className="grid grid-cols-3 gap-1">
          {ZONE_DETECTION_CATEGORIES.map((cat) => {
            const active = categoriaDeteccion === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoriaDeteccion(cat.id)}
                className={`flex flex-col items-center gap-0.5 py-1.5 px-1 rounded border text-xs transition-colors ${active
                    ? "border-brand-100 bg-brand-100/10 text-text-100"
                    : "border-border bg-bg-100 text-text-200 hover:bg-bg-300"
                  }`}
              >
                <cat.icon size={20} stroke={1.5} />
                {cat.label}
              </button>
            );
          })}
        </div>
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
