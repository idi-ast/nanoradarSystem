import {
  format,
  formatDistanceToNow,
  parse,
  isWithinInterval,
  addDays,
  addMonths,
  addYears,
  addHours,
  addMinutes,
  subDays,
  subMonths,
  subYears,
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isToday,
  isTomorrow,
  isYesterday,
  isSameDay,
  isValid,
} from "date-fns";
import { es } from "date-fns/locale";
import type { DateInput, DateRangeResult } from "../types";

const DEFAULT_FORMAT = "dd/MM/yyyy";
const DEFAULT_DATETIME_FORMAT = "dd/MM/yyyy HH:mm";

export function toDate(input: DateInput): Date {
  if (input instanceof Date) return input;
  if (typeof input === "number") return new Date(input);
  return new Date(input);
}

export function formatDate(
  date: DateInput,
  formatPattern: string = DEFAULT_FORMAT
): string {
  return format(toDate(date), formatPattern, { locale: es });
}

export function formatDateTime(date: DateInput): string {
  return format(toDate(date), DEFAULT_DATETIME_FORMAT, { locale: es });
}

export function formatRelative(date: DateInput): string {
  return formatDistanceToNow(toDate(date), { addSuffix: true, locale: es });
}

export function parseDate(
  dateString: string,
  formatPattern: string = DEFAULT_FORMAT
): Date {
  return parse(dateString, formatPattern, new Date(), { locale: es });
}

export function isDateInRange(
  date: DateInput,
  start: DateInput,
  end: DateInput
): boolean {
  return isWithinInterval(toDate(date), {
    start: toDate(start),
    end: toDate(end),
  });
}

export function addTime(
  date: DateInput,
  amount: number,
  unit: "days" | "months" | "years" | "hours" | "minutes"
): Date {
  const dateObj = toDate(date);

  switch (unit) {
    case "days":
      return addDays(dateObj, amount);
    case "months":
      return addMonths(dateObj, amount);
    case "years":
      return addYears(dateObj, amount);
    case "hours":
      return addHours(dateObj, amount);
    case "minutes":
      return addMinutes(dateObj, amount);
    default:
      return dateObj;
  }
}

export function subtractTime(
  date: DateInput,
  amount: number,
  unit: "days" | "months" | "years"
): Date {
  const dateObj = toDate(date);

  switch (unit) {
    case "days":
      return subDays(dateObj, amount);
    case "months":
      return subMonths(dateObj, amount);
    case "years":
      return subYears(dateObj, amount);
    default:
      return dateObj;
  }
}

export function diffIn(
  dateLeft: DateInput,
  dateRight: DateInput,
  unit: "days" | "hours" | "minutes"
): number {
  const left = toDate(dateLeft);
  const right = toDate(dateRight);

  switch (unit) {
    case "days":
      return differenceInDays(left, right);
    case "hours":
      return differenceInHours(left, right);
    case "minutes":
      return differenceInMinutes(left, right);
    default:
      return 0;
  }
}

export function getDateRange(
  start: DateInput,
  end: DateInput
): DateRangeResult {
  const startDate = toDate(start);
  const endDate = toDate(end);

  return {
    start: startDate,
    end: endDate,
    days: differenceInDays(endDate, startDate),
  };
}

export function getDayBounds(date: DateInput): { start: Date; end: Date } {
  const dateObj = toDate(date);
  return {
    start: startOfDay(dateObj),
    end: endOfDay(dateObj),
  };
}

export function getMonthBounds(date: DateInput): { start: Date; end: Date } {
  const dateObj = toDate(date);
  return {
    start: startOfMonth(dateObj),
    end: endOfMonth(dateObj),
  };
}

export function getWeekBounds(date: DateInput): { start: Date; end: Date } {
  const dateObj = toDate(date);
  return {
    start: startOfWeek(dateObj, { locale: es }),
    end: endOfWeek(dateObj, { locale: es }),
  };
}

export {
  isToday,
  isTomorrow,
  isYesterday,
  isSameDay,
  isValid as isValidDate,
};
