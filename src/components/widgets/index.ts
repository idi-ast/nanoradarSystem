// ─── Base ─────────────────────────────────────────────────────────────────────
export { WidgetContainer, WidgetHeaderButton, WidgetCloseButton } from "./base/WidgetContainer";
export { WidgetGrid } from "./base/WidgetGrid";

// ─── Gráficas ─────────────────────────────────────────────────────────────────
export { LineChartWidget } from "./charts/LineChartWidget";
export { BarChartWidget } from "./charts/BarChartWidget";
export { PieChartWidget } from "./charts/PieChartWidget";
export { AreaChartWidget } from "./charts/AreaChartWidget";

// ─── Tabla ────────────────────────────────────────────────────────────────────
export { DataTableWidget } from "./table/DataTableWidget";

// ─── Estado / KPI ─────────────────────────────────────────────────────────────
export { StatCardWidget } from "./status/StatCardWidget";
export { KPIWidget } from "./status/KPIWidget";
export { StatusListWidget } from "./status/StatusListWidget";
export { ProgressWidget } from "./status/ProgressWidget";

// ─── Tipos ────────────────────────────────────────────────────────────────────
export type {
  // posicionamiento
  WidgetGridPosition,
  WidgetAbsolutePosition,
  WidgetContainerProps,
  WidgetGridProps,
  // datos
  ChartDataItem,
  TableColumn,
  KPIItem,
  StatusItem,
  ProgressItem,
  TrendDirection,
  // props de widgets
  BaseChartWidgetProps,
  LineChartWidgetProps,
  BarChartWidgetProps,
  PieChartWidgetProps,
  AreaChartWidgetProps,
  DataTableWidgetProps,
  StatCardWidgetProps,
  KPIWidgetProps,
  StatusListWidgetProps,
  ProgressWidgetProps,
} from "./types/widget.types";
