import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { NotificationStore, Notification } from "../types";

/**
 * Store para notificaciones toast
 */
export const useNotificationStore = create<NotificationStore>()(
  devtools(
    (set) => ({
      // Estado inicial
      notifications: [],

      // Acciones
      addNotification: (notification: Omit<Notification, "id">) => {
        const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const duration = notification.duration ?? 5000;

        set(
          (state) => ({
            notifications: [...state.notifications, { ...notification, id }],
          }),
          false,
          "addNotification"
        );

        // Auto-remover después del duration
        if (duration > 0) {
          setTimeout(() => {
            set(
              (state) => ({
                notifications: state.notifications.filter((n) => n.id !== id),
              }),
              false,
              "autoRemoveNotification"
            );
          }, duration);
        }
      },

      removeNotification: (id: string) =>
        set(
          (state) => ({
            notifications: state.notifications.filter((n) => n.id !== id),
          }),
          false,
          "removeNotification"
        ),

      clearAll: () =>
        set({ notifications: [] }, false, "clearAll"),
    }),
    { name: "NotificationStore" }
  )
);

// ============================================
// Helpers para uso rápido
// ============================================

export const toast = {
  success: (title: string, message?: string) =>
    useNotificationStore.getState().addNotification({ type: "success", title, message }),

  error: (title: string, message?: string) =>
    useNotificationStore.getState().addNotification({ type: "error", title, message }),

  warning: (title: string, message?: string) =>
    useNotificationStore.getState().addNotification({ type: "warning", title, message }),

  info: (title: string, message?: string) =>
    useNotificationStore.getState().addNotification({ type: "info", title, message }),
};
