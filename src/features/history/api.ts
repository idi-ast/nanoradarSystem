import { apiSystem } from "@/apis/apiSystem";
import type { TrackListResponse, TrackSummary, TrackSummaryFilters } from "./types";

export async function fetchTrackSummaries(
  filters: TrackSummaryFilters,
): Promise<TrackSummary[]> {
  const res = await apiSystem.get<TrackListResponse>("/tracks", {
    tipo_radar: filters.tipoRadar || undefined,
    from: filters.from
      ? new Date(filters.from).toISOString()
      : undefined,
    to: filters.to ? new Date(filters.to).toISOString() : undefined,
    search: filters.search || undefined,
    min_points: filters.minPoints,
    zone: filters.zone || undefined,
  });
  return res.data.data ?? [];
}