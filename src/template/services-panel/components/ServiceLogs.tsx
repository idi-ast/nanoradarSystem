import { useState } from 'react';
import {
  IconActivity,
  IconChevronDown,
  IconChevronUp,

  IconAlertCircle,
  IconCheck,
  IconInfoCircle,
  IconBug,
} from '@tabler/icons-react';
import { useUserLogs } from '../hooks';
import type { Log, LogLevel, LogAction } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

// Estilos por nivel
const levelStyles: Record<LogLevel, { bg: string; text: string; icon: React.ElementType }> = {
  info: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600', icon: IconInfoCircle },
  success: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600', icon: IconCheck },
  warning: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-600', icon: IconAlertCircle },
  error: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600', icon: IconAlertCircle },
  debug: { bg: 'bg-gray-100 dark:bg-gray-900/30', text: 'text-gray-600', icon: IconBug },
};

// Labels de acciones
const actionLabels: Record<LogAction, string> = {
  login: 'Inicio de sesión',
  logout: 'Cierre de sesión',
  create: 'Creación',
  update: 'Actualización',
  delete: 'Eliminación',
  view: 'Visualización',
  export: 'Exportación',
  import: 'Importación',
  system: 'Sistema',
};

function formatTime(date: string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: es });
}

interface LogItemProps {
  log: Log;
  onSelect?: (log: Log) => void;
}

function LogItem({ log, onSelect }: LogItemProps) {
  const style = levelStyles[log.level] || levelStyles.info;
  const Icon = style.icon;

  return (
    <div
      onClick={() => onSelect?.(log)}
      className={`flex items-start gap-3 p-3 hover:bg-bg-200 transition-colors cursor-pointer border-b border-border last:border-b-0`}
    >
      <div className={`w-8 h-8 rounded-lg ${style.bg} ${style.text} flex items-center justify-center shrink-0`}>
        <Icon size={16} />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{log.message}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded ${style.bg} ${style.text}`}>
                {actionLabels[log.action] || log.action}
              </span>
              {log.service_name && (
                <span className="text-xs text-text-200">
                  {log.service_name}
                </span>
              )}
            </div>
          </div>
          <span className="text-xs text-text-200 shrink-0">
            {formatTime(log.created_at)}
          </span>
        </div>
        
        {log.description && (
          <p className="text-xs text-text-200 mt-1 line-clamp-1">
            {log.description}
          </p>
        )}
      </div>
    </div>
  );
}

interface LogDetailModalProps {
  log: Log | null;
  onClose: () => void;
}

function LogDetailModal({ log, onClose }: LogDetailModalProps) {
  if (!log) return null;

  const style = levelStyles[log.level] || levelStyles.info;
  const Icon = style.icon;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-bg-100 rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${style.bg} ${style.text} flex items-center justify-center`}>
              <Icon size={20} />
            </div>
            <div>
              <h3 className="font-semibold">{log.message}</h3>
              <p className="text-sm text-text-200">
                {actionLabels[log.action]} • {formatTime(log.created_at)}
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {log.description && (
            <div>
              <h4 className="text-xs font-semibold text-text-200 uppercase mb-1">Descripción</h4>
              <p className="text-sm">{log.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {log.service_name && (
              <div>
                <h4 className="text-xs font-semibold text-text-200 uppercase mb-1">Servicio</h4>
                <p className="text-sm">{log.service_name}</p>
              </div>
            )}
            {log.company_name && (
              <div>
                <h4 className="text-xs font-semibold text-text-200 uppercase mb-1">Compañía</h4>
                <p className="text-sm">{log.company_name}</p>
              </div>
            )}
            {log.module && (
              <div>
                <h4 className="text-xs font-semibold text-text-200 uppercase mb-1">Módulo</h4>
                <p className="text-sm">{log.module}</p>
              </div>
            )}
            {log.ip_address && (
              <div>
                <h4 className="text-xs font-semibold text-text-200 uppercase mb-1">IP</h4>
                <p className="text-sm font-mono">{log.ip_address}</p>
              </div>
            )}
          </div>

          {log.user_agent && (
            <div>
              <h4 className="text-xs font-semibold text-text-200 uppercase mb-1">Dispositivo</h4>
              <p className="text-xs text-text-200 font-mono break-all">{log.user_agent}</p>
            </div>
          )}

          {(log.old_values || log.new_values) && (
            <div>
              <h4 className="text-xs font-semibold text-text-200 uppercase mb-2">Cambios</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {log.old_values && (
                  <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded">
                    <p className="font-semibold text-red-600 mb-1">Antes</p>
                    <pre className="text-text-200 overflow-auto">
                      {JSON.stringify(log.old_values, null, 2)}
                    </pre>
                  </div>
                )}
                {log.new_values && (
                  <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded">
                    <p className="font-semibold text-green-600 mb-1">Después</p>
                    <pre className="text-text-200 overflow-auto">
                      {JSON.stringify(log.new_values, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border">
          <button
            onClick={onClose}
            className="w-full py-2 text-sm bg-bg-200 hover:bg-bg-200/80 rounded-lg transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

interface ServiceLogsProps {
  serviceId?: number;
  serviceName?: string;
  limit?: number;
}

export default function ServiceLogs({ serviceId, serviceName, limit = 10 }: ServiceLogsProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedLog, setSelectedLog] = useState<Log | null>(null);
  
  const { data, isLoading, error } = useUserLogs(
    serviceId ? { service_id: serviceId } : undefined,
    1,
    limit
  );

  const logs = data?.data || [];

  return (
    <>
      <div className="border border-border rounded-lg overflow-hidden bg-bg-100">
        {/* Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between p-4 hover:bg-bg-200 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-200/10 text-200 flex items-center justify-center">
              <IconActivity size={20} />
            </div>
            <div className="text-left">
              <h3 className="font-semibold">Actividad Reciente</h3>
              <p className="text-xs text-text-200">
                {serviceName ? `Logs de ${serviceName}` : 'Todos mis logs'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {logs.length > 0 && (
              <span className="px-2 py-1 text-xs bg-bg-200 rounded-full">
                {data?.pagination?.total || logs.length} registros
              </span>
            )}
            {isExpanded ? <IconChevronUp size={20} /> : <IconChevronDown size={20} />}
          </div>
        </button>

        {/* Content */}
        {isExpanded && (
          <div className="border-t border-border">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-current border-r-transparent"></div>
                <p className="mt-2 text-sm text-text-200">Cargando logs...</p>
              </div>
            ) : error ? (
              <div className="p-4 text-center text-red-500 text-sm">
                Error al cargar los logs
              </div>
            ) : logs.length === 0 ? (
              <div className="p-8 text-center">
                <IconActivity size={32} className="mx-auto text-text-200 mb-2" stroke={1} />
                <p className="text-sm text-text-200">No hay actividad reciente</p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                {logs.map((log) => (
                  <LogItem
                    key={log.id}
                    log={log}
                    onSelect={setSelectedLog}
                  />
                ))}
              </div>
            )}

            {/* Footer */}
            {logs.length > 0 && data?.pagination && data.pagination.total > limit && (
              <div className="p-3 border-t border-border text-center">
                <button className="text-xs text-200 hover:underline">
                  Ver todos los logs ({data.pagination.total})
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de detalle */}
      <LogDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
    </>
  );
}
