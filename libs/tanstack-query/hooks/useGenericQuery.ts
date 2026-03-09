import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import type { QueryKey, QueryFunction } from "@tanstack/react-query";

interface UseGenericQueryOptions<T> {
  queryKey: QueryKey;
  queryFn: QueryFunction<T>;
  enabled?: boolean;
  staleTime?: number;
}

/**
 * Hook genérico para queries
 */
export function useGenericQuery<T>(options: UseGenericQueryOptions<T>) {
  return useQuery({
    ...options,
  });
}

interface UseGenericMutationOptions<TData, TVariables> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  onSuccess?: (data: TData) => void;
  invalidateKeys?: QueryKey[];
}

/**
 * Hook genérico para mutations con invalidación automática
 */
export function useGenericMutation<TData, TVariables>(
  options: UseGenericMutationOptions<TData, TVariables>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: options.mutationFn,
    onSuccess: (data) => {
      // Invalidar queries especificadas
      options.invalidateKeys?.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
      options.onSuccess?.(data);
    },
  });
}

/**
 * Hook para invalidar queries manualmente
 */
export function useInvalidateQueries() {
  const queryClient = useQueryClient();

  const invalidate = useCallback(
    (queryKey: QueryKey) => {
      queryClient.invalidateQueries({ queryKey });
    },
    [queryClient]
  );

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries();
  }, [queryClient]);

  return { invalidate, invalidateAll };
}
