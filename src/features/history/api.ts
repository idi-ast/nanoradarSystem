import { apiSystem } from "@/apis/apiSystem";
import type { TrackListResponse, TrackSummaryFilters } from "./types";

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