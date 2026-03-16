import { memo, useState } from "react";
import { IconPencil, IconTrash, IconCheck, IconX } from "@tabler/icons-react";
import type { RadarZone } from "../../types";
import { useRadarContext } from "../../context/useRadarContext";

const ALERT_LEVELS = [
  { value: 1, label: "Nivel 1: Informativa" },
  { value: 2, label: "Nivel 2: Precaución" },
  { value: 3, label: "Nivel 3: Peligro" },
  { value: 4, label: "Nivel 4: CRÍTICO" },
] as const;

interface Props {
  zone: RadarZone;
}

export const ZoneCard = memo(function ZoneCard({ zone }: Props) {
  const { updateZone, deleteZone } = useRadarContext();
  const [isEditing, setIsEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [editName, setEditName] = useState(zone.nombre);
  const [editColor, setEditColor] = useState(zone.poligono.color);
  const [editLevel, setEditLevel] = useState<1 | 2 | 3 | 4>(
    (zone.idTipoAlerta as 1 | 2 | 3 | 4) ?? 1,
  );

  const handleEdit = () => {
    setEditName(zone.nombre);
    setEditColor(zone.poligono.color);
    setEditLevel((zone.idTipoAlerta as 1 | 2 | 3 | 4) ?? 1);
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!zone.id) return;
    setIsSaving(true);
    try {
      await updateZone(zone.id, {
        nombre: editName || zone.nombre,
        descripcion: `Zona con alerta nivel ${editLevel}`,
        idTipoAlerta: editLevel,
        poligono: { color: editColor, vertices: zone.poligono.vertices },
      });
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!zone.id) return;
    setIsDeleting(true);
    try {
      await deleteZone(zone.id);
    } catch {
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  };

  if (isEditing) {
    return (
      <div className="bg-bg-200 rounded-xl border border-border p-3 space-y-2">
        <input
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          className="w-full bg-bg-100 border border-border text-text-100 text-xs p-1.5 rounded"
          placeholder="Nombre de la zona"
        />
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 flex-1 bg-bg-100/30 p-1.5 rounded border border-border">
            <label className="text-[9px] text-text-200 uppercase">Color:</label>
            <div className="w-6 h-6 overflow-hidden rounded-full flex justify-center items-center">
              <input
                type="color"
                value={editColor}
                onChange={(e) => setEditColor(e.target.value)}
                className="min-w-14 min-h-10 bg-transparent cursor-pointer"
              />
            </div>
          </div>
          <select
            value={editLevel}
            onChange={(e) => setEditLevel(Number(e.target.value) as 1 | 2 | 3 | 4)}
            className="flex-1 bg-bg-100 border border-border text-text-100 text-[10px] p-1.5 rounded"
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
            onClick={() => setIsEditing(false)}
            disabled={isSaving}
            className="flex-1 flex items-center justify-center gap-1 py-1 text-[10px] rounded border border-border text-text-100/60 hover:bg-bg-300 transition-colors disabled:opacity-40"
          >
            <IconX size={12} /> Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 flex items-center justify-center gap-1 py-1 text-[10px] rounded border border-emerald-500/40 bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/40 transition-colors disabled:opacity-40"
          >
            <IconCheck size={12} /> {isSaving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-bg-200 rounded-xl overflow-hidden group">
      <div
        className="absolute blur-xl left-0 top-0 w-full h-full"
        style={{ backgroundColor: zone.poligono.color }}
      />
      <div className="relative bg-linear-to-r from-bg-200 from-25% to-bg-100/40 p-2 w-full h-full">
        <p className="text-sm font-bold text-text-100 uppercase pr-16">
          {zone.nombre}
        </p>
        <p className="text-[10px] text-text-200">{zone.descripcion}</p>

        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
          <div
            className="w-3 h-3 rounded-sm shrink-0"
            style={{ backgroundColor: zone.poligono.color }}
          />
          <button
            onClick={handleEdit}
            className="p-1 rounded hover:bg-bg-300/80 text-text-100/40 hover:text-text-100 transition-colors opacity-0 group-hover:opacity-100"
            title="Editar zona"
          >
            <IconPencil size={13} stroke={1.5} />
          </button>
          {confirmDelete ? (
            <>
              <span className="text-[9px] text-red-400 font-semibold whitespace-nowrap">¿Eliminar?</span>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="p-1 rounded bg-red-600/80 text-white hover:bg-red-600 transition-colors disabled:opacity-60"
                title="Confirmar eliminación"
              >
                <IconCheck size={13} stroke={1.5} />
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={isDeleting}
                className="p-1 rounded hover:bg-bg-300/80 text-text-100/40 hover:text-text-100 transition-colors"
                title="Cancelar"
              >
                <IconX size={13} stroke={1.5} />
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-1 rounded hover:bg-red-900/60 text-text-100/40 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
              title="Eliminar zona"
            >
              <IconTrash size={13} stroke={1.5} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
});
