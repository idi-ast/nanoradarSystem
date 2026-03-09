// Tipos del sistema de notificaciones

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'system';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';
export type NotificationStatus = 'unread' | 'read' | 'archived' | 'deleted';
export type NotificationChannel = 'in-app' | 'email' | 'push' | 'sms';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  status: NotificationStatus;
  
  // Metadatos
  createdAt: Date;
  readAt?: Date;
  expiresAt?: Date;
  
  // Origen
  source?: string;        // Módulo o sistema que generó la notificación
  sourceId?: string;      // ID del recurso relacionado
  
  // Acción
  actionUrl?: string;     // URL para navegar al hacer click
  actionLabel?: string;   // Texto del botón de acción
  
  // Agrupación
  category?: string;      // Categoría para filtrado
  tags?: string[];        // Tags para búsqueda
  groupId?: string;       // Para agrupar notificaciones relacionadas
  
  // UI
  icon?: string;          // Icono personalizado
  image?: string;         // Imagen o avatar
  
  // Datos adicionales
  metadata?: Record<string, unknown>;
}

export interface NotificationGroup {
  id: string;
  title: string;
  notifications: Notification[];
  count: number;
  unreadCount: number;
}

export interface NotificationPreferences {
  userId: string;
  channels: {
    [key in NotificationChannel]: boolean;
  };
  categories: {
    [category: string]: {
      enabled: boolean;
      channels: NotificationChannel[];
    };
  };
  quietHours?: {
    enabled: boolean;
    start: string;  // "22:00"
    end: string;    // "08:00"
    timezone: string;
  };
  digest?: {
    enabled: boolean;
    frequency: 'daily' | 'weekly';
    time: string;   // "09:00"
  };
}

export interface NotificationFilters {
  status?: NotificationStatus[];
  type?: NotificationType[];
  priority?: NotificationPriority[];
  category?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  search?: string;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<NotificationType, number>;
  byPriority: Record<NotificationPriority, number>;
  byCategory: Record<string, number>;
}

// DTOs para API
export interface CreateNotificationDTO {
  title: string;
  message: string;
  type?: NotificationType;
  priority?: NotificationPriority;
  category?: string;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, unknown>;
  channels?: NotificationChannel[];
  targetUsers?: string[];   // IDs de usuarios específicos
  targetRoles?: string[];   // Roles de usuarios
}

export interface UpdateNotificationDTO {
  status?: NotificationStatus;
  readAt?: Date;
}

export interface NotificationPaginatedResponse {
  data: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
