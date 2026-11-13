import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchActivityAnalysis, type ActivityAnalysisData } from '../activityApi';
import { validateAnalysisFilters, type AnalysisFilters } from '../analyticsData';

export function useActivityAnalysis(filters: AnalysisFilters) {
  const range = validateAnalysisFilters(filters);
  const client = useQueryClient();
  const key = JSON.stringify([range.from, range.to, filters.radar, filters.minPoints]);
  const [partial, setPartial] = useState<{ key: string; data: ActivityAnalysisData } | null>(null);
  const query = useQuery({
    queryKey: ['activity-analysis', range.from, range.to, filters.radar, filters.minPoints],
    queryFn: async ({ signal }) => {
      signal.throwIfAborted();
      return fetchActivityAnalysis(range, filters.radar, filters.minPoints, signal, data => {
        signal.throwIfAborted(); setPartial({ key, data });
      });
    },
    staleTime: 60_000,
    // Keep only the most recent inactive result briefly for back navigation.
    gcTime: 60_000,
    structuralSharing: false,
    retry: false,
    refetchOnWindowFocus: false,
  });
  useEffect(() => {
    client.removeQueries({ type: 'inactive', predicate: item => item.queryKey[0] === 'activity-analysis' &&
      JSON.stringify(item.queryKey.slice(1)) !== key });
  }, [client, key]);
  const progress = partial?.key === key ? partial.data : undefined;
  return { ...query, data: query.data ?? progress, isSpatialLoading: query.isFetching && Boolean(progress?.spatial.pending) };
}
