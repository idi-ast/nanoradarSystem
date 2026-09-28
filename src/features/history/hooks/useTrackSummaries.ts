import { useQuery } from "@tanstack/react-query";
import { fetchTrackSummaries, fetchTrackFavorites } from "../api";
import type { TrackSummaryFilters, TrackSummary } from "../types";
import { TRACKS_PAGE_SIZE } from "../types";
import { trackKey } from "./useTrackPlayback";

export function useTrackSummaries(
  filters: TrackSummaryFilters,
  page = 1,
  pageSize = TRACKS_PAGE_SIZE,
  onlyWithZones = false,
) {
  return useQuery({
    queryKey: [
      "history-tracks",
      filters.tipoRadar ?? "",
      filters.from ?? "",
      filters.to ?? "",
      filters.search ?? "",
      filters.minPoints,
      filters.zone ?? "",
      onlyWithZones,
      page,
      pageSize,
    ],
    queryFn: () => fetchTrackSummaries(filters, page, pageSize, onlyWithZones),
    select: (res) => ({
      tracks: res.data ?? [],
      total: res.total ?? 0,
      pages: res.pages ?? 1,
      page: res.page ?? page,
    }),
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook para obtener los resúmenes completos de todos los tracks favoritos.
 * Útil cuando "Solo favoritos" está activo para mostrar favoritos fuera de
 * los filtros actuales (rango de fechas, búsqueda, etc.).
 */
export function useFavoriteTrackSummaries(enabled = true) {
  const favoritesQuery = useQuery({
    queryKey: ["history-favorites"],
    queryFn: () => fetchTrackFavorites().then((res) => res.data ?? []),
    staleTime: 60_000,
    retry: false,
    enabled,
  });

  const favoriteTrackIds = favoritesQuery.data ?? [];

  // Agrupar por tipo_radar porque el backend filtra por tipo_radar por separado
  const favoritesByRadar = favoriteTrackIds.reduce(
    (acc, f) => {
      const radar = f.tipo_radar || "unknown";
      if (!acc[radar]) acc[radar] = [];
      acc[radar].push(f.track_id);
      return acc;
    },
    {} as Record<string, string[]>,
  );

  // Clave que cambia cuando cambian los IDs reales, no solo el conteo
  const favoriteIdsKey = Object.entries(favoritesByRadar)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([radar, ids]) => `${radar}:${ids.sort().join(",")}`)
    .join(";");

  return useQuery({
    queryKey: ["history-favorite-tracks", favoriteIdsKey],
    queryFn: async () => {
      if (favoriteTrackIds.length === 0) return [];
      // Hacer una llamada por cada tipo_radar
      const promises = Object.entries(favoritesByRadar).map(
        async ([radar, trackIds]) => {
          const res = await fetchTrackSummaries(
            { trackIds, tipoRadar: radar, minPoints: 1 },
            1,
            trackIds.length,
            false,
          );
          return res.data ?? [];
        },
      );
      const results = await Promise.all(promises);
      return results.flat();
    },
    enabled: enabled && favoriteTrackIds.length > 0,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Combina los tracks de la consulta principal con los favoritos,
 * priorizando los favoritos y eliminando duplicados por trackKey.
 */
export function mergeTracksWithFavorites(
  mainTracks: TrackSummary[],
  favoriteTracks: TrackSummary[],
): TrackSummary[] {
  const map = new Map<string, TrackSummary>();
  for (const t of mainTracks) map.set(trackKey(t), t);
  for (const t of favoriteTracks) map.set(trackKey(t), t); // favoritos ganan
  return Array.from(map.values());
}