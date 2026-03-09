import type { CSSProperties } from "react";
import type { WidgetGridProps } from "../types";

/**
 * Contenedor CSS Grid para posicionar widgets.
 *
 * Cada hijo `WidgetContainer` usa su prop `gridPosition` para indicar
 * col/row de inicio y cuántas columnas/filas ocupa.
 *
 * @example
 * <WidgetGrid columns={12} gap={16}>
 *   <LineChartWidget gridPosition={{ colSpan: 6 }} ... />
 *   <StatCardWidget  gridPosition={{ colSpan: 3 }} ... />
 * </WidgetGrid>
 */
export function WidgetGrid({
  children,
  columns = 12,
  gap = 16,
  className = "",
}: WidgetGridProps) {
  const style: CSSProperties = {
    display: "grid",
    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
    gap: typeof gap === "number" ? `${gap}px` : gap,
    position: "relative",
  };

  return (
    <div style={style} className={className}>
      {children}
    </div>
  );
}
