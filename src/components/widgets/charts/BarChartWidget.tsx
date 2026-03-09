import { WidgetContainer } from "../base/WidgetContainer";
import { BarChartWrapper } from "@/libs/recharts/components/BarChartWrapper";
import type { BarChartWidgetProps } from "../types";

/**
 * Widget de gráfica de barras.
 *
 * @example
 * <BarChartWidget
 *   title="Ventas mensuales"
 *   data={data}
 *   xAxisKey="mes"
 *   dataKey={["norte", "sur"]}
 *   stacked
 *   gridPosition={{ colSpan: 6 }}
 * />
 */
export function BarChartWidget({
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
  xAxisKey,
  dataKey,
  chartHeight = 260,
  colors,
  showGrid,
  showLegend,
  showTooltip,
  stacked,
  barSize,
}: BarChartWidgetProps) {
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
      <BarChartWrapper
        data={data}
        xAxisKey={xAxisKey}
        dataKey={dataKey}
        height={chartHeight}
        colors={colors}
        showGrid={showGrid}
        showLegend={showLegend}
        showTooltip={showTooltip}
        stacked={stacked}
        barSize={barSize}
      />
    </WidgetContainer>
  );
}
