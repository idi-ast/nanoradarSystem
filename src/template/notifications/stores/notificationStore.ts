import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { 
  Notification, 
  NotificationStatus, 
  NotificationFilters,
  NotificationStats,
  NotificationPreferences,
  NotificationChannel
} from '../types';

interface NotificationState {
  // Estado
  notifications: Notification[];
  isLoading: boolean;
  error: string | null;
  
  // Filtros activos
  filters: NotificationFilters;
  
  // Preferencias del usuario
  preferences: NotificationPreferences | null;
  
  // Panel abierto/cerrado
  isPanelOpen: boolean;
  
  // Acciones de notificaciones
  addNotification: (notification: Notification) => void;
  addNotifications: (notifications: Notification[]) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  
  // Acciones de estado
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  markAsUnread: (id: string) => void;
  archiveNotification: (id: string) => void;
  deleteNotification: (id: string) => void;
  
  // Filtros
  setFilters: (filters: NotificationFilters) => void;
  clearFilters: () => void;
  
  // Preferencias
  setPreferences: (preferences: NotificationPreferences) => void;
  updateChannelPreference: (channel: NotificationChannel, enabled: boolean) => void;
  
  // UI
  togglePanel: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Getters computados
  getUnreadCount: () => number;
  getFilteredNotifications: () => Notification[];
  getStats: () => NotificationStats;
  getGroupedByCategory: () => Record<string, Notification[]>;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      // Estado inicial
      notifications: [],
      isLoading: false,
      error: null,
      filters: {},
      preferences: null,
      isPanelOpen: false,

      // Acciones de notificaciones
      addNotification: (notification) =>
        set((state) => ({
          notifications: [notification, ...state.notifications],
        })),

      addNotifications: (notifications) =>
        set((state) => ({
          notifications: [...notifications, ...state.notifications],
        })),

      removeNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),

      clearNotifications: () => set({ notifications: [] }),

      // Acciones de estado
      markAsRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id
              ? { ...n, status: 'read' as NotificationStatus, readAt: new Date() }
              : n
          ),
        })),

      markAllAsRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.status === 'unread'
              ? { ...n, status: 'read' as NotificationStatus, readAt: new Date() }
              : n
          ),
        })),

      markAsUnread: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id
              ? { ...n, status: 'unread' as NotificationStatus, readAt: undefined }
              : n
          ),
        })),

      archiveNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, status: 'archived' as NotificationStatus } : n
          ),
        })),

      deleteNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, status: 'deleted' as NotificationStatus } : n
          ),
        })),

      // Filtros
      setFilters: (filters) => set({ filters }),
      clearFilters: () => set({ filters: {} }),

      // Preferencias
      setPreferences: (preferences) => set({ preferences }),
      
      updateChannelPreference: (channel, enabled) =>
        set((state) => ({
          preferences: state.preferences
            ? {
                ...state.preferences,
                channels: {
                  ...state.preferences.channels,
                  [channel]: enabled,
                },
              }
            : null,
        })),

      // UI
      togglePanel: () => set((state) => ({ isPanelOpen: !state.isPanelOpen })),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),

      // Getters computados
      getUnreadCount: () => {
        const { notifications } = get();
        return notifications.filter((n) => n.status === 'unread').length;
      },

      getFilteredNotifications: () => {
        const { notifications, filters } = get();
        let filtered = notifications.filter((n) => n.status !== 'deleted');

        if (filters.status?.length) {
          filtered = filtered.filter((n) => filters.status!.includes(n.status));
        }
        if (filters.type?.length) {
          filtered = filtered.filter((n) => filters.type!.includes(n.type));
        }
        if (filters.priority?.length) {
          filtered = filtered.filter((n) => filters.priority!.includes(n.priority));
        }
        if (filters.category?.length) {
          filtered = filtered.filter((n) => n.category && filters.category!.includes(n.category));
        }
        if (filters.search) {
          const search = filters.search.toLowerCase();
          filtered = filtered.filter(
            (n) =>
              n.title.toLowerCase().includes(search) ||
              n.message.toLowerCase().includes(search)
          );
        }
        if (filters.dateRange) {
          filtered = filtered.filter(
            (n) =>
              n.createdAt >= filters.dateRange!.start &&
              n.createdAt <= filters.dateRange!.end
          );
        }

        return filtered;
      },

      getStats: () => {
        const { notifications } = get();
        const active = notifications.filter((n) => n.status !== 'deleted');

        return {
          total: active.length,
          unread: active.filter((n) => n.status === 'unread').length,
          byType: active.reduce(
            (acc, n) => ({ ...acc, [n.type]: (acc[n.type] || 0) + 1 }),
            {} as Record<string, number>
          ) as NotificationStats['byType'],
          byPriority: active.reduce(
            (acc, n) => ({ ...acc, [n.priority]: (acc[n.priority] || 0) + 1 }),
            {} as Record<string, number>
          ) as NotificationStats['byPriority'],
          byCategory: active.reduce(
            (acc, n) => {
              if (n.category) {
                acc[n.category] = (acc[n.category] || 0) + 1;
              }
              return acc;
            },
            {} as Record<string, number>
          ),
        };
      },

      getGroupedByCategory: () => {
        const { notifications } = get();
        return notifications
          .filter((n) => n.status !== 'deleted')
          .reduce((acc, n) => {
            const category = n.category || 'general';
            if (!acc[category]) {
              acc[category] = [];
            }
            acc[category].push(n);
            return acc;
          }, {} as Record<string, Notification[]>);
      },
    }),
    {
      name: 'notification-storage',
      partialize: (state) => ({
        notifications: state.notifications,
        preferences: state.preferences,
      }),
    }
  )
);
