import type { ChartColors } from "../types";

export const DEFAULT_CHART_COLORS: ChartColors = {
  primary: "#8884d8",
  secondary: "#82ca9d",
  tertiary: "#ffc658",
  quaternary: "#ff7300",
  success: "#00C49F",
  warning: "#FFBB28",
  error: "#FF8042",
};

export const CHART_COLOR_PALETTE = [
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#ff7300",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#0088FE",
  "#00C49F",
  "#FFBB28",
];

export function formatNumber(value: number, decimals = 2): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(decimals)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(decimals)}K`;
  }
  return value.toFixed(decimals);
}

export function formatPercentage(value: number, total: number): string {
  if (total === 0) return "0%";
  return `${((value / total) * 100).toFixed(1)}%`;
}

export function getColorByIndex(index: number, colors = CHART_COLOR_PALETTE): string {
  return colors[index % colors.length];
}

export function generateGradientId(key: string): string {
  return `gradient-${key.replace(/\s+/g, "-").toLowerCase()}`;
}

export function calculatePercentages<T extends Record<string, unknown>>(
  data: T[],
  valueKey: keyof T
): (T & { percentage: number })[] {
  const total = data.reduce((sum, item) => {
    const value = item[valueKey];
    return sum + (typeof value === "number" ? value : 0);
  }, 0);

  return data.map((item) => {
    const value = item[valueKey];
    const numValue = typeof value === "number" ? value : 0;
    return {
      ...item,
      percentage: total > 0 ? (numValue / total) * 100 : 0,
    };
  });
}
