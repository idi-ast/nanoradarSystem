import { useQuery } from '@tanstack/react-query';
import { logsService } from '../services';
import type { LogFilters } from '../types';

const QUERY_KEYS = {
  userLogs: ['user-logs'] as const,
  logDetail: ['log-detail'] as const,
  logStats: ['log-stats'] as const,
  companyLogs: ['company-logs'] as const,
};

/**
 * Hook para obtener logs del usuario
 */
export function useUserLogs(filters?: LogFilters, page = 1, limit = 20) {
  return useQuery({
    queryKey: [...QUERY_KEYS.userLogs, filters, page, limit],
    queryFn: () => logsService.getUserLogs(filters, page, limit),
    staleTime: 30 * 1000,
  });
}

/**
 * Hook para obtener detalle de un log
 */
export function useLogDetail(logId: string | null) {
  return useQuery({
    queryKey: [...QUERY_KEYS.logDetail, logId],
    queryFn: () => logsService.getLogDetail(logId!),
    enabled: !!logId,
  });
}

/**
 * Hook para obtener estadísticas de logs
 */
export function useLogStats() {
  return useQuery({
    queryKey: QUERY_KEYS.logStats,
    queryFn: () => logsService.getLogStats(),
    staleTime: 60 * 1000,
  });
}

/**
 * Hook para obtener logs de una compañía
 */
export function useCompanyLogs(
  companyId: number | null,
  filters?: LogFilters,
  page = 1,
  limit = 20
) {
  return useQuery({
    queryKey: [...QUERY_KEYS.companyLogs, companyId, filters, page, limit],
    queryFn: () => logsService.getCompanyLogs(companyId!, filters, page, limit),
    enabled: !!companyId,
    staleTime: 30 * 1000,
  });
}
