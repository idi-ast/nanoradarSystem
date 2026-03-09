import { IconBell, IconCheck, IconTrash } from "@tabler/icons-react";
import { NavLink } from "react-router";
import { Dropdown } from "@/components/ui/Dropdown";
import { useNotificationStore } from "../stores";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import type { Notification, NotificationType } from "../types";

// Colores por tipo de notificación
const typeStyles: Record<NotificationType, string> = {
  info: "bg-blue-500",
  success: "bg-green-500",
  warning: "bg-yellow-500",
  error: "bg-red-500",
  system: "bg-purple-500",
};

// Formato de tiempo relativo
function formatTime(date: Date): string {
  return formatDistanceToNow(date, { addSuffix: true, locale: es });
}

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}

function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
}: NotificationItemProps) {
  const isUnread = notification.status === "unread";

  return (
    <div
      className={`px-4 py-3 border-b border-border last:border-b-0 hover:bg-bg-200 transition-colors group ${
        isUnread ? "bg-bg-200/50" : ""
      }`}
    >
      <div className="flex gap-3">
        <div
          className={`w-2 h-2 rounded-full mt-2 shrink-0 ${
            typeStyles[notification.type]
          }`}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              {notification.actionUrl ? (
                <NavLink
                  to={notification.actionUrl}
                  className={`text-sm hover:underline ${
                    isUnread ? "font-medium" : ""
                  }`}
                >
                  {notification.title}
                </NavLink>
              ) : (
                <p className={`text-sm ${isUnread ? "font-medium" : ""}`}>
                  {notification.title}
                </p>
              )}
            </div>
            {isUnread && (
              <span className="w-2 h-2 bg-200 rounded-full shrink-0 mt-1.5" />
            )}
          </div>
          <p className="text-xs text-text-200 mt-0.5 line-clamp-2">
            {notification.message}
          </p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-text-200">
              {formatTime(notification.createdAt)}
            </span>

            {/* Acciones (visibles en hover) */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {isUnread && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkAsRead(notification.id);
                  }}
                  className="p-1 hover:bg-bg-100 rounded"
                  title="Marcar como leída"
                >
                  <IconCheck size={14} />
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(notification.id);
                }}
                className="p-1 hover:bg-bg-100 rounded text-red-500"
                title="Eliminar"
              >
                <IconTrash size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NotificationDropdown() {
  const {
    notifications,
    getUnreadCount,
    getFilteredNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotificationStore();

  const unreadCount = getUnreadCount();
  const visibleNotifications = getFilteredNotifications().slice(0, 5);

  return (
    <div className="relative bg-linear-to-b from-bg-100 to-bg-300 border-t border-t-white/20 shadow-lg shadow-bg-100  transition-all duration-300 rounded-full h-6 w-6 flex items-center justify-center ">
      <Dropdown
        id="notifications"
        trigger={
          <div className="relative  transition-colors cursor-pointer ">
            <IconBell
              size={16}
              stroke={2}
              className="text-text-100/60 animate-fade-in-up animate-delay-100"
            />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-2 px-1 bg-red-500 rounded-full flex justify-center items-center text-text-100 text-[10px] font-semibold">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </div>
        }
        menuClassName="bg-bg-100 border border-border shadow-xl"
        align="right"
      >
        <div className="w-80 ">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="font-semibold text-sm">Notificaciones</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-200 hover:text-200/80 transition-colors"
              >
                Marcar todas como leídas
              </button>
            )}
          </div>

          {/* Lista de notificaciones */}
          <div className="max-h-80 overflow-y-auto">
            {visibleNotifications.length > 0 ? (
              visibleNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={markAsRead}
                  onDelete={deleteNotification}
                />
              ))
            ) : (
              <div className="py-8 text-center">
                <IconBell
                  size={32}
                  className="mx-auto text-text-200 mb-2"
                  stroke={1.5}
                />
                <p className="text-sm text-text-200">
                  No tienes notificaciones
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 5 && (
            <div className="px-4 py-2.5 border-t border-border">
              <NavLink
                to="/template/notificaciones"
                className="block w-full text-xs text-center text-200 hover:text-200/80 transition-colors font-medium"
              >
                Ver todas las notificaciones ({notifications.length})
              </NavLink>
            </div>
          )}
        </div>
      </Dropdown>
    </div>
  );
}
