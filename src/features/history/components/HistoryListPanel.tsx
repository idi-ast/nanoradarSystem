import { useMemo, useState } from "react";
import { IconSearch, IconPlaylist } from "@tabler/icons-react";
import type { RadarZone } from "@/features/devices/types";
import type { TrackSummary, TrackSummaryFilters } from "../types";
import { trackKey } from "../hooks/useTrackPlayback";

interface Props {
  filters: TrackSummaryFilters;
  onFiltersChange: (f: TrackSummaryFilters) => void;
  tracks: TrackSummary[];
  isLoading: boolean;
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

export function HistoryListPanel({
  filters,
  onFiltersChange,
  tracks,
  isLoading,
  selectedKeys,
  onToggleTrack,
  onPlayAll,
  zones,
  onlyWithZones,
  onOnlyWithZonesChange,
}: Props) {
  const [tab, setTab] = useState<Tab>("tracks");

  const set = (patch: Partial<TrackSummaryFilters>) =>
    onFiltersChange({ ...filters, ...patch });

  const zoneColor = useMemo(() => {
    const map = new Map<string, string>();
    for (const z of zones) map.set(z.nombre, z.poligono.color);
    return map;
  }, [zones]);

  const tracksByZone = useMemo(() => {
    const map = new Map<string, TrackSummary[]>();
    for (const t of tracks) {
      for (const zn of t.zones) {
        const arr = map.get(zn) ?? [];
        arr.push(t);
        map.set(zn, arr);
      }
    }
    return map;
  }, [tracks]);

  const visibleZones = useMemo(() => {
    const withTracks = new Set(tracksByZone.keys());
    return zones.filter((z) => withTracks.has(z.nombre));
  }, [zones, tracksByZone]);

  const otherZones = useMemo(
    () => Array.from(tracksByZone.keys()).filter((n) => !zoneColor.has(n)),
    [tracksByZone, zoneColor],
  );

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
          label={`Tracks (${tracks.length})`}
          onClick={() => setTab("tracks")}
        />
        <TabButton
          active={tab === "zones"}
          label="Zonas"
          onClick={() => setTab("zones")}
        />
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

        <label className="flex items-center gap-2 text-[11px] text-text-100/70 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={onlyWithZones}
            onChange={(e) => onOnlyWithZonesChange(e.target.checked)}
            className="accent-lime-300"
          />
          Solo tracks que entraron a zonas
        </label>
      </div>

      {tracks.length > 0 && (
        <div className="shrink-0 px-3 pt-2 pb-1">
          <button
            onClick={() => onPlayAll(tracks)}
            className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-lime-500/50 bg-lime-500/10 px-3 py-2 text-[12px] font-semibold text-lime-300 hover:bg-lime-500/20 transition-colors"
            title={`Reproducir todos los tracks del rango (${tracks.length})`}
          >
            <IconPlaylist size={15} stroke={1.8} />
            Mostrar todos ({tracks.length})
          </button>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
        {isLoading ? (
          <p className="text-text-100/40 text-[11px] italic text-center pt-6">
            Cargando...
          </p>
        ) : tab === "tracks" ? (
          tracks.length === 0 ? (
            <p className="text-text-100/40 text-[11px] italic text-center pt-6">
              Sin tracks con los filtros actuales
            </p>
          ) : (
            tracks.map((t) => (
              <TrackCard
                key={`${t.tipo_radar}-${t.track_id}`}
                track={t}
                selected={selectedKeys.has(trackKey(t))}
                onClick={() => onToggleTrack(t)}
                zoneColor={zoneColor}
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

function TrackCard({
  track,
  selected,
  onClick,
  zoneColor,
}: {
  track: TrackSummary;
  selected: boolean;
  onClick: () => void;
  zoneColor: Map<string, string>;
}) {
  const lastDate = track.last_seen
    ? new Date(track.last_seen).toLocaleString("es-CL", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "--";
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-lg border p-2.5 transition-colors ${
        selected
          ? "border-bg-400/60 bg-bg-400/10"
          : "border-border hover:border-border-200 bg-bg-100"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold text-[12px]">{track.track_id}</span>
        <span className="text-[10px] text-text-100/50 uppercase">
          {track.tipo_radar}
        </span>
      </div>
      <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-text-100/60">
        <span>{lastDate}</span>
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
            className="ml-auto rounded px-1.5 py-0.5 text-xs font-bold text-black"
            style={{
              color: LEVEL_COLORS[track.nivel_max] ?? LEVEL_COLORS[4],
            }}
          >
            Alerta: {track.nivel_max}
          </span>
        )}
      </div>
    </button>
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
  const selectedCount = tracks.filter((t) => selectedKeys.has(trackKey(t))).length;
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
            <span className="ml-1.5 text-lime-300">
              ({selectedCount})
            </span>
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
