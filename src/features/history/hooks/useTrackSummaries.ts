import { useQuery } from "@tanstack/react-query";
import { fetchTrackSummaries } from "../api";
import type { TrackSummaryFilters } from "../types";
import { TRACKS_PAGE_SIZE } from "../types";

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