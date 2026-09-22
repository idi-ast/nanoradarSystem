import { useMemo, useState } from "react";
import {
  IconArrowNarrowDown,
  IconArrowNarrowUp,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconClock,
  IconCopy,
  IconDownload,
  IconPlaylist,
  IconRoute,
  IconSearch,
  IconStar,
  IconStarFilled,
} from "@tabler/icons-react";
import { toast } from "sonner";
import type { RadarZone } from "@/features/devices/types";
import type {
  TrackSort,
  TrackSortBy,
  TrackSummary,
  TrackSummaryFilters,
} from "../types";
import { trackKey } from "../hooks/useTrackPlayback";
import { useTrackFavorites } from "../hooks/useTrackFavorites";

interface Props {
  filters: TrackSummaryFilters;
  onFiltersChange: (f: TrackSummaryFilters) => void;
  tracks: TrackSummary[];
  isLoading: boolean;
  total: number;
  page: number;
  pages: number;
  onPageChange: (p: number) => void;
  selectedKeys: Set<string>;
  onToggleTrack: (t: TrackSummary) => void;
  onPlayAll: (list: TrackSummary[]) => void;
  zones: RadarZone[];
  onlyWithZones: boolean;
  onOnlyWithZonesChange: (v: boolean) => void;
}

type Tab = "tracks" | "zones";

const MIN_POINTS_OPTIONS = [1, 2, 3, 5, 10];
const RADAR_TYPES = ["magos", "nano", "spotter"];

const LEVEL_COLORS: Record<number, string> = {
  0: "#fffa",
  1: "#22c55e",
  2: "#f59e0b",
  3: "#f97316",
  4: "#ef4444",
};

const SORT_OPTIONS: { value: TrackSortBy; label: string }[] = [
  { value: "last_seen", label: "Última detección" },
  { value: "first_seen", label: "Primera detección" },
  { value: "distance", label: "Distancia" },
  { value: "duration", label: "Duración" },
  { value: "points", label: "Cant. de puntos" },
  { value: "nivel_max", label: "Nivel máx." },
  { value: "track_id", label: "ID de track" },
];

function formatDuration(sec?: number | null): string {
  if (sec == null || !Number.isFinite(sec) || sec < 0) return "--";
  const total = Math.round(sec);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatDistance(m?: number | null): string {
  if (m == null || !Number.isFinite(m)) return "--";
  if (m >= 1000) return `${(m / 1000).toFixed(2)} km`;
  return `${Math.round(m)} m`;
}

function formatSpeed(kmh?: number | null): string {
  if (kmh == null || !Number.isFinite(kmh)) return "--";
  return `${kmh.toFixed(1)} km/h`;
}

function formatDateTime(iso?: string | null): string {
  if (!iso) return "--";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--";
  return d.toLocaleString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function sortTracks(
  list: TrackSummary[],
  by: TrackSortBy,
  dir: "asc" | "desc",
): TrackSummary[] {
  const mult = dir === "asc" ? 1 : -1;
  const value = (t: TrackSummary): number | string => {
    switch (by) {
      case "distance":
        return t.distance_m ?? -1;
      case "duration":
        return t.duration_seconds ?? -1;
      case "points":
        return t.point_count;
      case "nivel_max":
        return t.nivel_max ?? -1;
      case "track_id":
        return t.track_id;
      case "first_seen":
        return t.first_seen ? new Date(t.first_seen).getTime() : 0;
      case "last_seen":
      default:
        return t.last_seen ? new Date(t.last_seen).getTime() : 0;
    }
  };
  return [...list].sort((a, b) => {
    const va = value(a);
    const vb = value(b);
    if (typeof va === "string" && typeof vb === "string") {
      return va.localeCompare(vb, "es") * mult;
    }
    return ((va as number) - (vb as number)) * mult;
  });
}

async function copyTextToClipboard(text: string): Promise<boolean> {
  // API moderna (requiere contexto seguro: HTTPS o localhost)
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // falla → intenta el método legacy
    }
  }
  // Fallback legacy (funciona también sin contexto seguro)
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

function exportCsv(tracks: TrackSummary[]): void {
  if (tracks.length === 0) return;
  const headers = [
    "track_id",
    "tipo_radar",
    "inicio",
    "fin",
    "duracion_s",
    "distancia_m",
    "vel_media_kmh",
    "vel_max_kmh",
    "snr_max",
    "snr_prom",
    "conf_max",
    "puntos",
    "nivel_max",
    "zonas",
  ];
  const rows = tracks.map((t) => [
    t.track_id,
    t.tipo_radar,
    t.first_seen ?? "",
    t.last_seen ?? "",
    t.duration_seconds ?? "",
    t.distance_m ?? "",
    t.avg_speed ?? "",
    t.max_speed ?? "",
    t.max_snr ?? "",
    t.avg_snr ?? "",
    t.max_confidence ?? "",
    t.point_count,
    t.nivel_max ?? "",
    t.zones.join("|"),
  ]);
  const csv = [headers, ...rows]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const a = document.createElement("a");
  a.href = url;
  a.download = `historial-tracks-${stamp}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function HistoryListPanel({
  filters,
  onFiltersChange,
  tracks,
  isLoading,
  total,
  page,
  pages,
  onPageChange,
  selectedKeys,
  onToggleTrack,
  onPlayAll,
  zones,
  onlyWithZones,
  onOnlyWithZonesChange,
}: Props) {
  const [tab, setTab] = useState<Tab>("tracks");
  const [sort, setSort] = useState<TrackSort>({ by: "last_seen", dir: "desc" });
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const { favorites, hasFavorite, toggleAsync } = useTrackFavorites();

  const set = (patch: Partial<TrackSummaryFilters>) =>
    onFiltersChange({ ...filters, ...patch });

  const handleToggleFavorite = async (t: TrackSummary) => {
    const adding = !hasFavorite(t);
    try {
      await toggleAsync(t);
      toast.success(
        adding
          ? `"${t.track_id}" agregado a favoritos`
          : `"${t.track_id}" quitado de favoritos`,
      );
    } catch {
      toast.error(
        adding
          ? "No se pudo agregar a favoritos"
          : "No se pudo quitar de favoritos",
      );
    }
  };

  const copyTrackId = async (t: TrackSummary) => {
    const ok = await copyTextToClipboard(t.track_id);
    if (ok) {
      toast.success(`ID "${t.track_id}" copiado`);
    } else {
      toast.error("No se pudo copiar el ID");
    }
  };

  const zoneColor = useMemo(() => {
    const map = new Map<string, string>();
    for (const z of zones) map.set(z.nombre, z.poligono.color);
    return map;
  }, [zones]);

  const sortedTracks = useMemo(
    () => sortTracks(tracks, sort.by, sort.dir),
    [tracks, sort.by, sort.dir],
  );

  const displayedTracks = useMemo(
    () =>
      onlyFavorites
        ? sortedTracks.filter((t) => hasFavorite(t))
        : sortedTracks,
    [sortedTracks, onlyFavorites, hasFavorite],
  );

  const totalDistance = useMemo(
    () => displayedTracks.reduce((s, t) => s + (t.distance_m ?? 0), 0),
    [displayedTracks],
  );
  const totalDuration = useMemo(
    () => displayedTracks.reduce((s, t) => s + (t.duration_seconds ?? 0), 0),
    [displayedTracks],
  );
  const totalPoints = useMemo(
    () => displayedTracks.reduce((s, t) => s + (t.point_count ?? 0), 0),
    [displayedTracks],
  );

  const tracksByZone = useMemo(() => {
    const map = new Map<string, TrackSummary[]>();
    for (const t of displayedTracks) {
      for (const zn of t.zones) {
        const arr = map.get(zn) ?? [];
        arr.push(t);
        map.set(zn, arr);
      }
    }
    return map;
  }, [displayedTracks]);

  const visibleZones = useMemo(() => {
    const withTracks = new Set(tracksByZone.keys());
    return zones.filter((z) => withTracks.has(z.nombre));
  }, [zones, tracksByZone]);

  const otherZones = useMemo(
    () => Array.from(tracksByZone.keys()).filter((n) => !zoneColor.has(n)),
    [tracksByZone, zoneColor],
  );

  const allTracksSelected = useMemo(
    () =>
      displayedTracks.length > 0 &&
      displayedTracks.every((t) => selectedKeys.has(trackKey(t))),
    [displayedTracks, selectedKeys],
  );

  const handleSortByChange = (by: TrackSortBy) => setSort({ by, dir: "desc" });

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-bg-100 text-text-100">
      <div className="shrink-0 px-4 pt-3 pb-2">
        <h3 className="text-sm font-bold">Historial de Tracks</h3>
        <p className="text-[10px] text-text-100/50 uppercase tracking-widest">
          Reproducción de trayectorias almacenadas
        </p>
      </div>

      <div className="shrink-0 flex border-b border-border-200 mx-3">
        <TabButton
          active={tab === "tracks"}
          label={`Tracks (${total})`}
          onClick={() => setTab("tracks")}
        />
        <TabButton
          active={tab === "zones"}
          label="Zonas"
          onClick={() => setTab("zones")}
        />
      </div>

      <div className="shrink-0 grid grid-cols-4 gap-1 px-3 py-1.5 border-b border-border bg-bg-200/40">
        <MiniStat label="En vista" value={`${tracks.length} tracks`} />
        <MiniStat label="Distancia" value={formatDistance(totalDistance)} />
        <MiniStat label="Duración" value={formatDuration(totalDuration)} />
        <MiniStat label="Puntos" value={totalPoints.toLocaleString("es-CL")} />
      </div>

      <div className="shrink-0 space-y-2 px-3 py-2 border-b border-border">
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-0.5 text-[10px] text-text-100/60">
            Desde
            <input
              type="datetime-local"
              className="bg-bg-100 border border-border-200 rounded-md px-2 py-1.5 text-[11px] text-text-100 focus:outline-none focus:ring-2 focus:ring-brand-100/50"
              value={filters.from ?? ""}
              onChange={(e) => set({ from: e.target.value || undefined })}
            />
          </label>
          <label className="flex flex-col gap-0.5 text-[10px] text-text-100/60">
            Hasta
            <input
              type="datetime-local"
              className="bg-bg-100 border border-border-200 rounded-md px-2 py-1.5 text-[11px] text-text-100 focus:outline-none focus:ring-2 focus:ring-brand-100/50"
              value={filters.to ?? ""}
              onChange={(e) => set({ to: e.target.value || undefined })}
            />
          </label>
        </div>

        <div className="relative">
          <IconSearch
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-100/40"
          />
          <input
            type="text"
            placeholder="Buscar track (ej. T23)"
            className="w-full bg-bg-100 border border-border-200 rounded-md py-1.5 pl-8 pr-2 text-[11px] text-text-100 focus:outline-none focus:ring-2 focus:ring-brand-100/50"
            value={filters.search ?? ""}
            onChange={(e) => set({ search: e.target.value || undefined })}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-0.5 text-[10px] text-text-100/60">
            Radar
            <select
              className="bg-bg-100 border border-border-200 rounded-md px-2 py-1.5 text-[11px] text-text-100 focus:outline-none"
              value={filters.tipoRadar ?? ""}
              onChange={(e) => set({ tipoRadar: e.target.value || undefined })}
            >
              <option value="">Todos</option>
              {RADAR_TYPES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-0.5 text-[10px] text-text-100/60">
            Mín. puntos
            <select
              className="bg-bg-100 border border-border-200 rounded-md px-2 py-1.5 text-[11px] text-text-100 focus:outline-none"
              value={filters.minPoints}
              onChange={(e) => set({ minPoints: Number(e.target.value) })}
            >
              {MIN_POINTS_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="flex flex-col gap-0.5 text-[10px] text-text-100/60">
          Zona
          <select
            className="bg-bg-100 border border-border-200 rounded-md px-2 py-1.5 text-[11px] text-text-100 focus:outline-none"
            value={filters.zone ?? ""}
            onChange={(e) => set({ zone: e.target.value || undefined })}
          >
            <option value="">Todas las zonas</option>
            {zones.map((z) => (
              <option key={z.id ?? z.nombre} value={z.nombre}>
                {z.nombre}
              </option>
            ))}
          </select>
        </label>

        <div className="flex justify-between ">
          <label className="flex items-center gap-2 text-[11px] text-text-100/70 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyWithZones}
              onChange={(e) => onOnlyWithZonesChange(e.target.checked)}
              className="accent-lime-300"
            />
            Solo tracks que entraron a zonas
          </label>

          <label className="flex items-center gap-2 text-[11px] text-text-100/70 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyFavorites}
              onChange={(e) => setOnlyFavorites(e.target.checked)}
              className="accent-yellow-300"
            />
            Solo favoritos{" "}
            {favorites.size > 0 && (
              <span className="text-yellow-300 font-bold">
                ({favorites.size})
              </span>
            )}
          </label>
        </div>
      </div>

      {displayedTracks.length > 0 && (
        <div className="shrink-0 px-3 pt-2 pb-1.5 space-y-2">
          <button
            onClick={() => onPlayAll(displayedTracks)}
            className={`w-full flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-[12px] font-semibold transition-colors ${
              allTracksSelected
                ? "border-text-100/40 bg-bg-200 text-text-100/70 hover:bg-bg-300"
                : "border-lime-500/50 bg-lime-500/10 text-lime-300 hover:bg-lime-500/20"
            }`}
            title={
              allTracksSelected
                ? "Vaciar la selección"
                : `Reproducir todos los tracks del rango (${displayedTracks.length})`
            }
          >
            <IconPlaylist size={15} stroke={1.8} />
            {allTracksSelected
              ? `Vaciar selección (${displayedTracks.length})`
              : `Mostrar todos (${displayedTracks.length})`}
          </button>

          <div className="flex items-center gap-1.5">
            <select
              value={sort.by}
              onChange={(e) =>
                handleSortByChange(e.target.value as TrackSortBy)
              }
              className="flex-1 min-w-0 bg-bg-100 border border-border-200 rounded-md px-2 py-1.5 text-[11px] text-text-100 focus:outline-none"
              title="Ordenar lista"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  Ordenar: {o.label}
                </option>
              ))}
            </select>
            <button
              onClick={() =>
                setSort((s) => ({
                  ...s,
                  dir: s.dir === "desc" ? "asc" : "desc",
                }))
              }
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border-200 text-text-100/70 hover:bg-bg-200 transition-colors"
              title={
                sort.dir === "desc" ? "Orden descendente" : "Orden ascendente"
              }
            >
              {sort.dir === "desc" ? (
                <IconArrowNarrowDown size={15} />
              ) : (
                <IconArrowNarrowUp size={15} />
              )}
            </button>
            <button
              onClick={() => exportCsv(displayedTracks)}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border-200 text-text-100/70 hover:bg-bg-200 transition-colors"
              title={`Exportar ${displayedTracks.length} tracks a CSV`}
            >
              <IconDownload size={15} />
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
        {isLoading ? (
          <p className="text-text-100/40 text-[11px] italic text-center pt-6">
            Cargando...
          </p>
        ) : tab === "tracks" ? (
          displayedTracks.length === 0 ? (
            <p className="text-text-100/40 text-[11px] italic text-center pt-6">
              {onlyFavorites && favorites.size === 0
                ? "Sin tracks en favoritos todavía"
                : "Sin tracks con los filtros actuales"}
            </p>
          ) : (
            displayedTracks.map((t) => (
              <TrackCard
                key={`${t.tipo_radar}-${t.track_id}`}
                track={t}
                selected={selectedKeys.has(trackKey(t))}
                onClick={() => onToggleTrack(t)}
                zoneColor={zoneColor}
                isFavorite={hasFavorite(t)}
                onToggleFavorite={() => handleToggleFavorite(t)}
                onCopyId={() => copyTrackId(t)}
              />
            ))
          )
        ) : (
          <>
            {visibleZones.length === 0 && otherZones.length === 0 && (
              <p className="text-text-100/40 text-[11px] italic text-center pt-6">
                Ningún track entró a zonas con los filtros actuales
              </p>
            )}
            {visibleZones.map((z) => (
              <ZoneGroup
                key={z.id ?? z.nombre}
                zoneName={z.nombre}
                color={zoneColor.get(z.nombre) ?? "#64748b"}
                tracks={tracksByZone.get(z.nombre) ?? []}
                selectedKeys={selectedKeys}
                onToggleTrack={onToggleTrack}
              />
            ))}
            {otherZones.map((name) => (
              <ZoneGroup
                key={name}
                zoneName={name}
                color="#64748b"
                tracks={tracksByZone.get(name) ?? []}
                selectedKeys={selectedKeys}
                onToggleTrack={onToggleTrack}
              />
            ))}
          </>
        )}
      </div>

      {pages > 1 && (
        <div className="shrink-0 flex items-center justify-between gap-2 border-t border-border px-3 py-2">
          <span className="text-[10px] text-text-100/50">
            {total} tracks · Pág {page}/{pages}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="flex h-6 w-6 items-center justify-center rounded-md border border-border text-text-100/70 hover:bg-bg-200 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="Página anterior"
            >
              <IconChevronLeft size={14} />
            </button>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= pages}
              className="flex h-6 w-6 items-center justify-center rounded-md border border-border text-text-100/70 hover:bg-bg-200 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="Página siguiente"
            >
              <IconChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-1.5 text-[12px] font-semibold uppercase tracking-wider transition-colors border-b-2 ${
        active
          ? "border-bg-400 text-bg-400"
          : "border-transparent text-text-100/40 hover:text-text-100/70"
      }`}
    >
      {label}
    </button>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-bg-100/60 px-1.5 py-1">
      <div className="text-[9px] uppercase tracking-wider text-text-100/40">
        {label}
      </div>
      <div className="truncate text-[11px] font-bold text-text-100">
        {value}
      </div>
    </div>
  );
}

function TrackCard({
  track,
  selected,
  onClick,
  zoneColor,
  isFavorite,
  onToggleFavorite,
  onCopyId,
}: {
  track: TrackSummary;
  selected: boolean;
  onClick: () => void;
  zoneColor: Map<string, string>;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onCopyId: () => void;
}) {
  const [open, setOpen] = useState(false);
  const hasDetails =
    track.distance_m != null ||
    track.duration_seconds != null ||
    track.max_speed != null ||
    track.avg_speed != null ||
    track.max_snr != null ||
    track.max_confidence != null;

  return (
    <div
      className={`rounded-lg border transition-colors ${
        selected
          ? "border-bg-400/60 bg-bg-400/10"
          : "border-border bg-bg-100 hover:border-border-200"
      }`}
    >
      <div className="flex items-start">
        <button onClick={onClick} className="min-w-0 flex-1 p-2.5 text-left">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-bold text-[12px]">
              {track.track_id}
            </span>
            <span className="shrink-0 text-[10px] uppercase text-text-100/50">
              {track.tipo_radar === "magos" ? "MG-1000" : track.tipo_radar}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-text-100/60">
            <span className="inline-flex items-center gap-1">
              <IconClock size={11} stroke={1.8} />
              {formatDuration(track.duration_seconds)}
            </span>
            <span className="inline-flex items-center gap-1">
              <IconRoute size={11} stroke={1.8} />
              {formatDistance(track.distance_m)}
            </span>
            <span>{track.point_count} pts</span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            {track.zones.map((z) => (
              <span
                key={z}
                className="inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs"
                style={{
                  borderColor: (zoneColor.get(z) ?? "#64748b") + "66",
                  color: zoneColor.get(z) ?? "#94a3b8",
                }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: zoneColor.get(z) ?? "#64748b" }}
                />
                {z}
              </span>
            ))}
            {track.nivel_max != null && (
              <span
                className="ml-auto rounded px-1.5 py-0.5 text-xs font-bold"
                style={{
                  color: LEVEL_COLORS[track.nivel_max] ?? LEVEL_COLORS[4],
                }}
              >
                Alerta: {track.nivel_max}
              </span>
            )}
          </div>
        </button>
        <div className="flex shrink-0 items-center gap-1 p-1">
          <button
            onClick={onCopyId}
            className="flex h-6 w-6 items-center justify-center rounded-md border border-border text-text-100/60 hover:bg-bg-200 hover:text-text-100 transition-colors"
            title="Copiar ID del track"
          >
            <IconCopy size={12} stroke={1.8} />
          </button>
          <button
            onClick={onToggleFavorite}
            className={`flex h-6 w-6 items-center justify-center rounded-md border transition-colors ${
              isFavorite
                ? "border-yellow-400/60 bg-yellow-400/10 text-yellow-400"
                : "border-border text-text-100/60 hover:bg-bg-200 hover:text-yellow-400"
            }`}
            title={isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
          >
            {isFavorite ? (
              <IconStarFilled size={12} />
            ) : (
              <IconStar size={12} stroke={1.8} />
            )}
          </button>
          {hasDetails && (
            <button
              onClick={() => setOpen((o) => !o)}
              className="flex h-6 w-6 items-center justify-center rounded-md border border-border text-text-100/60 hover:bg-bg-200 transition-colors"
              title={open ? "Ocultar detalles" : "Ver detalles"}
            >
              <IconChevronDown
                size={13}
                className={`transition-transform ${open ? "rotate-180" : ""}`}
              />
            </button>
          )}
        </div>
      </div>
      {open && (
        <div className="grid grid-cols-4 gap-1.5 border-t border-border px-2.5 py-2">
          <Stat
            label="Duración"
            value={formatDuration(track.duration_seconds)}
          />
          <Stat label="Distancia" value={formatDistance(track.distance_m)} />
          <Stat label="Vel. media" value={formatSpeed(track.avg_speed)} />
          <Stat label="Vel. máxima" value={formatSpeed(track.max_speed)} />
          <Stat
            label="SNR máx."
            value={track.max_snr != null ? `${track.max_snr} dB` : "--"}
          />
          <Stat
            label="SNR prom."
            value={track.avg_snr != null ? `${track.avg_snr} dB` : "--"}
          />
          <Stat
            label="Conf. máx."
            value={
              track.max_confidence != null
                ? `${Math.round(track.max_confidence)}%`
                : "--"
            }
          />
          <Stat
            label="Nivel máx."
            value={track.nivel_max != null ? String(track.nivel_max) : "--"}
          />
          <div className="col-span-2">
            <div className="text-[9px] uppercase tracking-wider text-text-100/40">
              Inicio
            </div>
            <div className="text-[11px] font-semibold text-text-100/90">
              {formatDateTime(track.first_seen)}
            </div>
          </div>
          <div className="col-span-2">
            <div className="text-[9px] uppercase tracking-wider text-text-100/40">
              Fin
            </div>
            <div className="text-[11px] font-semibold text-text-100/90">
              {formatDateTime(track.last_seen)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-bg-200/50 px-1.5 py-1">
      <div className="text-[9px] uppercase tracking-wider text-text-100/40">
        {label}
      </div>
      <div className="truncate text-[11px] font-bold text-text-100">
        {value}
      </div>
    </div>
  );
}

function ZoneGroup({
  zoneName,
  color,
  tracks,
  selectedKeys,
  onToggleTrack,
}: {
  zoneName: string;
  color: string;
  tracks: TrackSummary[];
  selectedKeys: Set<string>;
  onToggleTrack: (t: TrackSummary) => void;
}) {
  const [open, setOpen] = useState(true);
  const selectedCount = tracks.filter((t) =>
    selectedKeys.has(trackKey(t)),
  ).length;
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 bg-bg-200 px-3 py-2 text-[11px] font-bold"
      >
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ background: color }}
        />
        <span className="flex-1 text-left">{zoneName}</span>
        <span className="text-text-100/50 text-[10px]">
          {tracks.length} track{tracks.length !== 1 ? "s" : ""}
          {selectedCount > 0 && (
            <span className="ml-1.5 text-lime-300">({selectedCount})</span>
          )}
        </span>
      </button>
      {open && (
        <div className="flex flex-wrap gap-1.5 p-2 bg-bg-100">
          {tracks.map((t) => {
            const selected = selectedKeys.has(trackKey(t));
            return (
              <button
                key={`${t.tipo_radar}-${t.track_id}`}
                onClick={() => onToggleTrack(t)}
                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                  selected
                    ? "border-lime-500 text-lime-400 bg-lime-500/10"
                    : "border-border-200 text-text-100/70 hover:bg-bg-200"
                }`}
              >
                {t.track_id}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
