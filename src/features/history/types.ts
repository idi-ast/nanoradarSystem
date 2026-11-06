export interface TrackSummary {
  track_id: string;
  tipo_radar: string;
  first_seen: string | null;
  last_seen: string | null;
  point_count: number;
  nivel_max: number | null;
  zones: string[];
  duration_seconds?: number | null;
  tracked_seconds?: number | null;
  distance_m?: number | null;
  avg_speed?: number | null;
  max_speed?: number | null;
  max_snr?: number | null;
  avg_snr?: number | null;
  max_confidence?: number | null;
  /** Categoría de comportamiento asignada por el clasificador (auto o manual). */
  behavior_class?: string | null;
  /** Confianza de esa categoría, 0-1. */
  behavior_confidence?: number | null;
}

export type TrackSortBy =
  | "last_seen"
  | "first_seen"
  | "distance"
  | "duration"
  | "points"
  | "nivel_max"
  | "track_id";

export interface TrackSort {
  by: TrackSortBy;
  dir: "asc" | "desc";
}

export interface TrackSummaryFilters {
  tipoRadar?: string;
  from?: string;
  to?: string;
  search?: string;
  minPoints: number;
  minTrackedMinutes?: number;
  zone?: string;
  behaviorClass?: string;
  /** IDs de tracks a forzar en la respuesta (ej. favoritos fuera de rango). */
  trackIds?: string[];
}

export interface TrackListResponse {
  data: TrackSummary[];
  message: string;
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export const TRACKS_PAGE_SIZE = 100;
/** Identidad del track agregado que devuelve el historial, sin inferir identidad física. */
export function analysisTrackKey(track: TrackSummary): string {
  return JSON.stringify([track.tipo_radar, track.track_id, track.first_seen, track.last_seen]);
}
