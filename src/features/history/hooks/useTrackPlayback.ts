import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { fetchTrackHistory } from "@/features/devices/services/radarService";
import type { TrackHistoryPoint } from "@/features/devices/types";
import type { TrackSummary } from "../types";

/** Trayectorias simultaneas que se piden al reproducir varios tracks */
const MAX_CONCURRENT_LOADS = 4;
/** Las trayectorias historicas no cambian: se cachean 10 min */
const TRAJECTORY_STALE_MS = 10 * 60_000;

export const BASE_STEP_MS = 500;
export const PLAYBACK_SPEEDS = [0.5, 1, 2, 4, 8] as const;

export interface TrackPlaybackItem {
  summary: TrackSummary;
  points: TrackHistoryPoint[];
  loading: boolean;
  error: string | null;
}

export function trackKey(t: { track_id: string; tipo_radar: string }): string {
  return `${t.tipo_radar}:${t.track_id}`;
}

interface UseTrackPlaybackResult {
  tracks: TrackPlaybackItem[];
  index: number;
  activeTrackKey: string | null;
  playbackTracks: TrackPlaybackItem[];
  trackIndices: Record<string, number>;
  selectTrack: (key: string | null) => void;
  isPlaying: boolean;
  speed: number;
  loading: boolean;
  toggleTrack: (t: TrackSummary) => void;
  playAll: (list: TrackSummary[]) => void;
  togglePlay: () => void;
  changeSpeed: (s: number) => void;
  seekTo: (i: number) => void;
  clearAll: () => void;
}

async function loadPoints(track: TrackSummary): Promise<TrackHistoryPoint[]> {
  const res = await fetchTrackHistory(track.track_id, {
    tipo_radar: track.tipo_radar,
    from: track.first_seen
      ? new Date(track.first_seen).toISOString()
      : undefined,
    to: track.last_seen ? new Date(track.last_seen).toISOString() : undefined,
    session_ref: track.last_seen
      ? new Date(track.last_seen).toISOString()
      : undefined,
    limit: 20000,
  });

  const seen = new Map<string, TrackHistoryPoint>();
  for (const p of res.points ?? []) {
    if (p.lat === 0 && p.lon === 0) continue;
    if (!Number.isFinite(p.lat) || !Number.isFinite(p.lon)) continue;
    const key = `${Math.round(new Date(p.fecha).getTime() / 1000)}`;
    if (!seen.has(key)) seen.set(key, p);
  }
  return Array.from(seen.values()).sort(
    (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime(),
  );
}

/** Trayectoria via cache de react-query: volver a seleccionar es instantaneo */
function getPoints(qc: QueryClient, track: TrackSummary) {
  return qc.fetchQuery({
    queryKey: ["history-trajectory", trackKey(track), track.last_seen ?? ""],
    queryFn: () => loadPoints(track),
    staleTime: TRAJECTORY_STALE_MS,
    gcTime: 60_000,
  });
}

/** Distancia recorrida (m) a partir de la trayectoria ya cargada */
export function pathDistanceM(points: TrackHistoryPoint[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLon = ((b.lon - a.lon) * Math.PI) / 180;
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((a.lat * Math.PI) / 180) *
        Math.cos((b.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    total += 2 * 6371000 * Math.asin(Math.min(1, Math.sqrt(h)));
  }
  return total;
}

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : "Error cargando el track";
}

function maxPointsLength(tracks: TrackPlaybackItem[]): number {
  return tracks.reduce((m, t) => Math.max(m, t.points.length), 0);
}

export function useTrackPlayback(): UseTrackPlaybackResult {
  const [tracks, setTracks] = useState<TrackPlaybackItem[]>([]);
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [loading, setLoading] = useState(false);
  const [activeTrackKey, setActiveTrackKey] = useState<string | null>(null);
  const [parkedIndices, setParkedIndices] = useState<Record<string, number>>({});
  const playbackTracks = useMemo(() => activeTrackKey
    ? tracks.filter(t => trackKey(t.summary) === activeTrackKey) : tracks, [tracks, activeTrackKey]);
  const trackIndices = useMemo(() => Object.fromEntries(tracks.map(t => {
    const key = trackKey(t.summary);
    return [key, !activeTrackKey || key === activeTrackKey ? index : parkedIndices[key] ?? 0];
  })), [tracks, activeTrackKey, index, parkedIndices]);

  const qc = useQueryClient();
  // invalida cargas en curso cuando cambia la seleccion (playAll/clearAll)
  const generationRef = useRef(0);

  useEffect(() => () => {
    // Evitar que un lote siga descargando tracks después de salir de la página.
    generationRef.current++;
  }, []);

  const tracksRef = useRef<TrackPlaybackItem[]>([]);
  useEffect(() => {
    tracksRef.current = tracks;
  }, [tracks]);

  const patchTrack = useCallback(
    (key: string, patch: Partial<TrackPlaybackItem>) => {
      setTracks((prev) =>
        prev.map((it) => (trackKey(it.summary) === key ? { ...it, ...patch } : it)),
      );
    },
    [],
  );

  const selectTrack = useCallback((key: string | null) => {
    if (key === activeTrackKey || (key && !tracksRef.current.some(t => trackKey(t.summary) === key))) return;
    // Park the current scope before switching, keeping other tracks stationary.
    setParkedIndices(previous => {
      const next = { ...previous };
      for (const t of tracksRef.current) {
        const id = trackKey(t.summary);
        if (!activeTrackKey || id === activeTrackKey) next[id] = Math.min(index, Math.max(0, t.points.length - 1));
      }
      return next;
    });
    setIsPlaying(false);
    setActiveTrackKey(key);
    const target = tracksRef.current.find(t => trackKey(t.summary) === key);
    setIndex(key && target ? Math.min(parkedIndices[key] ?? (!activeTrackKey ? index : 0), Math.max(0, target.points.length - 1)) : 0);
  }, [activeTrackKey, index, parkedIndices]);

  const toggleTrack = useCallback(
    async (track: TrackSummary) => {
      const key = trackKey(track);
      setParkedIndices(previous => ({ ...previous, ...trackIndices }));
      setIsPlaying(false);
      setIndex(0);
      if (tracksRef.current.some((it) => trackKey(it.summary) === key)) {
        setTracks((prev) => prev.filter((it) => trackKey(it.summary) !== key));
        if (activeTrackKey === key) setActiveTrackKey(null);
        return; // deseleccion: no se pide nada
      }
      setActiveTrackKey(key);
      setTracks((prev) => [
        ...prev,
        { summary: track, points: [], loading: true, error: null },
      ]);
      const gen = generationRef.current;
      try {
        const points = await getPoints(qc, track);
        if (gen !== generationRef.current) return;
        // si se deselecciono mientras cargaba, patchTrack no encuentra nada
        patchTrack(key, { points, loading: false, error: null });
      } catch (e) {
        if (gen !== generationRef.current) return;
        patchTrack(key, { loading: false, error: errMsg(e) });
      }
    },
    [qc, patchTrack, activeTrackKey, trackIndices],
  );

  const playAll = useCallback(
    async (list: TrackSummary[]) => {
      if (list.length === 0) return;
      const current = tracksRef.current;
      const allSelected =
        current.length > 0 &&
        list.every((t) =>
          current.some((it) => trackKey(it.summary) === trackKey(t)),
        );
      const gen = ++generationRef.current;
      setActiveTrackKey(null);
      setParkedIndices({});
      setLoading(false);
      setIsPlaying(false);
      setIndex(0);
      if (allSelected) {
        setTracks([]);
        return;
      }
      setLoading(true);
      setTracks(
        list.map((t) => ({ summary: t, points: [], loading: true, error: null })),
      );
      // pool con concurrencia limitada; cada track aparece apenas llega
      let next = 0;
      const worker = async () => {
        while (next < list.length && gen === generationRef.current) {
          const t = list[next++];
          try {
            const points = await getPoints(qc, t);
            if (gen !== generationRef.current) return;
            patchTrack(trackKey(t), { points, loading: false, error: null });
          } catch (e) {
            if (gen !== generationRef.current) return;
            patchTrack(trackKey(t), { loading: false, error: errMsg(e) });
          }
        }
      };
      try {
        await Promise.all(
          Array.from(
            { length: Math.min(MAX_CONCURRENT_LOADS, list.length) },
            worker,
          ),
        );
      } finally {
        if (gen === generationRef.current) setLoading(false);
      }
    },
    [qc, patchTrack],
  );

  useEffect(() => {
    if (!isPlaying) return;
    const maxLen = maxPointsLength(activeTrackKey ? tracksRef.current.filter(t => trackKey(t.summary) === activeTrackKey) : tracksRef.current);
    if (maxLen === 0) return;
    const intervalId = window.setInterval(() => {
      setIndex((i) => {
        if (i >= maxLen - 1) {
          setIsPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, BASE_STEP_MS / speed);
    return () => window.clearInterval(intervalId);
  }, [isPlaying, speed, tracks, activeTrackKey]);

  const togglePlay = useCallback(() => {
    const maxLen = maxPointsLength(activeTrackKey ? tracksRef.current.filter(t => trackKey(t.summary) === activeTrackKey) : tracksRef.current);
    if (maxLen === 0) return;
    setIndex((i) => (i >= maxLen - 1 ? 0 : i));
    setIsPlaying((p) => !p);
  }, [activeTrackKey]);

  const changeSpeed = useCallback((s: number) => setSpeed(s), []);

  const seekTo = useCallback((i: number) => {
    const maxLen = maxPointsLength(activeTrackKey ? tracksRef.current.filter(t => trackKey(t.summary) === activeTrackKey) : tracksRef.current);
    const max = Math.max(0, maxLen - 1);
    setIndex(Math.max(0, Math.min(max, Math.round(i))));
  }, [activeTrackKey]);

  const clearAll = useCallback(() => {
    generationRef.current++;
    setIsPlaying(false);
    setLoading(false);
    setActiveTrackKey(null);
    setParkedIndices({});
    setTracks([]);
    setIndex(0);
  }, []);

  return {
    tracks,
    index,
    activeTrackKey,
    playbackTracks,
    trackIndices,
    selectTrack,
    isPlaying,
    speed,
    loading,
    toggleTrack,
    playAll,
    togglePlay,
    changeSpeed,
    seekTo,
    clearAll,
  };
}