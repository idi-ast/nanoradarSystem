import { IconTrendingUp, IconTrendingDown, IconMinus } from "@tabler/icons-react";
import { WidgetContainer } from "../base/WidgetContainer";
import type { KPIWidgetProps, TrendDirection } from "../types";

const trendIcon: Record<TrendDirection, typeof IconTrendingUp> = {
  up: IconTrendingUp,
  down: IconTrendingDown,
  neutral: IconMinus,
};
const trendColor: Record<TrendDirection, string> = {
  up: "text-green-400",
  down: "text-red-400",
  neutral: "text-text-200",
};

const colsClass: Record<1 | 2 | 3 | 4, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
};

/**
 * Cuadrícula compacta de múltiples KPIs.
 *
 * @example
 * <KPIWidget
 *   title="Resumen operacional"
 *   items={[
 *     { label: "Uptime", value: "99.8", unit: "%", trend: "up" },
 *     { label: "Errores", value: 3, trend: "down" },
 *     { label: "Alertas", value: 7, color: "#ffc658" },
 *     { label: "Usuarios", value: 214 },
 *   ]}
 *   columns={4}
 *   gridPosition={{ colSpan: 12 }}
 * />
 */
export function KPIWidget({
  items,
  columns = 4,
  title,
  subtitle,
  headerActions,
  gridPosition,
  absolutePosition,
  draggable,
  className,
  style,
  onPositionChange,
}: KPIWidgetProps) {
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
      <div className={`grid ${colsClass[columns]} gap-4`}>
        {items.map((item, i) => {
          const Icon = item.trend ? trendIcon[item.trend] : null;
          const tc = item.trend ? trendColor[item.trend] : "";

          return (
            <div
              key={i}
              className="flex flex-col gap-1 p-3 rounded-lg bg-bg-300 border border-border/50"
            >
              <p className="text-xs text-text-200 font-medium truncate">
                {item.label}
              </p>
              <div className="flex items-baseline gap-1">
                <span
                  className="text-xl font-bold text-text-100"
                  style={item.color ? { color: item.color } : undefined}
                >
                  {item.value}
                </span>
                {item.unit && (
                  <span className="text-xs text-text-200">{item.unit}</span>
                )}
              </div>
              {item.target !== undefined && (
                <div className="mt-1">
                  <div className="h-1 rounded-full bg-bg-400 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, ((Number(item.value) / item.target) * 100))}%`,
                        backgroundColor: item.color ?? "#8ecae0",
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-text-200 mt-0.5">
                    Meta: {item.target}
                  </p>
                </div>
              )}
              {Icon && (
                <div className={`flex items-center gap-1 text-xs ${tc}`}>
                  <Icon size={12} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </WidgetContainer>
  );
}
