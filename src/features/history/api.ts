import { apiSystem } from "@/apis/apiSystem";
import type {
  TrackListResponse,
  TrackSummary,
  TrackSummaryFilters,
} from "./types";

export interface TrackFavorite {
  track_id: string;
  tipo_radar: string;
  created_at: string | null;
}

interface TrackFavoriteListResponse {
  data: TrackFavorite[];
  total: number;
  message: string;
}

export async function fetchTrackSummaries(
  filters: TrackSummaryFilters,
  page = 1,
  pageSize = 100,
  onlyWithZones = false,
): Promise<TrackListResponse> {
  const res = await apiSystem.get<TrackListResponse>("/tracks", {
    tipo_radar: filters.tipoRadar || undefined,
    from: filters.from ? new Date(filters.from).toISOString() : undefined,
    to: filters.to ? new Date(filters.to).toISOString() : undefined,
    search: filters.search || undefined,
    min_points: filters.minPoints,
    hour_start: filters.hourStart,
    hour_end: filters.hourEnd,
    time_zone: filters.timeZone,
    min_tracked_minutes: filters.minTrackedMinutes || undefined,
    zone: filters.zone || undefined,
    behavior_class: filters.behaviorClass || undefined,
    only_with_zones: onlyWithZones,
    page,
    limit: pageSize,
    track_ids: filters.trackIds?.join(","),
  });
  if (filters.hourStart !== undefined && (res.data.time_window?.hour_start !== filters.hourStart ||
      res.data.time_window?.hour_end !== filters.hourEnd || res.data.time_window?.time_zone !== (filters.timeZone ?? 'America/Santiago'))) {
    throw new Error('El backend no confirmó el horario del informe. Actualiza el backend antes de generar el PDF.');
  }
  return res.data;
}

/** Listado para informes con cobertura explícita y páginas enriquecidas completas. */
export async function fetchReportTrackSummaries(
  filters: TrackSummaryFilters,
  onlyWithZones = false,
  onProgress?: (page: number, pages: number) => void,
  signal?: AbortSignal,
): Promise<{ tracks: TrackSummary[]; total: number; limited: boolean }> {
  // Mantener pequeñas las consultas de agregados por página.
  const pageSize = 200;
  signal?.throwIfAborted();
  const first = await fetchTrackSummaries(filters, 1, pageSize, onlyWithZones);
  signal?.throwIfAborted();
  const pages = Math.max(1, first.pages ?? 1);
  const maxPages = Math.min(pages, 50);
  const tracks = [...(first.data ?? [])];
  onProgress?.(1, maxPages);
  for (let page = 2; page <= maxPages; page++) {
    signal?.throwIfAborted();
    const result = await fetchTrackSummaries(filters, page, pageSize, onlyWithZones);
    tracks.push(...(result.data ?? []));
    onProgress?.(page, maxPages);
  }
  return { tracks, total: first.total ?? tracks.length, limited: pages > maxPages || tracks.length < (first.total ?? tracks.length) };
}

export async function fetchAllTrackSummaries(filters: TrackSummaryFilters, onlyWithZones = false): Promise<TrackSummary[]> {
  return (await fetchReportTrackSummaries(filters, onlyWithZones)).tracks;
}

export async function fetchTrackFavorites(): Promise<TrackFavoriteListResponse> {
  const res = await apiSystem.get<TrackFavoriteListResponse>("/tracks/favorites");
  return res.data;
}

export async function addTrackFavorite(
  track_id: string,
  tipo_radar: string,
): Promise<void> {
  await apiSystem.post("/tracks/favorites", {
    track_id,
    tipo_radar: tipo_radar || "unknown",
  });
}

export async function removeTrackFavorite(
  track_id: string,
  tipo_radar: string,
): Promise<void> {
  await apiSystem.delete("/tracks/favorites", {
    track_id,
    tipo_radar: tipo_radar || "unknown",
  });
}