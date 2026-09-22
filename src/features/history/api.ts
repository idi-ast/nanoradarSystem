import { apiSystem } from "@/apis/apiSystem";
import type { TrackListResponse, TrackSummaryFilters } from "./types";

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
    zone: filters.zone || undefined,
    only_with_zones: onlyWithZones,
    page,
    limit: pageSize,
  });
  return res.data;
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