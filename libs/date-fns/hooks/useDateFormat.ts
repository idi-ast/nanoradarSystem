import { useMemo } from "react";
import {
  format,
  formatDistanceToNow,
  isToday,
  isFuture,
  isPast,
} from "date-fns";
import { es } from "date-fns/locale";
import type { DateInput, UseDateFormatReturn } from "../types";
import { toDate } from "../utils";

interface UseDateFormatOptions {
  formatPattern?: string;
  locale?: typeof es;
}

export function useDateFormat(
  date: DateInput,
  options: UseDateFormatOptions = {}
): UseDateFormatReturn {
  const { formatPattern = "dd/MM/yyyy HH:mm", locale = es } = options;

  return useMemo(() => {
    const dateObj = toDate(date);

    return {
      formatted: format(dateObj, formatPattern, { locale }),
      relative: formatDistanceToNow(dateObj, { addSuffix: true, locale }),
      isToday: isToday(dateObj),
      isFuture: isFuture(dateObj),
      isPast: isPast(dateObj),
    };
  }, [date, formatPattern, locale]);
}
