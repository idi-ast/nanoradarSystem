import { useQuery } from "@tanstack/react-query";
import { fetchTrackSummaries } from "../api";
import type { TrackSummaryFilters } from "../types";

export function useTrackSummaries(filters: TrackSummaryFilters) {
  return useQuery({
    queryKey: [
      "history-tracks",
      filters.tipoRadar ?? "",
      filters.from ?? "",
      filters.to ?? "",
      filters.search ?? "",
      filters.minPoints,
      filters.zone ?? "",
    ],
    queryFn: () => fetchTrackSummaries(filters),
    refetchOnWindowFocus: false,
  });
}