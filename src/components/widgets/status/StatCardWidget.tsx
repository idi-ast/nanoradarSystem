import { IconTrendingUp, IconTrendingDown, IconMinus } from "@tabler/icons-react";
import { WidgetContainer } from "../base/WidgetContainer";
import type { StatCardWidgetProps, TrendDirection } from "../types";

const trendConfig: Record<
  TrendDirection,
  { icon: typeof IconTrendingUp; color: string }
> = {
  up: { icon: IconTrendingUp, color: "text-green-400" },
  down: { icon: IconTrendingDown, color: "text-red-400" },
  neutral: { icon: IconMinus, color: "text-text-200" },
};

/**
 * Tarjeta de métrica única con tendencia e ícono opcional.
 *
 * @example
 * <StatCardWidget
 *   label="Dispositivos activos"
 *   value={142}
 *   unit="unidades"
 *   trend={{ value: 12, direction: "up", label: "vs semana anterior" }}
 *   icon={<IconDevices size={24} />}
 *   gridPosition={{ colSpan: 3 }}
 * />
 */
export function StatCardWidget({
  label,
  value,
  unit,
  trend,
  icon,
  accentColor,
  title,
  subtitle,
  headerActions,
  gridPosition,
  absolutePosition,
  draggable,
  className,
  style,
  onPositionChange,
}: StatCardWidgetProps) {
  const TrendIcon = trend ? trendConfig[trend.direction].icon : null;
  const trendColor = trend ? trendConfig[trend.direction].color : "";

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
      <div className="flex items-start justify-between gap-3 border border-border-200/40 p-3 rounded-lg">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-text-200 uppercase tracking-wide truncate">
            {label}
          </p>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span
              className="text-3xl font-bold text-text-100"
              style={accentColor ? { color: accentColor } : undefined}
            >
              {value}
            </span>
            {unit && (
              <span className="text-sm text-text-200 font-medium">{unit}</span>
            )}
          </div>

          {trend && (
            <div className={`mt-2 flex items-center gap-1 text-xs ${trendColor}`}>
              {TrendIcon && <TrendIcon size={14} />}
              <span className="font-semibold">
                {trend.direction === "up" ? "+" : trend.direction === "down" ? "-" : ""}
                {Math.abs(trend.value)}%
              </span>
              {trend.label && (
                <span className="text-text-200">{trend.label}</span>
              )}
            </div>
          )}
        </div>

        {icon && (
          <div
            className="shrink-0 p-2.5 rounded-lg bg-bg-300"
            style={accentColor ? { color: accentColor } : { color: "#8ecae0" }}
          >
            {icon}
          </div>
        )}
      </div>
    </WidgetContainer>
  );
}
