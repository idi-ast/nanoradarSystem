import { WidgetContainer } from "../base/WidgetContainer";
import type { StatusListWidgetProps, StatusItem } from "../types";

const statusDot: Record<StatusItem["status"], string> = {
  online: "bg-green-400",
  offline: "bg-text-400",
  warning: "bg-yellow-400",
  error: "bg-red-400",
  idle: "bg-blue-400",
};

const statusLabel: Record<StatusItem["status"], string> = {
  online: "En línea",
  offline: "Desconectado",
  warning: "Advertencia",
  error: "Error",
  idle: "Inactivo",
};

/**
 * Lista de dispositivos / servicios con estado de conexión.
 *
 * @example
 * <StatusListWidget
 *   title="Estado de dispositivos"
 *   items={[
 *     { id: "1", label: "Servidor principal", status: "online", value: "45ms" },
 *     { id: "2", label: "Sensor T-01", status: "warning", lastSeen: "hace 2m" },
 *     { id: "3", label: "Gateway", status: "error" },
 *   ]}
 *   gridPosition={{ colSpan: 4 }}
 * />
 */
export function StatusListWidget({
  items,
  maxVisible,
  title,
  subtitle,
  headerActions,
  gridPosition,
  absolutePosition,
  draggable,
  className,
  style,
  onPositionChange,
}: StatusListWidgetProps) {
  const visible = maxVisible ? items.slice(0, maxVisible) : items;

  return (
    <WidgetContainer
      title={title}
      subtitle={subtitle}
      headerActions={headerActions}
      gridPosition={gridPosition}
      absolutePosition={absolutePosition}
      draggable={draggable}
      className={className}
      style={style}
      onPositionChange={onPositionChange}
    >
      <ul className="flex flex-col gap-2">
        {visible.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between gap-3 py-2 border-b border-border/40 last:border-0"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Indicador pulsante para online */}
              <span className="relative shrink-0 flex h-2.5 w-2.5">
                {item.status === "online" && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60" />
                )}
                <span
                  className={`relative inline-flex h-2.5 w-2.5 rounded-full ${statusDot[item.status]}`}
                />
              </span>
              <span className="text-sm text-text-100 truncate">{item.label}</span>
            </div>

            <div className="flex flex-col items-end shrink-0">
              {item.value && (
                <span className="text-xs font-medium text-text-200">
                  {item.value}
                </span>
              )}
              <span
                className={`text-[10px] font-medium ${
                  item.status === "online"
                    ? "text-green-400"
                    : item.status === "error"
                    ? "text-red-400"
                    : item.status === "warning"
                    ? "text-yellow-400"
                    : "text-text-200"
                }`}
              >
                {item.lastSeen ?? statusLabel[item.status]}
              </span>
            </div>
          </li>
        ))}

        {maxVisible && items.length > maxVisible && (
          <li className="pt-1 text-xs text-text-200 text-center">
            +{items.length - maxVisible} más
          </li>
        )}
      </ul>
    </WidgetContainer>
  );
}
