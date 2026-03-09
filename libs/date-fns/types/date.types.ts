export type DateInput = Date | string | number;

export interface DateFormatOptions {
  format?: string;
  locale?: Locale;
}

export interface DateRangeResult {
  start: Date;
  end: Date;
  days: number;
}

export interface UseDateFormatReturn {
  formatted: string;
  relative: string;
  isToday: boolean;
  isFuture: boolean;
  isPast: boolean;
}

export type DateUnit = "days" | "weeks" | "months" | "years" | "hours" | "minutes" | "seconds";

// Re-export locale type from date-fns
import type { Locale } from "date-fns";
export type { Locale };
