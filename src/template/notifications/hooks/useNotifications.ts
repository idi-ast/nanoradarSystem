import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationService } from '../services';
import { useNotificationStore } from '../stores';
import type { NotificationFilters, CreateNotificationDTO } from '../types';

const QUERY_KEYS = {
  notifications: ['notifications'] as const,
  unreadCount: ['notifications', 'unread-count'] as const,
  preferences: ['notifications', 'preferences'] as const,
};

/**
 * Hook principal para gestionar notificaciones
 */
export function useNotifications(filters?: NotificationFilters, page = 1, limit = 20) {
  const queryClient = useQueryClient();
  const store = useNotificationStore();

  // Query para obtener notificaciones
  const notificationsQuery = useQuery({
    queryKey: [...QUERY_KEYS.notifications, filters, page, limit],
    queryFn: () => notificationService.getNotifications(filters, page, limit),
    staleTime: 30 * 1000, // 30 segundos
  });

  // Query para contador de no leídas
  const unreadCountQuery = useQuery({
    queryKey: QUERY_KEYS.unreadCount,
    queryFn: () => notificationService.getUnreadCount(),
    refetchInterval: 60 * 1000, // Refrescar cada minuto
  });

  // Mutation para marcar como leída
  const markAsReadMutation = useMutation({
    mutationFn: notificationService.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.unreadCount });
    },
  });

  // Mutation para marcar todas como leídas
  const markAllAsReadMutation = useMutation({
    mutationFn: notificationService.markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.unreadCount });
      store.markAllAsRead();
    },
  });

  // Mutation para eliminar
  const deleteMutation = useMutation({
    mutationFn: notificationService.deleteNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.unreadCount });
    },
  });

  return {
    // Datos
    notifications: notificationsQuery.data?.data ?? [],
    pagination: notificationsQuery.data?.pagination,
    unreadCount: unreadCountQuery.data ?? store.getUnreadCount(),
    
    // Estado
    isLoading: notificationsQuery.isLoading,
    isError: notificationsQuery.isError,
    error: notificationsQuery.error,
    
    // Acciones
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    delete: deleteMutation.mutate,
    
    // Refetch
    refetch: notificationsQuery.refetch,
  };
}

/**
 * Hook para crear notificaciones (admin/sistema)
 */
export function useCreateNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateNotificationDTO) =>
      notificationService.createNotification(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.unreadCount });
    },
  });
}

/**
 * Hook para preferencias de notificaciones
 */
export function useNotificationPreferences() {
  const queryClient = useQueryClient();
  const store = useNotificationStore();

  const preferencesQuery = useQuery({
    queryKey: QUERY_KEYS.preferences,
    queryFn: notificationService.getPreferences,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: notificationService.updatePreferences,
    onSuccess: (data) => {
      queryClient.setQueryData(QUERY_KEYS.preferences, data);
      store.setPreferences(data);
    },
  });

  return {
    preferences: preferencesQuery.data,
    isLoading: preferencesQuery.isLoading,
    updatePreferences: updatePreferencesMutation.mutate,
    isUpdating: updatePreferencesMutation.isPending,
  };
}
