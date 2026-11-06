import { useQuery } from '@tanstack/react-query';
import { fetchActivityAnalysis } from '../activityApi';
import { validateAnalysisFilters, type AnalysisFilters } from '../analyticsData';

export function useActivityAnalysis(filters: AnalysisFilters) {
  const range = validateAnalysisFilters(filters);
  return useQuery({
    queryKey: ['activity-analysis', range.from, range.to, filters.radar, filters.minPoints],
    queryFn: async ({ signal }) => {
      signal.throwIfAborted();
      return fetchActivityAnalysis(range, filters.radar, filters.minPoints, signal);
    },
    staleTime: 60_000,
    // Cada cambio de período libera el conjunto anterior al quedar inactivo.
    gcTime: 0,
    structuralSharing: false,
    retry: false,
    refetchOnWindowFocus: false,
  });
}
