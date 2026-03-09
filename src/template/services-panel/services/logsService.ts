import { apiClient } from '@/apis';
import type { Log, LogPaginatedResponse, LogFilters, LogStats } from '../types';

const LOGS_ENDPOINT = '/logs-notifications';

export const logsService = {
  /**
   * Obtener logs del usuario autenticado
   * GET /user-logs
   */
  async getUserLogs(
    filters?: LogFilters,
    page = 1,
    limit = 20
  ): Promise<LogPaginatedResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (filters?.level?.length) {
      params.append('level', filters.level.join(','));
    }
    if (filters?.action?.length) {
      params.append('action', filters.action.join(','));
    }
    if (filters?.service_id) {
      params.append('service_id', filters.service_id.toString());
    }
    if (filters?.company_id) {
      params.append('company_id', filters.company_id.toString());
    }
    if (filters?.search) {
      params.append('search', filters.search);
    }
    if (filters?.dateRange) {
      params.append('start_date', filters.dateRange.start);
      params.append('end_date', filters.dateRange.end);
    }

    const response = await apiClient.get<LogPaginatedResponse>(
      `${LOGS_ENDPOINT}/user-logs?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Obtener detalle de un log específico
   * GET /logs/:logId
   */
  async getLogDetail(logId: string): Promise<Log> {
    const response = await apiClient.get<Log>(`${LOGS_ENDPOINT}/${logId}`);
    return response.data;
  },

  /**
   * Obtener estadísticas de logs
   * GET /logs/stats
   */
  async getLogStats(): Promise<LogStats> {
    const response = await apiClient.get<LogStats>(`${LOGS_ENDPOINT}/stats`);
    return response.data;
  },

  /**
   * Obtener logs de una compañía específica
   * GET /company/:companyId/logs
   */
  async getCompanyLogs(
    companyId: number,
    filters?: LogFilters,
    page = 1,
    limit = 20
  ): Promise<LogPaginatedResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (filters?.level?.length) {
      params.append('level', filters.level.join(','));
    }
    if (filters?.action?.length) {
      params.append('action', filters.action.join(','));
    }
    if (filters?.service_id) {
      params.append('service_id', filters.service_id.toString());
    }
    if (filters?.search) {
      params.append('search', filters.search);
    }

    const response = await apiClient.get<LogPaginatedResponse>(
      `${LOGS_ENDPOINT}/company/${companyId}/logs?${params.toString()}`
    );
    return response.data;
  },
};
