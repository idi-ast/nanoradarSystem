import type { TrackSummaryFilters } from './types';

/** An exact ID lookup always covers all dates, radars and categories. */
export function resolveHistoryFilters(filters: TrackSummaryFilters): TrackSummaryFilters {
  const id = filters.search?.trim();
  return id ? { minPoints: 1, trackIds: [id] } : filters;
}

export interface ReportPeriod { fromDate: string; toDate: string }
const chileDay = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit',
});
function dateKey(date: Date): string {
  const parts = Object.fromEntries(chileDay.formatToParts(date).map(p => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
export function defaultReportPeriod(now = new Date()): ReportPeriod {
  const today = dateKey(now);
  const yesterday = new Date(`${today}T12:00:00Z`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const day = yesterday.toISOString().slice(0, 10);
  return { fromDate: day, toDate: day };
}
/** First instant of a Chilean calendar day, including DST midnight changes. */
function dayStart(day: string): number {
  const nominal = Date.parse(`${day}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(nominal) || new Date(nominal).toISOString().slice(0, 10) !== day) {
    throw new Error('Selecciona fechas válidas para el informe');
  }
  let lo = nominal - 86400000, hi = nominal + 86400000;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (dateKey(new Date(mid)) < day) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}
export function buildReportFilters(period: ReportPeriod, minTrackedMinutes: number, category: string): TrackSummaryFilters {
  const from = dayStart(period.fromDate);
  const lastDay = dayStart(period.toDate);
  if (from > lastDay) throw new Error('La fecha inicial del informe debe ser anterior o igual a la final');
  const nextDay = new Date(`${period.toDate}T12:00:00Z`);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  return {
    from: new Date(from).toISOString(),
    to: new Date(dayStart(nextDay.toISOString().slice(0, 10)) - 1).toISOString(),
    minPoints: 1, minTrackedMinutes, behaviorClass: category || undefined,
  };
}
