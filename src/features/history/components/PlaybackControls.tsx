import { useMemo } from "react";
import { IconPlayerPlay, IconPlayerPause, IconX } from "@tabler/icons-react";
import type { TrackHistoryPoint } from "@/features/devices/types";
import { PLAYBACK_SPEEDS } from "../hooks/useTrackPlayback";
import type { TrackSummary } from "../types";

interface Props {
  track: TrackSummary | null;
  points: TrackHistoryPoint[];
  index: number;
  isPlaying: boolean;
  speed: number;
  onTogglePlay: () => void;
  onSpeedChange: (s: number) => void;
  onSeek: (i: number) => void;
  onClose: () => void;
}

function fmtTime(iso: string | undefined): string {
  if (!iso) return "--:--:--";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--:--:--";
  return d.toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function fmtDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistanceKm(value: number): string {
  if (value < 1) return `${value.toFixed(2)} km`;
  if (value < 10) return `${value.toFixed(1)} km`;
  return `${value.toFixed(0)} km`;
}

export function PlaybackControls({
  track,
  points,
  index,
  isPlaying,
  speed,
  onTogglePlay,
  onSpeedChange,
  onSeek,
  onClose,
}: Props) {
  const length = points.length;
  const clamped = Math.min(Math.max(index, 0), Math.max(length - 1, 0));

  const durationMs = useMemo(() => {
    if (length < 2) return 0;
    return (
      new Date(points[length - 1].fecha).getTime() -
      new Date(points[0].fecha).getTime()
    );
  }, [points, length]);

  const distanceKm = useMemo(() => {
    let total = 0;
    let prev: TrackHistoryPoint | null = null;
    for (const p of points) {
      if (!Number.isFinite(p.lat) || !Number.isFinite(p.lon)) continue;
      if (p.lat === 0 && p.lon === 0) continue;
      if (prev) {
        total += haversineDistanceKm(prev.lat, prev.lon, p.lat, p.lon);
      }
      prev = p;
    }
    return total;
  }, [points]);

  const lastPointTime = points[length - 1]?.fecha;

  if (!track || length === 0) return null;

  return (
    <div className="absolute inset-x-0 bottom-0 z-10 bg-bg-100/90 backdrop-blur border-t border-border rounded-t-xl overflow-hidden">
      <input
        type="range"
        min={0}
        max={Math.max(length - 1, 1)}
        step={1}
        value={clamped}
        onChange={(e) => onSeek(Number(e.target.value))}
        aria-label="Progreso de la reproducción"
        className="w-full relative block cursor-pointer bg-transparent"
        style={{ accentColor: "#bbff00", height: "10px" }}
      />
      <div className="flex items-center gap-3 px-4 pb-2.5 pt-1">
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onTogglePlay}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-bg-400 text-text-400 shadow hover:bg-lime-300 transition-colors"
            title={isPlaying ? "Pausar" : "Reproducir"}
          >
            {isPlaying ? (
              <IconPlayerPause size={18} />
            ) : (
              <IconPlayerPlay size={18} className="ml-0.5" />
            )}
          </button>
          <div className="flex items-center gap-1 bg-bg-300 p-1 rounded-md">
            {PLAYBACK_SPEEDS.map((s) => (
              <button
                key={s}
                onClick={() => onSpeedChange(s)}
                className={`rounded-md px-2 py-1 text-[11px] font-semibold transition-colors ${
                  speed === s
                    ? "bg-bg-400 text-text-400"
                    : "bg-bg-200 text-text-100/60 hover:bg-bg-300"
                }`}
              >
                x{s}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-text-100/70 font-mono shrink-0">
          <span className="text-[11px] text-text-100/70 font-mono shrink-0">
            Dist: {formatDistanceKm(distanceKm)}
          </span>
          <span className="text-text-100/40">·</span>
          <span>Último: {fmtTime(lastPointTime)}</span>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-text-100/70 font-mono shrink-0">
          <span>
            {fmtTime(points[clamped]?.fecha)} /{" "}
            {fmtTime(points[length - 1]?.fecha)}
          </span>
          <span className="text-text-100/40">·</span>
          <span>{fmtDuration(durationMs)}</span>
        </div>

        <div className="flex-1 min-w-0 truncate text-[11px] text-text-100/60">
          <span className="font-bold text-text-100/90">{track.track_id}</span>
          <span className="mx-1.5 text-text-100/30">·</span>
          {track.tipo_radar}
          <span className="mx-1.5 text-text-100/30">·</span>
          {length} puntos
          <span className="mx-1.5 text-[11px] text-text-100/70 font-mono shrink-0">
            {clamped + 1} / {length}
          </span>
        </div>

        <button
          onClick={onClose}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-text-100/50 hover:bg-bg-200 hover:text-text-100 transition-colors"
          title="Cerrar track"
        >
          <IconX size={16} />
        </button>
      </div>
    </div>
  );
}
