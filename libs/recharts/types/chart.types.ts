export interface ChartDataItem {
  [key: string]: string | number;
}

export interface BaseChartProps {
  data: ChartDataItem[];
  height?: number;
  width?: number | string;
  className?: string;
  colors?: string[];
  showGrid?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
}

export interface LineChartProps extends BaseChartProps {
  dataKey: string | string[];
  xAxisKey: string;
  strokeWidth?: number;
  dot?: boolean;
  curved?: boolean;
}

export interface BarChartProps extends BaseChartProps {
  dataKey: string | string[];
  xAxisKey: string;
  stacked?: boolean;
  barSize?: number;
}

export interface PieChartProps extends BaseChartProps {
  dataKey: string;
  nameKey: string;
  innerRadius?: number;
  outerRadius?: number;
  showLabel?: boolean;
}

export interface AreaChartProps extends BaseChartProps {
  dataKey: string | string[];
  xAxisKey: string;
  stacked?: boolean;
  gradient?: boolean;
}

export interface ChartDimensions {
  width: number;
  height: number;
  margin: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

export interface ChartColors {
  primary: string;
  secondary: string;
  tertiary: string;
  quaternary: string;
  success: string;
  warning: string;
  error: string;
}
