import type { AnalysisPoint } from "@/features/history/analysis";
import { isNight, localParts, type ReportSettings } from "@/features/history/reportAnalytics";

export const ANALYSIS_TIME_ZONE = "America/Santiago";
export function dateTimeInput(date: Date) {
  const parts = localParts(date, ANALYSIS_TIME_ZONE);
  if (!parts) return '';
  return `${parts.day}T${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`;
}

/** Resuelve la hora civil de Chile, incluso si el navegador está en otra zona. */
export function parseChileDateTime(value: string, edge: 'start' | 'end' = 'start'): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error('Completa las fechas de inicio y fin.');
  const naive = new Date(`${value}:00Z`).getTime();
  if (!Number.isFinite(naive) || new Date(naive).toISOString().slice(0, 16) !== value) throw new Error('La fecha seleccionada no es válida.');
  const matches = new Set<number>();
  for (const delta of [-12, 0, 12]) {
    const probe = naive + delta * 3600000;
    const p = localParts(probe, ANALYSIS_TIME_ZONE)!;
    const localAsUtc = Date.parse(`${p.day}T${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}:00Z`);
    const candidate = naive - (localAsUtc - probe);
    if (dateTimeInput(new Date(candidate)) === value) matches.add(candidate);
  }
  if (!matches.size) throw new Error('Esa hora no existe por el cambio de horario de Chile. Elige otra hora.');
  // En una hora repetida, incluir las dos ocurrencias cuando se usa como borde.
  return new Date(edge === 'start' ? Math.min(...matches) : Math.max(...matches)).toISOString();
}

export interface AnalysisFilters {
  from: string;
  to: string;
  radar: string;
  minPoints: number;
  proximityM: number;
}
export function defaultAnalysisFilters(hours = 24): AnalysisFilters {
  const now = new Date();
  return { from: dateTimeInput(new Date(now.getTime() - hours * 3600000)), to: dateTimeInput(now), radar: '', minPoints: 100, proximityM: 100 };
}
export function validateAnalysisFilters(filters: AnalysisFilters) {
  const from = parseChileDateTime(filters.from), to = parseChileDateTime(filters.to, 'end');
  if (Date.parse(from) >= Date.parse(to)) throw new Error('La fecha de inicio debe ser anterior al fin.');
  if (!Number.isInteger(filters.minPoints) || filters.minPoints < 1 || filters.minPoints > 10000) throw new Error('El mínimo de puntos debe ser un entero entre 1 y 10.000.');
  if (!Number.isFinite(filters.proximityM) || filters.proximityM < 1 || filters.proximityM > 5000) throw new Error('La proximidad debe estar entre 1 y 5.000 metros.');
  return { from, to };
}

export interface HeatCell { latitude: number; longitude: number; positions: number; tracks: number }
/** Cuadrícula adaptable: conserva todos los puntos y limita el trabajo de la GPU. */
export function aggregateHeatCells(points: AnalysisPoint[], settings: ReportSettings, nightOnly = false, maxCells = 8000): { cells: HeatCell[]; cellMeters: number; positionCount: number } {
  const valid = points.filter(p => Number.isFinite(p.lat) && Math.abs(p.lat) <= 90 && Number.isFinite(p.lon) && Math.abs(p.lon) <= 180 && (p.lat !== 0 || p.lon !== 0));
  const selected = nightOnly ? valid.filter(p => {
    const parts = localParts(p.fecha ?? '', settings.timeZone);
    return parts && isNight(parts.hour, settings);
  }) : valid;
  if (!selected.length) return { cells: [], cellMeters: 50, positionCount: 0 };
  const meanLat = selected.reduce((sum, p) => sum + p.lat, 0) / selected.length;
  const sx = 111320 * Math.max(.01, Math.cos(meanLat * Math.PI / 180)), sy = 111320;
  const limit = Number.isFinite(maxCells) ? Math.max(1, Math.floor(maxCells)) : 8000;
  let cellMeters = 50;
  for (;;) {
    const grouped = new Map<string, { x: number; y: number; count: number; ids: Set<string> }>();
    for (const p of selected) {
      const x = Math.floor(p.lon * sx / cellMeters), y = Math.floor(p.lat * sy / cellMeters), key = `${x}:${y}`;
      let cell = grouped.get(key);
      if (!cell) { cell = { x, y, count: 0, ids: new Set() }; grouped.set(key, cell); }
      cell.count++;
      if (p.trackKey) cell.ids.add(p.trackKey);
    }
    if (grouped.size <= limit) return {
      cellMeters, positionCount: selected.length,
      cells: [...grouped.values()].map(c => ({ latitude: (c.y + .5) * cellMeters / sy, longitude: (c.x + .5) * cellMeters / sx, positions: c.count, tracks: c.ids.size })),
    };
    if (cellMeters > 40000000) return {
      cellMeters, positionCount: selected.length,
      cells: [{ latitude: meanLat, longitude: selected.reduce((sum, p) => sum + p.lon, 0) / selected.length, positions: selected.length, tracks: new Set(selected.map(p => p.trackKey).filter(Boolean)).size }],
    };
    cellMeters *= 2;
  }
}
