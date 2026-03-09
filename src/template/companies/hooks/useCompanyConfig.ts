import { useQuery } from "@tanstack/react-query";
import { companiesService } from "../services";

const QUERY_KEYS = {
  companyConfig: ["companies", "config"] as const,
};

export function useCompanyConfig(companyId?: number) {
  const query = useQuery({
    queryKey: [...QUERY_KEYS.companyConfig, companyId],
    queryFn: () => companiesService.getCompanyDetails(companyId!),
    enabled: Boolean(companyId),
    staleTime: 30 * 1000,
  });

  return {
    companyConfig: query.data ?? null,
    loading: query.isLoading,
    error: query.error,
  };
}
