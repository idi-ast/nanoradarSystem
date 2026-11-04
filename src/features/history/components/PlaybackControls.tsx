import { useMemo } from "react";
import { IconPlayerPlay, IconPlayerPause, IconX } from "@tabler/icons-react";
import { PLAYBACK_SPEEDS, pathDistanceM } from "../hooks/useTrackPlayback";
import type { TrackPlaybackItem } from "../hooks/useTrackPlayback";

interface Props {
  tracks: TrackPlaybackItem[];
  totalTracks: number;
  index: number;
  isPlaying: boolean;
  speed: number;
  onTogglePlay: () => void;
  onSpeedChange: (s: number) => void;
  onSeek: (i: number) => void;
  onClose: () => void;
  onShowAll: () => void;
}

function fmtTime(iso?: string): string {
  if (!iso || !Number.isFinite(Date.parse(iso))) return "--:--:--";
  return new Date(iso).toLocaleTimeString("es-CL", {
    timeZone: "America/Santiago", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  });
}
function fmtDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
const number = (value: number) => value.toLocaleString('es-CL', { maximumFractionDigits: 1 });

export function PlaybackControls({ tracks, totalTracks, index, isPlaying, speed, onTogglePlay, onSpeedChange, onSeek, onClose, onShowAll }: Props) {
  const stats = useMemo(() => {
    let length = 0, points = 0, distance = 0, first = Infinity, last = -Infinity;
    for (const t of tracks) {
      length = Math.max(length, t.points.length);
      points += t.points.length;
      distance += pathDistanceM(t.points);
      for (const p of t.points) {
        const time = Date.parse(p.fecha);
        if (Number.isFinite(time)) { first = Math.min(first, time); last = Math.max(last, time); }
      }
    }
    return { length, points, distance, first: Number.isFinite(first) ? new Date(first).toISOString() : undefined, last: Number.isFinite(last) ? new Date(last).toISOString() : undefined, durationMs: Number.isFinite(first) && Number.isFinite(last) ? last - first : 0 };
  }, [tracks]);
  const clamped = Math.min(Math.max(index, 0), Math.max(stats.length - 1, 0));
  const single = tracks.length === 1 ? tracks[0] : null;
  const current = single?.points[clamped];
  const category = current?.behavior_class || single?.summary.behavior_class;
  const loadingCount = tracks.filter(t => t.loading).length;
  if (!tracks.length) return null;

  return <div className="absolute inset-x-0 bottom-0 z-10 overflow-hidden rounded-t-xl border-t border-border bg-bg-100/95 backdrop-blur" aria-label="Reproductor de tracks">
    <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-3 text-xs">
      <div className="min-w-0" aria-live="polite">{single ? <><strong className="text-sm text-text-100">Track ID: {single.summary.track_id}</strong><span className="ml-2 text-text-200">Radar: {single.summary.tipo_radar}</span>{category && <span className="ml-2 capitalize text-text-200">{category.replace(/_/g, ' ')}</span>}</> : <strong>{tracks.length} tracks · Reproducción conjunta</strong>}</div>
      <div className="flex items-center gap-2">{single && totalTracks > 1 && <button type="button" onClick={onShowAll} className="rounded-md border border-border px-2 py-1 text-sky-400">Reproducir todos ({totalTracks})</button>}<button type="button" onClick={onClose} aria-label="Cerrar todos los tracks" title="Cerrar todos los tracks" className="rounded-md p-1.5 text-text-200 hover:bg-bg-200"><IconX size={16} /></button></div>
    </div>
    <input type="range" min={0} max={Math.max(stats.length - 1, 1)} step={1} value={clamped} disabled={!stats.length} onChange={e => onSeek(Number(e.target.value))} aria-label="Progreso de la reproducción" aria-valuetext={single ? `${single.summary.track_id}: posición ${stats.length ? clamped + 1 : 0} de ${stats.length}` : `Posición ${stats.length ? clamped + 1 : 0} de ${stats.length}`} className="relative mt-2 block w-full cursor-pointer bg-transparent disabled:opacity-40" style={{ accentColor: '#bbff00', height: 10 }} />
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2.5">
      <div className="flex shrink-0 items-center gap-2"><button type="button" onClick={onTogglePlay} disabled={!stats.length || Boolean(single?.loading)} aria-label={`${isPlaying ? 'Pausar' : 'Reproducir'}${single ? ` track ${single.summary.track_id}` : ' todos los tracks'}`} title={isPlaying ? 'Pausar' : 'Reproducir'} className="flex h-9 w-9 items-center justify-center rounded-full bg-bg-400 text-text-400 shadow transition-colors hover:bg-lime-300 disabled:opacity-40">{isPlaying ? <IconPlayerPause size={18} /> : <IconPlayerPlay size={18} className="ml-0.5" />}</button><div className="flex gap-1 rounded-md bg-bg-300 p-1">{PLAYBACK_SPEEDS.map(s => <button type="button" key={s} aria-pressed={speed === s} onClick={() => onSpeedChange(s)} className={`rounded-md px-2 py-1 text-[11px] font-semibold ${speed === s ? 'bg-bg-400 text-text-400' : 'bg-bg-200 text-text-200'}`}>x{s}</button>)}</div></div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-text-200"><span>Recorrido: {stats.distance >= 1000 ? `${number(stats.distance / 1000)} km` : `${number(stats.distance)} m`}</span><span>{fmtTime(stats.first)} → {fmtTime(stats.last)}</span><span>Duración: {fmtDuration(stats.durationMs)}</span><span>{number(stats.points)} pts · {stats.length ? clamped + 1 : 0} / {stats.length}</span>{current && <><span>Actual: {fmtTime(current.fecha)}</span><span>Velocidad: {current.speed != null && Number.isFinite(current.speed) ? `${number(current.speed * 3.6)} km/h` : 'N/D'}</span><span>Zona: {current.zona || 'Área libre'}</span><span>{current.lat.toFixed(6)}, {current.lon.toFixed(6)}</span></>}</div>
      {loadingCount > 0 && <span role="status" className="text-xs text-sky-400">Cargando {loadingCount}…</span>}
      {single?.error && <span role="alert" className="text-xs text-red-400">{single.error}</span>}
      {single && !single.loading && !single.error && !stats.length && <span className="text-xs text-text-200">Sin posiciones disponibles para este track.</span>}
    </div>
  </div>;
}
