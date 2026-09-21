import { useCallback, useEffect, useRef, useState } from "react";
import { fetchTrackHistory } from "@/features/devices/services/radarService";
import type { TrackHistoryPoint } from "@/features/devices/types";
import type { TrackSummary } from "../types";

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

function maxPointsLength(tracks: TrackPlaybackItem[]): number {
  return tracks.reduce((m, t) => Math.max(m, t.points.length), 0);
}

export function useTrackPlayback(): UseTrackPlaybackResult {
  const [tracks, setTracks] = useState<TrackPlaybackItem[]>([]);
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [loading, setLoading] = useState(false);

  const tracksRef = useRef<TrackPlaybackItem[]>([]);
  useEffect(() => {
    tracksRef.current = tracks;
  }, [tracks]);

  const toggleTrack = useCallback(async (track: TrackSummary) => {
    const key = trackKey(track);
    setIsPlaying(false);
    setIndex(0);
    setTracks((prev) => {
      if (prev.some((it) => trackKey(it.summary) === key)) {
        return prev.filter((it) => trackKey(it.summary) !== key);
      }
      return [...prev, { summary: track, points: [], loading: true, error: null }];
    });
    try {
      const points = await loadPoints(track);
      setTracks((prev) =>
        prev.filter((it) => trackKey(it.summary) === key).length === 0
          ? prev
          : prev.map((it) =>
              trackKey(it.summary) === key
                ? { ...it, points, loading: false, error: null }
                : it,
            ),
      );
    } catch (e) {
      setTracks((prev) =>
        prev.map((it) =>
          trackKey(it.summary) === key
            ? {
                ...it,
                loading: false,
                error: e instanceof Error ? e.message : "Error cargando el track",
              }
            : it,
        ),
      );
    }
  }, []);

  const playAll = useCallback(async (list: TrackSummary[]) => {
    if (list.length === 0) return;
    setIsPlaying(false);
    setIndex(0);
    setLoading(true);
    setTracks(
      list.map((t) => ({ summary: t, points: [], loading: true, error: null })),
    );
    try {
      const loaded = await Promise.all(
        list.map(async (t) => {
          try {
            const points = await loadPoints(t);
            return { summary: t, points, loading: false, error: null };
          } catch (e) {
            return {
              summary: t,
              points: [],
              loading: false,
              error: e instanceof Error ? e.message : "Error cargando el track",
            } as TrackPlaybackItem;
          }
        }),
      );
      setTracks(loaded);
    } finally {
      setLoading(false);
    }
  }, []);

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
    setIsPlaying(false);
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