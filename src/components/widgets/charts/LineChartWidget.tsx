import { WidgetContainer } from "../base/WidgetContainer";
import { LineChartWrapper } from "@/libs/recharts/components/LineChartWrapper";
import type { LineChartWidgetProps } from "../types";

/**
 * Widget de gráfica de líneas.
 *
 * @example
 * <LineChartWidget
 *   title="Temperatura"
 *   subtitle="Últimas 24h"
 *   data={data}
 *   xAxisKey="hora"
 *   dataKey={["sensor1", "sensor2"]}
 *   gridPosition={{ colSpan: 6 }}
 * />
 */
export function LineChartWidget({
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
  curved,
  dot,
  strokeWidth,
}: LineChartWidgetProps) {
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
      <LineChartWrapper
        data={data}
        xAxisKey={xAxisKey}
        dataKey={dataKey}
        height={chartHeight}
        colors={colors}
        showGrid={showGrid}
        showLegend={showLegend}
        showTooltip={showTooltip}
        curved={curved}
        dot={dot}
        strokeWidth={strokeWidth}
      />
    </WidgetContainer>
  );
}
