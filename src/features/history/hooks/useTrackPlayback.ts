import { useCallback, useEffect, useRef, useState } from "react";
import { fetchTrackHistory } from "@/features/devices/services/radarService";
import type { TrackHistoryPoint } from "@/features/devices/types";
import type { TrackSummary } from "../types";

export const BASE_STEP_MS = 500;
export const PLAYBACK_SPEEDS = [0.5, 1, 2, 4, 8] as const;

interface UseTrackPlaybackResult {
  selectedTrack: TrackSummary | null;
  points: TrackHistoryPoint[];
  index: number;
  isPlaying: boolean;
  speed: number;
  loading: boolean;
  error: string | null;
  selectTrack: (track: TrackSummary | null) => void;
  togglePlay: () => void;
  changeSpeed: (s: number) => void;
  seekTo: (i: number) => void;
  close: () => void;
}

export function useTrackPlayback(): UseTrackPlaybackResult {
  const [selectedTrack, setSelectedTrack] = useState<TrackSummary | null>(null);
  const [points, setPoints] = useState<TrackHistoryPoint[]>([]);
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pointsRef = useRef<TrackHistoryPoint[]>([]);
  useEffect(() => {
    pointsRef.current = points;
  }, [points]);

  const selectTrack = useCallback(async (track: TrackSummary | null) => {
    setSelectedTrack(track);
    setIsPlaying(false);
    setError(null);
    if (!track) {
      setPoints([]);
      setIndex(0);
      return;
    }
    setLoading(true);
    try {
      const res = await fetchTrackHistory(track.track_id, {
        tipo_radar: track.tipo_radar,
        from: track.first_seen
          ? new Date(track.first_seen).toISOString()
          : undefined,
        to: track.last_seen
          ? new Date(track.last_seen).toISOString()
          : undefined,
        limit: 20000,
      });
      setPoints(res.points ?? []);
      setIndex(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando el track");
      setPoints([]);
      setIndex(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isPlaying || points.length === 0) return;
    const intervalId = window.setInterval(() => {
      setIndex((i) => {
        if (pointsRef.current.length === 0 || i >= pointsRef.current.length - 1) {
          setIsPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, BASE_STEP_MS / speed);
    return () => window.clearInterval(intervalId);
  }, [isPlaying, speed, points.length]);

  const togglePlay = useCallback(() => {
    if (pointsRef.current.length === 0) return;
    setIndex((i) => (i >= pointsRef.current.length - 1 ? 0 : i));
    setIsPlaying((p) => !p);
  }, []);

  const changeSpeed = useCallback((s: number) => setSpeed(s), []);

  const seekTo = useCallback((i: number) => {
    const max = Math.max(0, pointsRef.current.length - 1);
    setIndex(Math.max(0, Math.min(max, Math.round(i))));
  }, []);

  const close = useCallback(() => {
    setIsPlaying(false);
    setSelectedTrack(null);
    setPoints([]);
    setIndex(0);
    setError(null);
  }, []);

  return {
    selectedTrack,
    points,
    index,
    isPlaying,
    speed,
    loading,
    error,
    selectTrack,
    togglePlay,
    changeSpeed,
    seekTo,
    close,
  };
}