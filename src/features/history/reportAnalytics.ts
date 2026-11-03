import { analysisTrackKey, type TrackSummary } from "./types";
import type { AnalysisPoint, AnalysisZone } from "./analysis";

export interface ReportSettings {
  timeZone: string;
  nightStart: number;
  nightEnd: number;
  criticalZones: string[];
  proximityM: number;
  maxGapSeconds: number;
}
export const DEFAULT_REPORT_SETTINGS: ReportSettings = {
  timeZone: "America/Santiago", nightStart: 21, nightEnd: 7,
  criticalZones: ["modulo"], proximityM: 100, maxGapSeconds: 120,
};
export const normalizeZone = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
export function isBoat(track: TrackSummary) {
  return /^(lancha|barco|embarcacion|bote|boat|vessel)$/.test(normalizeZone(track.behavior_class ?? ""));
}
export function localParts(value: string | Date | number, timeZone = "America/Santiago") {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    formatters.set(timeZone, formatter);
  }
  const parts = Object.fromEntries(formatter.formatToParts(date).map(p => [p.type, p.value]));
  return { day: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour), minute: Number(parts.minute) };
}
const formatters = new Map<string, Intl.DateTimeFormat>();
export function isNight(hour: number, settings: ReportSettings) {
  return settings.nightStart > settings.nightEnd ? hour >= settings.nightStart || hour < settings.nightEnd : hour >= settings.nightStart && hour < settings.nightEnd;
}
export function isValidAnalysisZone(zone: AnalysisZone) {
  return zone.vertices.length >= 3 && zone.vertices.every(([lat, lon]) => Number.isFinite(lat) && Math.abs(lat) <= 90 && Number.isFinite(lon) && Math.abs(lon) <= 180);
}
export function distanceToZoneM(lat: number, lon: number, vertices: [number, number][]): number {
  if (vertices.length < 3) return Infinity;
  const scaleX = 111320 * Math.cos(lat * Math.PI / 180), scaleY = 111320;
  let inside = false, nearest = Infinity;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const [ay, ax] = vertices[j], [by, bx] = vertices[i];
    if (((ay > lat) !== (by > lat)) && lon < (bx - ax) * (lat - ay) / (by - ay) + ax) inside = !inside;
    const x1 = (ax - lon) * scaleX, y1 = (ay - lat) * scaleY;
    const dx = (bx - ax) * scaleX, dy = (by - ay) * scaleY;
    const t = Math.max(0, Math.min(1, -(x1 * dx + y1 * dy) / (dx * dx + dy * dy || 1)));
    nearest = Math.min(nearest, Math.hypot(x1 + t * dx, y1 + t * dy));
  }
  return inside || nearest < 0.001 ? 0 : nearest;
}
export interface Approach {
  key: string; track: TrackSummary; zone: string;
  minDistanceM: number; closestAt: string; closest: AnalysisPoint;
  nearPoints: number; nightPoints: number; insidePoints: number; nightInsidePoints: number;
  observedSeconds: number; nightSeconds: number; episodes: number;
  firstNear: string | null; lastNear: string | null;
  priority: "Alta" | "Media" | "Observación";
  reasons: string[];
}
export interface HourStats {
  hour: number; starts: number; boatStarts: number; present: number; near: number;
  exposureHours: number; startsPerHour: number | null;
}
export interface DayStats { day: string; starts: number; boatStarts: number; nightPresent: number; nearNight: number; hours: number[] }
export interface OperationalAnalysis {
  tracks: TrackSummary[]; points: AnalysisPoint[]; boats: TrackSummary[];
  hourly: HourStats[]; days: DayStats[]; approaches: Approach[];
  zones: { name: string; tracks: number; boats: number; nightTracks: number; insidePoints: number; minDistanceM: number | null }[];
  nightTracks: number; nightBoats: number; nearNightTracks: number; nearTracks: number;
  missingDates: number; missingClassification: number; rejectedPoints: number;
  peakHour: HourStats | null; peakNightHour: HourStats | null;
  settings: ReportSettings;
}

export function computeOperationalAnalysis(input: {
  tracks: TrackSummary[]; points: AnalysisPoint[]; zones: AnalysisZone[];
  from: Date; to: Date; settings?: Partial<ReportSettings>;
}): OperationalAnalysis {
  const settings = { ...DEFAULT_REPORT_SETTINGS, ...input.settings };
  if (!Number.isInteger(settings.nightStart) || settings.nightStart < 0 || settings.nightStart > 23 || !Number.isInteger(settings.nightEnd) || settings.nightEnd < 0 || settings.nightEnd > 23 || settings.nightStart === settings.nightEnd) throw new Error("Franja nocturna inválida");
  if (!Number.isFinite(settings.proximityM) || settings.proximityM <= 0 || !Number.isFinite(settings.maxGapSeconds) || settings.maxGapSeconds <= 0) throw new Error("Umbrales de análisis inválidos");
  const from = input.from.getTime(), to = input.to.getTime();
  if (!Number.isFinite(from) || !Number.isFinite(to) || from > to) throw new Error("Período de informe inválido");
  const tracks = [...new Map(input.tracks.map(t => [analysisTrackKey(t), t])).values()].filter(t => {
    const start = new Date(t.first_seen ?? "").getTime(), end = new Date(t.last_seen ?? t.first_seen ?? "").getTime();
    return (!Number.isFinite(start) || start <= to) && (!Number.isFinite(end) || end >= from);
  });
  const trackMap = new Map(tracks.map(t => [analysisTrackKey(t), t]));
  const hourly: HourStats[] = Array.from({ length: 24 }, (_, hour) => ({ hour, starts: 0, boatStarts: 0, present: 0, near: 0, exposureHours: 0, startsPerHour: null }));
  // Integración de horas UTC: respeta días de 23/25 horas y bordes parciales.
  for (let cursor = from; cursor < to;) {
    const end = Math.min(to, (Math.floor(cursor / 3600000) + 1) * 3600000);
    const h = localParts((cursor + end) / 2, settings.timeZone)!.hour;
    hourly[h].exposureHours += (end - cursor) / 3600000;
    cursor = end;
  }
  const days = new Map<string, DayStats>();
  const dayOf = (day: string) => {
    if (!days.has(day)) days.set(day, { day, starts: 0, boatStarts: 0, nightPresent: 0, nearNight: 0, hours: Array(24).fill(0) });
    return days.get(day)!;
  };
  for (let cursor = from; cursor < to; cursor += 3600000) dayOf(localParts(cursor, settings.timeZone)!.day);
  if (from === to) dayOf(localParts(to, settings.timeZone)!.day);
  let missingDates = 0, rejectedPoints = 0;
  for (const t of tracks) {
    const parts = localParts(t.first_seen ?? "", settings.timeZone);
    const ms = new Date(t.first_seen ?? "").getTime();
    if (!parts) { missingDates++; continue; }
    if (ms < from || ms > to) continue;
    hourly[parts.hour].starts++;
    const day = dayOf(parts.day); day.starts++;
    if (isBoat(t)) { hourly[parts.hour].boatStarts++; day.boatStarts++; }
  }
  const pointMeta = new Map<AnalysisPoint, { time: number; parts: NonNullable<ReturnType<typeof localParts>> }>();
  const points: AnalysisPoint[] = [], grouped = new Map<string, AnalysisPoint[]>(), pointKeys = new Set<string>();
  const hourSets = hourly.map(() => new Set<string>()), nearSets = hourly.map(() => new Set<string>());
  const nightSet = new Set<string>(), nightBoatSet = new Set<string>(), nearNightSet = new Set<string>(), nearSet = new Set<string>();
  const dayHourSets = new Map<string, Set<string>>(), dayNights = new Map<string, Set<string>>(), dayNearNights = new Map<string, Set<string>>();
  for (const p of input.points) {
    const time = new Date(p.fecha ?? "").getTime();
    if (!p.trackKey || !trackMap.has(p.trackKey) || !Number.isFinite(time) || time < from || time > to || !Number.isFinite(p.lat) || !Number.isFinite(p.lon) || Math.abs(p.lat) > 90 || Math.abs(p.lon) > 180 || (p.lat === 0 && p.lon === 0)) { rejectedPoints++; continue; }
    const unique = `${p.trackKey}:${time}:${p.lat}:${p.lon}`;
    if (pointKeys.has(unique)) continue;
    pointKeys.add(unique); points.push(p);
    if (!grouped.has(p.trackKey)) grouped.set(p.trackKey, []);
    grouped.get(p.trackKey)!.push(p);
    const parts = localParts(time, settings.timeZone)!;
    pointMeta.set(p, { time, parts });
    hourSets[parts.hour].add(p.trackKey);
    const dh = `${parts.day}:${parts.hour}`;
    if (!dayHourSets.has(dh)) dayHourSets.set(dh, new Set());
    dayHourSets.get(dh)!.add(p.trackKey); dayOf(parts.day);
    if (isNight(parts.hour, settings)) {
      nightSet.add(p.trackKey);
      if (isBoat(trackMap.get(p.trackKey)!)) nightBoatSet.add(p.trackKey);
      if (!dayNights.has(parts.day)) dayNights.set(parts.day, new Set());
      dayNights.get(parts.day)!.add(p.trackKey);
    }
  }
  for (const series of grouped.values()) series.sort((a, b) => pointMeta.get(a)!.time - pointMeta.get(b)!.time);
  const critical = new Set(settings.criticalZones.map(normalizeZone));
  const approaches: Approach[] = [];
  const zoneStats: OperationalAnalysis["zones"] = [];
  for (const zone of input.zones.filter(isValidAnalysisZone)) {
    const insideTracks = new Set<string>(), insideBoats = new Set<string>(), insideNight = new Set<string>();
    let insideCount = 0, minDistance = Infinity;
    for (const [key, unsorted] of grouped) {
      const sorted = unsorted;
      const track = trackMap.get(key)!;
      let min = Infinity, closest = sorted[0], count = 0, night = 0, inside = 0, nightInside = 0, seconds = 0, nightSeconds = 0, episodes = 0;
      let first: string | null = null, last: string | null = null, prevTime: number | null = null, prevNear = false, prevNight = false;
      for (const p of sorted) {
        const distance = distanceToZoneM(p.lat, p.lon, zone.vertices);
        if (distance < min) { min = distance; closest = p; }
        const { time, parts } = pointMeta.get(p)!;
        const near = distance <= settings.proximityM, nocturnal = isNight(parts.hour, settings);
        if (distance === 0) { inside++; if (nocturnal) nightInside++; insideCount++; insideTracks.add(key); if (isBoat(track)) insideBoats.add(key); if (nocturnal) insideNight.add(key); }
        if (near) {
          count++; if (nocturnal) night++;
          first ??= p.fecha; last = p.fecha;
          const dt = prevTime !== null ? (time - prevTime) / 1000 : Infinity;
          if (!prevNear || dt > settings.maxGapSeconds) episodes++;
          if (prevNear && dt > 0 && dt <= settings.maxGapSeconds) { seconds += dt; if (nocturnal && prevNight) nightSeconds += dt; }
          if (critical.has(normalizeZone(zone.nombre))) {
            nearSet.add(key); nearSets[parts.hour].add(key);
            if (nocturnal) {
              nearNightSet.add(key);
              if (!dayNearNights.has(parts.day)) dayNearNights.set(parts.day, new Set());
              dayNearNights.get(parts.day)!.add(key);
            }
          }
        }
        prevNear = near; prevNight = nocturnal; prevTime = time;
      }
      minDistance = Math.min(minDistance, min);
      if (critical.has(normalizeZone(zone.nombre))) {
        const reasons = [inside > 0 ? "Posiciones dentro del polígono" : "", night > 0 ? "Proximidad nocturna" : "", episodes >= 2 ? `${episodes} episodios observados` : "", seconds >= 300 ? "Presencia observada de al menos 5 min" : ""].filter(Boolean);
        approaches.push({ key, track, zone: zone.nombre, minDistanceM: min, closestAt: closest.fecha!, closest, nearPoints: count, nightPoints: night, insidePoints: inside, nightInsidePoints: nightInside, observedSeconds: seconds, nightSeconds, episodes, firstNear: first, lastNear: last, priority: night > 0 && (nightInside > 0 || episodes >= 2 || seconds >= 300) ? "Alta" : night > 0 || inside > 0 ? "Media" : "Observación", reasons });
      }
    }
    zoneStats.push({ name: zone.nombre, tracks: insideTracks.size, boats: insideBoats.size, nightTracks: insideNight.size, insidePoints: insideCount, minDistanceM: Number.isFinite(minDistance) ? minDistance : null });
  }
  for (const h of hourly) { h.present = hourSets[h.hour].size; h.near = nearSets[h.hour].size; h.startsPerHour = h.exposureHours > 0 ? h.starts / h.exposureHours : null; }
  for (const d of days.values()) { d.hours = Array.from({ length: 24 }, (_, h) => dayHourSets.get(`${d.day}:${h}`)?.size ?? 0); d.nightPresent = dayNights.get(d.day)?.size ?? 0; d.nearNight = dayNearNights.get(d.day)?.size ?? 0; }
  approaches.sort((a, b) => a.minDistanceM - b.minDistanceM || b.nightPoints - a.nightPoints || a.key.localeCompare(b.key));
  const peak = (list: HourStats[], field: "starts" | "near") => [...list].filter(h => h[field] > 0).sort((a, b) => b[field] - a[field] || a.hour - b.hour)[0] ?? null;
  return { tracks, points, boats: tracks.filter(isBoat), hourly, days: [...days.values()].sort((a, b) => a.day.localeCompare(b.day)), approaches, zones: zoneStats.sort((a, b) => b.tracks - a.tracks), nightTracks: nightSet.size, nightBoats: nightBoatSet.size, nearNightTracks: nearNightSet.size, nearTracks: nearSet.size, missingDates, missingClassification: tracks.filter(t => !t.behavior_class || /^(sin_clasificar|desconocido)$/.test(t.behavior_class)).length, rejectedPoints, peakHour: peak(hourly, "starts"), peakNightHour: peak(hourly.filter(h => isNight(h.hour, settings)), "near"), settings };
}
