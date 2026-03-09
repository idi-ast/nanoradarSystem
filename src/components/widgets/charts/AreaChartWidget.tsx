import { WidgetContainer } from "../base/WidgetContainer";
import { AreaChartWrapper } from "@/libs/recharts/components/AreaChartWrapper";
import type { AreaChartWidgetProps } from "../types";

/**
 * Widget de gráfica de área.
 *
 * @example
 * <AreaChartWidget
 *   title="Consumo energético"
 *   data={data}
 *   xAxisKey="hora"
 *   dataKey={["zona1", "zona2"]}
 *   gridPosition={{ colSpan: 8 }}
 * />
 */
export function AreaChartWidget({
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
}: AreaChartWidgetProps) {
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
      <AreaChartWrapper
        data={data}
        xAxisKey={xAxisKey}
        dataKey={dataKey}
        height={chartHeight}
        colors={colors}
        showGrid={showGrid}
        showLegend={showLegend}
        showTooltip={showTooltip}
        gradient
      />
    </WidgetContainer>
  );
}
