import { WidgetContainer } from "../base/WidgetContainer";
import type { ProgressWidgetProps } from "../types";

/**
 * Barras de progreso múltiples.
 *
 * @example
 * <ProgressWidget
 *   title="Capacidad de almacenamiento"
 *   items={[
 *     { label: "Servidor A", value: 70, max: 100, color: "#8ecae0" },
 *     { label: "Servidor B", value: 45, max: 100, color: "#82ca9d" },
 *     { label: "Servidor C", value: 90, max: 100, color: "#ffc658" },
 *   ]}
 *   gridPosition={{ colSpan: 4 }}
 * />
 */
export function ProgressWidget({
  items,
  title,
  subtitle,
  headerActions,
  gridPosition,
  absolutePosition,
  draggable,
  className,
  style,
  onPositionChange,
}: ProgressWidgetProps) {
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
      <ul className="flex flex-col gap-4">
        {items.map((item, i) => {
          const max = item.max ?? 100;
          const pct = Math.min(100, Math.max(0, (item.value / max) * 100));
          const color = item.color ?? "#8ecae0";

          const valueColor =
            pct >= 90
              ? "#f87171"
              : pct >= 70
              ? "#fbbf24"
              : color;

          return (
            <li key={i} className="flex flex-col gap-1.5 bg-bg">
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-200 font-medium">{item.label}</span>
                <span className="font-bold" style={{ color: valueColor }}>
                  {item.value}/{max}
                  <span className="text-text-200 font-normal ml-1">
                    ({pct.toFixed(0)}%)
                  </span>
                </span>
              </div>
              <div className="h-2 rounded-full bg-bg-300 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: color }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </WidgetContainer>
  );
}
