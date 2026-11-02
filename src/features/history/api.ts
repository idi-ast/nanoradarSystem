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
    zone: filters.zone || undefined,
    only_with_zones: onlyWithZones,
    page,
    limit: pageSize,
    track_ids: filters.trackIds?.join(","),
  });
  return res.data;
}

/**
 * Descarga TODOS los tracks que cumplen los filtros (recorre las páginas),
 * para armar el informe del período completo en vez de solo la página actual.
 */
export async function fetchAllTrackSummaries(
  filters: TrackSummaryFilters,
  onlyWithZones = false,
  pageSize = 500,
): Promise<TrackSummary[]> {
  const first = await fetchTrackSummaries(filters, 1, pageSize, onlyWithZones);
  const totalPages = first.pages ?? 1;
  const all = [...(first.data ?? [])];

  // Tope de seguridad para no bloquear la UI con rangos gigantes.
  const MAX_PAGES = 20;
  const pages = Math.min(totalPages, MAX_PAGES);
  for (let page = 2; page <= pages; page += 1) {
    const res = await fetchTrackSummaries(filters, page, pageSize, onlyWithZones);
    all.push(...(res.data ?? []));
  }
  return all;
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