import { memo, useState } from "react";
import { IconPencil, IconTrash, IconCheck, IconX } from "@tabler/icons-react";
import type { RadarZone } from "../../types";
import { useRadarContext } from "../../context/useRadarContext";
import { ZONE_SOUNDS, ZONE_DETECTION_CATEGORIES } from "../../config";
import { useRole } from "@/context/role/hooks/useRole";

const ALERT_LEVELS = [
  { value: 1, label: "Nivel 1: Informativa" },
  { value: 2, label: "Nivel 2: Precaución" },
  { value: 3, label: "Nivel 3: Peligro" },
  { value: 4, label: "Nivel 4: CRÍTICO" },
] as const;

interface Props {
  zone: RadarZone;
  hasAlert?: boolean;
}

export const ZoneCard = memo(function ZoneCard({
  zone,
  hasAlert = false,
}: Props) {
  const { updateZone, deleteZone, flyToZoneFn } = useRadarContext();
  const [isEditing, setIsEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [editName, setEditName] = useState(zone.nombre);
  const [editColor, setEditColor] = useState(zone.poligono.color);
  const [editLevel, setEditLevel] = useState<1 | 2 | 3 | 4>(
    (zone.idTipoAlerta as 1 | 2 | 3 | 4) ?? 1,
  );
  const [editSonido, setEditSonido] = useState<number | null>(
    zone.sonido ?? null,
  );
  const [editDestello, setEditDestello] = useState<boolean>(
    zone.destello ?? true,
  );
  const [editCategoria, setEditCategoria] = useState<number>(
    zone.categoriaDeteccion ?? 1,
  );

  const handleEdit = () => {
    setEditName(zone.nombre);
    setEditColor(zone.poligono.color);
    setEditLevel((zone.idTipoAlerta as 1 | 2 | 3 | 4) ?? 1);
    setEditSonido(zone.sonido ?? null);
    setEditDestello(zone.destello ?? true);
    setEditCategoria(zone.categoriaDeteccion ?? 1);
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
        sonido: editSonido,
        destello: editDestello,
        categoriaDeteccion: editCategoria,
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

  const handleFlyTo = () => {
    const rawVertices = Array.isArray(zone.poligono.vertices)
      ? zone.poligono.vertices
      : Object.values(zone.poligono.vertices);
    if (rawVertices.length === 0) return;
    const sumLat = rawVertices.reduce((acc, v) => acc + v[0], 0);
    const sumLon = rawVertices.reduce((acc, v) => acc + v[1], 0);
    flyToZoneFn.current?.(
      sumLat / rawVertices.length,
      sumLon / rawVertices.length,
      18,
    );
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
            <label className="text-xs text-text-200 uppercase">Color:</label>
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
            onChange={(e) =>
              setEditLevel(Number(e.target.value) as 1 | 2 | 3 | 4)
            }
            className="flex-1 bg-bg-100 border border-border text-text-100 text-xs p-1.5 rounded"
          >
            {ALERT_LEVELS.map((lvl) => (
              <option key={lvl.value} value={lvl.value}>
                {lvl.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-text-200 uppercase block mb-1">
            Sonido:
          </label>
          <select
            value={editSonido ?? ""}
            onChange={(e) =>
              setEditSonido(
                e.target.value === "" ? null : Number(e.target.value),
              )
            }
            className="w-full bg-bg-100 border border-border text-text-100 text-xs p-1.5 rounded"
          >
            <option value="">Sin sonido</option>
            {ZONE_SOUNDS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id} — {s.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center justify-between bg-bg-100/30 py-1.5 rounded border border-border">
          <label className="text-xs text-text-200 uppercase">Destello pantalla:</label>
          <button
            type="button"
            onClick={() => setEditDestello(!editDestello)}
            className={`relative inline-flex h-4.5 w-8 items-center rounded-full transition-colors ${editDestello ? "bg-brand-100" : "bg-bg-300"
              }`}
          >
            <span
              className={`inline-block h-3 w-3 rounded-full bg-white shadow transition-transform ${editDestello ? "translate-x-4" : "translate-x-0.5"
                }`}
            />
          </button>
        </div>
        <div>
          <label className="text-xs text-text-200 uppercase block mb-1">
            Categoría detección:
          </label>
          <div className="grid grid-cols-3 gap-1">
            {ZONE_DETECTION_CATEGORIES.map((cat) => {
              const active = editCategoria === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setEditCategoria(cat.id)}
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
            onClick={() => setIsEditing(false)}
            disabled={isSaving}
            className="flex-1 flex items-center justify-center gap-1 py-1 text-xs rounded border border-border text-text-100/60 hover:bg-bg-300 transition-colors disabled:opacity-40"
          >
            <IconX size={12} /> Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 flex items-center justify-center gap-1 py-1 text-xs rounded border border-emerald-500/40 bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/40 transition-colors disabled:opacity-40"
          >
            <IconCheck size={12} /> {isSaving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    );
  }
  const { isSuperAdmin } = useRole();

  return (
    <div
      className="relative bg-bg-200 overflow-hidden group cursor-pointer rounded-md"
      style={
        hasAlert
          ? ({
            border: `1.5px solid ${zone.poligono.color}`,
            "--zone-glow-color": zone.poligono.color,
            animation: "zone-alert-glow 1.6s ease-in-out infinite",
          } as React.CSSProperties)
          : undefined
      }
      onClick={handleFlyTo}
      title="Clic para centrar en el mapa"
    >
      {hasAlert && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10"
          style={{ overflow: "hidden" }}
        >
          <div
            className="absolute inset-y-0 w-full"
            style={{
              background: `linear-gradient(90deg, transparent 0%, ${zone.poligono.color}66 30%, ${zone.poligono.color}CC 50%, ${zone.poligono.color}66 70%, transparent 100%)`,
              animation: "zone-alert-sweep 1.8s ease-in-out infinite",
            }}
          />
        </div>
      )}
      <div
        className={`absolute blur-xl left-0 top-0 w-full h-full ${hasAlert ? "animate-pulse opacity-60" : "opacity-30"}`}
        style={{ backgroundColor: zone.poligono.color }}
      />
      <div className="relative bg-linear-to-r from-bg-200 from-25% to-bg-100/40 p-2 w-full h-full">
        <p className="text-sm font-bold text-text-100 uppercase pr-16">
          {zone.nombre}
        </p>
        <p className="text-xs text-text-200">{zone.descripcion}</p>
        <div className="flex flex-wrap gap-1 mt-1">
          {(() => {
            const cat = ZONE_DETECTION_CATEGORIES.find(
              (c) => c.id === (zone.categoriaDeteccion ?? 1),
            );
            return cat ? (
              <span className="text-xs px-1.5 py-0.5 rounded bg-bg-300 text-text-200 border border-border flex items-center gap-0.5">
                <cat.icon size={10} stroke={1.5} />
                {cat.label}
              </span>
            ) : null;
          })()}
          {!(zone.destello ?? true) && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-bg-300 text-text-200/50 border border-border">
              Sin destello
            </span>
          )}
        </div>

        <div
          className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className={`w-3 h-3 rounded-full shrink-0 ${hasAlert ? "animate-ping" : ""}`}
            style={{
              backgroundColor: zone.poligono.color,
              boxShadow: hasAlert
                ? `0 0 8px 2px ${zone.poligono.color}`
                : undefined,
            }}
          />

          {isSuperAdmin && <button
            onClick={handleEdit}
            className="p-1 rounded hover:bg-bg-300/80 text-text-100/40 hover:text-text-100 transition-colors opacity-0 group-hover:opacity-100"
            title="Editar zona"
          >
            <IconPencil size={13} stroke={1.5} />
          </button>
          }
          {isSuperAdmin && confirmDelete ? (
            <>
              <span className="text-xs text-red-400 font-semibold whitespace-nowrap">
                ¿Eliminar?
              </span>
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
            isSuperAdmin && <button
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
