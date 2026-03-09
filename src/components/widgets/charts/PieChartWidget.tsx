import { WidgetContainer } from "../base/WidgetContainer";
import { PieChartWrapper } from "@/libs/recharts/components/PieChartWrapper";
import type { PieChartWidgetProps } from "../types";

/**
 * Widget de gráfica de pastel / donut.
 *
 * @example
 * <PieChartWidget
 *   title="Distribución"
 *   data={[{ name: "A", value: 40 }, { name: "B", value: 60 }]}
 *   dataKey="value"
 *   nameKey="name"
 *   innerRadius={60}   // 0 = pie normal, >0 = donut
 *   gridPosition={{ colSpan: 4 }}
 * />
 */
export function PieChartWidget({
  title,
  subtitle,
  headerActions,
  gridPosition,
  absolutePosition,
  draggable,
  className,
  style,
  onPositionChange,
  data,
  dataKey,
  nameKey,
  chartHeight = 260,
  colors,
  showLegend,
  showTooltip,
  innerRadius,
  outerRadius,
  showLabel,
}: PieChartWidgetProps) {
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
      <PieChartWrapper
        data={data}
        dataKey={dataKey}
        nameKey={nameKey}
        height={chartHeight}
        colors={colors}
        showLegend={showLegend}
        showTooltip={showTooltip}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        showLabel={showLabel}
      />
    </WidgetContainer>
  );
}
