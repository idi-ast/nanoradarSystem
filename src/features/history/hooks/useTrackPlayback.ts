import { useCallback, useEffect, useRef, useState } from "react";
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
    gcTime: TRAJECTORY_STALE_MS,
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

  const qc = useQueryClient();
  // invalida cargas en curso cuando cambia la seleccion (playAll/clearAll)
  const generationRef = useRef(0);

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

  const toggleTrack = useCallback(
    async (track: TrackSummary) => {
      const key = trackKey(track);
      setIsPlaying(false);
      setIndex(0);
      if (tracksRef.current.some((it) => trackKey(it.summary) === key)) {
        setTracks((prev) => prev.filter((it) => trackKey(it.summary) !== key));
        return; // deseleccion: no se pide nada
      }
      setTracks((prev) => [
        ...prev,
        { summary: track, points: [], loading: true, error: null },
      ]);
      try {
        const points = await getPoints(qc, track);
        // si se deselecciono mientras cargaba, patchTrack no encuentra nada
        patchTrack(key, { points, loading: false, error: null });
      } catch (e) {
        patchTrack(key, { loading: false, error: errMsg(e) });
      }
    },
    [qc, patchTrack],
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
    const maxLen = maxPointsLength(tracksRef.current);
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
  }, [isPlaying, speed, tracks]);

  const togglePlay = useCallback(() => {
    const maxLen = maxPointsLength(tracksRef.current);
    if (maxLen === 0) return;
    setIndex((i) => (i >= maxLen - 1 ? 0 : i));
    setIsPlaying((p) => !p);
  }, []);

  const changeSpeed = useCallback((s: number) => setSpeed(s), []);

  const seekTo = useCallback((i: number) => {
    const maxLen = maxPointsLength(tracksRef.current);
    const max = Math.max(0, maxLen - 1);
    setIndex(Math.max(0, Math.min(max, Math.round(i))));
  }, []);

  const clearAll = useCallback(() => {
    generationRef.current++;
    setIsPlaying(false);
    setLoading(false);
    setTracks([]);
    setIndex(0);
  }, []);

  return {
    tracks,
    index,
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