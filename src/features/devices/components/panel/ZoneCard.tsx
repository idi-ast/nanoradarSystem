import { memo, useState, useRef, useEffect } from "react";
import {
  IconPencil,
  IconTrash,
  IconCheck,
  IconX,
  IconUpload,
  IconAlertTriangle,
  IconChevronDown,
  IconPin,
  IconPinFilled,
} from "@tabler/icons-react";
import type { RadarZone } from "../../types";
import { useRadarContext } from "../../context/useRadarContext";
import { ZONE_SOUNDS, ZONE_DETECTION_CATEGORIES } from "../../config";
import {
  TRACK_CATEGORIES_CONFIG,
  ALL_TRACK_CATEGORIES,
  type TrackCategory,
} from "../../config/categories";
import { useRole } from "@/context/role/hooks/useRole";
import {
  useCustomSounds,
  MAX_CUSTOM_SOUNDS,
} from "../../hooks/useCustomSounds";
import { useTiposAlertas } from "../../hooks/useTiposAlertas";

interface Props {
  zone: RadarZone;
  hasAlert?: boolean;
  isEditing?: boolean;
  onStartEdit?: () => void;
  onEndEdit?: () => void;
}

export const ZoneCard = memo(function ZoneCard({
  zone,
  hasAlert = false,
  isEditing: isEditingProp,
  onStartEdit,
  onEndEdit,
}: Props) {
  const { updateZone, deleteZone, flyToZoneFn } = useRadarContext();
  const { customSounds, isUploading, addSound, removeSound } =
    useCustomSounds();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editContainerRef = useRef<HTMLDivElement>(null);
  const { isSuperAdmin } = useRole();
  const [localIsEditing, setLocalIsEditing] = useState(false);
  const isEditing = isEditingProp !== undefined ? isEditingProp : localIsEditing;

  const [isPinned, setIsPinned] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { tiposAlertas } = useTiposAlertas();
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
  const [editActivarPtz, setEditActivarPtz] = useState<boolean>(
    zone.activarPtz ?? true,
  );
  const [editAllowedCategories, setEditAllowedCategories] = useState<TrackCategory[]>(
    zone.allowed_categories && zone.allowed_categories.length > 0
      ? zone.allowed_categories
      : ALL_TRACK_CATEGORIES,
  );

  const prevIsEditingRef = useRef(false);
  useEffect(() => {
    if (isEditing && !prevIsEditingRef.current) {
      setEditName(zone.nombre);
      setEditColor(zone.poligono.color);
      setEditLevel((zone.idTipoAlerta as 1 | 2 | 3 | 4) ?? 1);
      setEditSonido(zone.sonido ?? null);
      setEditDestello(zone.destello ?? true);
      setEditCategoria(zone.categoriaDeteccion ?? 1);
      setEditActivarPtz(zone.activarPtz ?? false);
      setEditAllowedCategories(
        zone.allowed_categories && zone.allowed_categories.length > 0
          ? zone.allowed_categories
          : ALL_TRACK_CATEGORIES,
      );
    }
    prevIsEditingRef.current = isEditing;
  }, [isEditing, zone]);

  useEffect(() => {
    if (isEditing && editContainerRef.current) {
      editContainerRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [isEditing]);

  const handleEdit = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditName(zone.nombre);
    setEditColor(zone.poligono.color);
    setEditLevel((zone.idTipoAlerta as 1 | 2 | 3 | 4) ?? 1);
    setEditSonido(zone.sonido ?? null);
    setEditDestello(zone.destello ?? true);
    setEditCategoria(zone.categoriaDeteccion ?? 1);
    setEditActivarPtz(zone.activarPtz ?? false);
    setEditAllowedCategories(
      zone.allowed_categories && zone.allowed_categories.length > 0
        ? zone.allowed_categories
        : ALL_TRACK_CATEGORIES,
    );
    if (onStartEdit) {
      onStartEdit();
    } else {
      setLocalIsEditing(true);
    }
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
        activarPtz: editActivarPtz,
        allowed_categories: editAllowedCategories,
        poligono: { color: editColor, vertices: zone.poligono.vertices },
      });
      if (onEndEdit) {
        onEndEdit();
      } else {
        setLocalIsEditing(false);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!zone.id) return;
    setIsDeleting(true);
    try {
      await deleteZone(zone.id);
      if (onEndEdit) {
        onEndEdit();
      } else {
        setLocalIsEditing(false);
      }
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
      <div
        ref={editContainerRef}
        className="bg-bg-200 rounded-xl border border-border p-3 space-y-2 ring-1 ring-brand-100/30 shadow-lg"
      >
        <div className="flex items-center justify-between border-b border-border/60 pb-1.5 mb-1">
          <span className="text-xs font-bold uppercase tracking-wider text-text-100 flex items-center gap-1.5">
            <IconPencil size={13} className="text-brand-100" />
            Editar Zona
          </span>
          <span className="text-[10px] text-text-200/60 font-mono">
            {zone.id ? `ID: ${zone.id}` : zone.nombre}
          </span>
        </div>
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
            {tiposAlertas.map((lvl) => (
              <option key={lvl.id} value={lvl.id}>
                {lvl.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-text-200 uppercase flex items-center justify-between mb-1">
            <span>Sonido:</span>
            <button
              title={
                customSounds.length >= MAX_CUSTOM_SOUNDS
                  ? `Límite de ${MAX_CUSTOM_SOUNDS} alcanzado`
                  : "Subir nuevo sonido"
              }
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
                // reset input
                if (e.target) e.target.value = "";
              }}
            />
          </label>
          <div className="flex items-center gap-1">
            <select
              value={editSonido ?? ""}
              onChange={(e) =>
                setEditSonido(
                  e.target.value === "" ? null : Number(e.target.value),
                )
              }
              className="flex-1 bg-bg-100 border border-border text-text-100 text-xs p-1.5 rounded truncate"
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
            {customSounds.some((s) => s.id === editSonido) && (
              <button
                type="button"
                title="Eliminar este sonido personalizado"
                onClick={() => {
                  if (editSonido) {
                    removeSound(editSonido);
                    setEditSonido(null);
                  }
                }}
                className="p-1.5 rounded bg-bg-100 text-red-400 hover:bg-bg-300 border border-border transition-colors"
              >
                <IconTrash size={14} />
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between bg-bg-100/30 py-1.5 rounded border border-border">
          <label className="text-xs text-text-200 uppercase">
            Destello pantalla:
          </label>
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
        {/* Activar seguimiento PTZ */}
        <div className="flex items-center justify-between bg-bg-100/30 py-1.5 rounded border border-border">
          <div className="flex flex-col">
            <label className="text-xs text-text-200 uppercase">
              Seguimiento PTZ
            </label>
            <p className="text-[9px] text-text-200/50 leading-tight">
              La cámara seguirá tracks que entren en esta zona.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEditActivarPtz(!editActivarPtz)}
            className={`relative inline-flex h-4.5 w-8 items-center rounded-full transition-colors ${editActivarPtz ? "bg-brand-100" : "bg-bg-300"}`}
          >
            <span
              className={`inline-block h-3 w-3 rounded-full bg-white shadow transition-transform ${editActivarPtz ? "translate-x-4" : "translate-x-0.5"}`}
            />
          </button>
        </div>

        {/* Categorías Activas (Detección y PTZ) */}
        <div className="bg-bg-100/40 p-2 rounded-lg border border-border space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs text-text-100 font-semibold uppercase flex items-center gap-1.5">
              <span>Categorías Activas</span>
              <span className="text-[10px] font-mono text-brand-100 bg-brand-100/10 px-1.5 py-0.2 rounded border border-brand-100/20">
                {editAllowedCategories.length}/{TRACK_CATEGORIES_CONFIG.length}
              </span>
            </label>
            <div className="flex gap-1 text-[10px]">
              <button
                type="button"
                onClick={() => setEditAllowedCategories([...ALL_TRACK_CATEGORIES])}
                className="text-brand-100 hover:underline cursor-pointer"
              >
                Todas
              </button>
              <span className="text-text-200/40">|</span>
              <button
                type="button"
                onClick={() => setEditAllowedCategories([])}
                className="text-text-200 hover:text-text-100 hover:underline cursor-pointer"
              >
                Ninguna
              </button>
            </div>
          </div>

          <p className="text-[9px] text-text-200/70 leading-tight">
            Las categorías desmarcadas seguirán registrándose en el sistema, pero serán ignoradas para alertas y movimiento automático de PTZ en esta zona.
          </p>

          {editAllowedCategories.length === 0 && (
            <div className="flex items-center gap-1.5 p-1.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] leading-tight">
              <IconAlertTriangle size={14} className="shrink-0" />
              <span>
                Zona inactiva en la práctica: Al desmarcar todas las categorías, ningún objeto activará alertas ni PTZ en esta zona.
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-1 pt-1">
            {TRACK_CATEGORIES_CONFIG.map((cat) => {
              const isSelected = editAllowedCategories.includes(cat.id);
              const CatIcon = cat.icon;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    if (isSelected) {
                      setEditAllowedCategories(
                        editAllowedCategories.filter((id) => id !== cat.id),
                      );
                    } else {
                      setEditAllowedCategories([...editAllowedCategories, cat.id]);
                    }
                  }}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded border text-xs font-medium transition-all cursor-pointer ${isSelected
                    ? "border-brand-100 bg-brand-100/15 text-text-100 shadow-xs"
                    : "border-border/60 bg-bg-200/50 text-text-200/50 hover:bg-bg-100 hover:text-text-200"
                    }`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded flex items-center justify-center border text-[9px] transition-colors ${isSelected
                      ? "bg-brand-100 border-brand-100 text-bg-300 font-bold"
                      : "border-border bg-bg-100 text-transparent"
                      }`}
                  >
                    ✓
                  </div>
                  <CatIcon
                    size={14}
                    stroke={1.5}
                    color={isSelected ? cat.color : undefined}
                    className="shrink-0"
                  />
                  <span className="truncate">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              if (onEndEdit) {
                onEndEdit();
              } else {
                setLocalIsEditing(false);
              }
            }}
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

  const isExpanded = isPinned || isHovered || confirmDelete;

  const handleCardClick = () => {
    handleFlyTo();
    if (isPinned) {
      setIsPinned(false);
      setIsHovered(false);
    } else {
      setIsPinned(true);
    }
  };

  return (
    <div
      className={`relative bg-bg-200 overflow-hidden group cursor-pointer rounded-lg border transition-all duration-300 ease-in-out ${
        isExpanded
          ? "border-border shadow-md"
          : "border-border/40 hover:border-border/80"
      }`}
      style={
        hasAlert
          ? ({
              borderRight: `2px solid ${zone.poligono.color}`,
              "--zone-glow-color": zone.poligono.color,
              animation: "zone-alert-glow 1.6s ease-in-out infinite",
            } as React.CSSProperties)
          : undefined
      }
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
      title={
        isPinned
          ? "Zona fijada (clic para desanclar y minimizar)"
          : "Clic para fijar expandida y centrar en el mapa"
      }
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
        className={`absolute blur-xl left-0 top-0 w-full h-full pointer-events-none ${
          hasAlert ? "animate-pulse opacity-60" : "opacity-25"
        }`}
        style={{ backgroundColor: zone.poligono.color }}
      />

      <div className="relative z-10 bg-linear-to-r from-bg-300/80 from-20% to-bg-100/40 w-full">
        {/* Cabecera compacta visible siempre */}
        <div className="flex items-center justify-between gap-1.5 px-2.5 py-1.5 min-h-[30px]">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div
              className={`w-2.5 h-2.5 rounded-full shrink-0 border border-white/20 transition-transform duration-200 ${
                hasAlert ? "animate-ping" : ""
              }`}
              style={{
                backgroundColor: zone.poligono.color,
                borderColor: zone.poligono.color,
                boxShadow: hasAlert
                  ? `0 0 8px 2px ${zone.poligono.color}`
                  : undefined,
              }}
            />
            <span className="text-xs font-bold text-text-100 uppercase tracking-wide truncate">
              {zone.nombre}
            </span>
            {hasAlert && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse font-semibold shrink-0">
                ALERTA
              </span>
            )}
          </div>

          <div
            className="flex items-center gap-1 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Botón / Indicador de anclado */}
            {isPinned ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPinned(false);
                  setIsHovered(false);
                }}
                className="p-1 rounded text-blue-400 hover:text-blue-300 hover:bg-bg-300/60 transition-colors"
                title="Desanclar / Minimizar"
              >
                <IconPinFilled size={12} className="rotate-45" />
              </button>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPinned(true);
                }}
                className="p-1 rounded text-text-100/30 hover:text-text-100 hover:bg-bg-300/60 transition-colors opacity-0 group-hover:opacity-100"
                title="Fijar expandida"
              >
                <IconPin size={12} className="rotate-45" />
              </button>
            )}

            {/* Acciones de administración */}
            {isSuperAdmin && (
              <>
                <button
                  onClick={handleEdit}
                  className="p-1 rounded hover:bg-bg-300/80 text-text-100/50 hover:text-text-100 transition-colors opacity-0 group-hover:opacity-100"
                  title="Editar zona"
                >
                  <IconPencil size={12} stroke={1.5} />
                </button>
                {confirmDelete ? (
                  <div className="flex items-center gap-1 bg-bg-300/90 px-1 py-0.5 rounded border border-red-500/30">
                    <span className="text-[10px] text-red-400 font-semibold whitespace-nowrap">
                      ¿Eliminar?
                    </span>
                    <button
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="p-0.5 rounded bg-red-600/80 text-white hover:bg-red-600 transition-colors disabled:opacity-60"
                      title="Confirmar eliminación"
                    >
                      <IconCheck size={11} stroke={2} />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      disabled={isDeleting}
                      className="p-0.5 rounded hover:bg-bg-300 text-text-100/60 hover:text-text-100 transition-colors"
                      title="Cancelar"
                    >
                      <IconX size={11} stroke={2} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="p-1 rounded hover:bg-red-900/60 text-text-100/50 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                    title="Eliminar zona"
                  >
                    <IconTrash size={12} stroke={1.5} />
                  </button>
                )}
              </>
            )}

            {/* Chevron indicador */}
            <IconChevronDown
              size={14}
              className={`text-text-200/50 transition-transform duration-300 pointer-events-none ${
                isExpanded ? "rotate-180 text-text-100" : ""
              }`}
            />
          </div>
        </div>

        {/* Contenido expandible animado */}
        <div
          className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
            isExpanded
              ? "grid-rows-[1fr] opacity-100"
              : "grid-rows-[0fr] opacity-0 pointer-events-none"
          }`}
        >
          <div className="overflow-hidden">
            <div
              className="px-2.5 pb-2 pt-1 border-t border-border/30 space-y-1.5 cursor-default"
              onClick={(e) => e.stopPropagation()}
            >
              {zone.descripcion && (
                <p className="text-[11px] text-text-200 leading-snug">
                  {zone.descripcion}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-1">
                {(() => {
                  const cat = ZONE_DETECTION_CATEGORIES.find(
                    (c) => c.id === (zone.categoriaDeteccion ?? 0),
                  );
                  return cat ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-bg-100 text-text-200 flex items-center gap-1 border border-border/30">
                      <cat.icon size={10} stroke={1.5} />
                      {cat.label}
                    </span>
                  ) : null;
                })()}
                {!(zone.destello ?? true) && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-300 text-text-200/60 border border-border/40">
                    Sin destello
                  </span>
                )}
                {zone.allowed_categories &&
                  zone.allowed_categories.length <
                    ALL_TRACK_CATEGORIES.length && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded border flex items-center gap-1 ${
                        zone.allowed_categories.length === 0
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                          : "bg-bg-100 text-text-200 border-border/40"
                      }`}
                      title={
                        zone.allowed_categories.length === 0
                          ? "Zona inactiva (0 categorías permitidas)"
                          : `Categorías activas: ${zone.allowed_categories.join(", ")}`
                      }
                    >
                      {zone.allowed_categories.length === 0 ? (
                        <>
                          <IconAlertTriangle size={10} className="shrink-0" />
                          Inactiva (0 cats)
                        </>
                      ) : (
                        `Filtro: ${zone.allowed_categories.length}/${ALL_TRACK_CATEGORIES.length} cats`
                      )}
                    </span>
                  )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
