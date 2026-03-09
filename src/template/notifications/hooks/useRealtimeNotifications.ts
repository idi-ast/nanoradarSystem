import { useEffect, useCallback } from 'react';
import { useNotificationStore } from '../stores';
import { notificationService } from '../services';
import type { Notification } from '../types';

/**
 * Hook para suscribirse a notificaciones en tiempo real
 */
export function useRealtimeNotifications() {
  const store = useNotificationStore();

  const handleNewNotification = useCallback((notification: Notification) => {
    // Agregar al store local
    store.addNotification(notification);
    
    // Mostrar notificación del navegador si está permitido
    if (Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: notification.icon || '/favicon.ico',
        tag: notification.id,
      });
    }
  }, [store]);

  useEffect(() => {
    // Suscribirse a notificaciones
    const unsubscribe = notificationService.subscribeToNotifications(
      handleNewNotification
    );

    // Cleanup
    return () => {
      unsubscribe();
    };
  }, [handleNewNotification]);

  // Solicitar permisos de notificación del navegador
  const requestPermission = useCallback(async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }, []);

  return {
    requestPermission,
    permissionStatus: 'Notification' in window ? Notification.permission : 'denied',
  };
}
