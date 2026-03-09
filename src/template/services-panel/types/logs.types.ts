// Tipos del sistema de logs

export type LogLevel = 'info' | 'warning' | 'error' | 'debug' | 'success';
export type LogAction = 'login' | 'logout' | 'create' | 'update' | 'delete' | 'view' | 'export' | 'import' | 'system';

export interface Log {
  id: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  
  // Acción
  action: LogAction;
  level: LogLevel;
  message: string;
  description?: string;
  
  // Contexto
  service_id?: number;
  service_name?: string;
  company_id?: number;
  company_name?: string;
  
  // Metadatos
  ip_address?: string;
  user_agent?: string;
  module?: string;
  resource_type?: string;
  resource_id?: string;
  
  // Datos adicionales
  metadata?: Record<string, unknown>;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  
  // Timestamps
  created_at: string;
}

export interface LogStats {
  total: number;
  byLevel: Record<LogLevel, number>;
  byAction: Record<LogAction, number>;
  recentActivity: {
    date: string;
    count: number;
  }[];
}

export interface LogFilters {
  level?: LogLevel[];
  action?: LogAction[];
  service_id?: number;
  company_id?: number;
  dateRange?: {
    start: string;
    end: string;
  };
  search?: string;
}

export interface LogPaginatedResponse {
  data: Log[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
