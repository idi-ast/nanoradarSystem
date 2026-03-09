import { useMemo } from "react";
import type { ChartDataItem } from "../types";

interface UseChartDataOptions<T> {
  data: T[];
  valueKey?: keyof T | (keyof T)[];
  labelKey?: keyof T;
  sortBy?: keyof T;
  sortOrder?: "asc" | "desc";
  limit?: number;
  filter?: (item: T) => boolean;
}

interface ChartDataResult {
  chartData: ChartDataItem[];
  total: number;
  max: number;
  min: number;
  average: number;
}

export function useChartData<T extends Record<string, unknown>>(
  options: UseChartDataOptions<T>
): ChartDataResult {
  const {
    data,
    valueKey,
    labelKey,
    sortBy,
    sortOrder = "asc",
    limit,
    filter,
  } = options;

  return useMemo(() => {
    let processedData = [...data];

    if (filter) {
      processedData = processedData.filter(filter);
    }

    if (sortBy) {
      processedData.sort((a, b) => {
        const aVal = a[sortBy];
        const bVal = b[sortBy];
        if (typeof aVal === "number" && typeof bVal === "number") {
          return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
        }
        return sortOrder === "asc"
          ? String(aVal).localeCompare(String(bVal))
          : String(bVal).localeCompare(String(aVal));
      });
    }

    if (limit && limit > 0) {
      processedData = processedData.slice(0, limit);
    }

    const chartData: ChartDataItem[] = processedData.map((item) => {
      const result: ChartDataItem = {};

      if (labelKey) {
        result.name = String(item[labelKey]);
      }

      if (valueKey) {
        if (Array.isArray(valueKey)) {
          valueKey.forEach((key) => {
            result[String(key)] = item[key] as string | number;
          });
        } else {
          result.value = item[valueKey] as number;
        }
      } else {
        Object.entries(item).forEach(([key, value]) => {
          if (typeof value === "number" || typeof value === "string") {
            result[key] = value;
          }
        });
      }

      return result;
    });

    const numericValues = chartData
      .flatMap((item) =>
        Object.values(item).filter((v): v is number => typeof v === "number")
      );

    const total = numericValues.reduce((sum, val) => sum + val, 0);
    const max = numericValues.length > 0 ? Math.max(...numericValues) : 0;
    const min = numericValues.length > 0 ? Math.min(...numericValues) : 0;
    const average = numericValues.length > 0 ? total / numericValues.length : 0;

    return {
      chartData,
      total,
      max,
      min,
      average,
    };
  }, [data, valueKey, labelKey, sortBy, sortOrder, limit, filter]);
}
