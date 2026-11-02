import type { TDocumentDefinitions, Content } from "pdfmake/interfaces";
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import type { TrackSummary, TrackSummaryFilters } from "./types";
import type { AnalysisPoint, AnalysisZone } from "./analysis";
import { isPointInPolygon } from "@/features/devices/components/map/utils/geoHelpers";
import { MS_TO_KMH } from "@/utils/units";

/**
 * Informe PDF analítico de las actividades registradas en el Historial de Tracks.
 *
 * - Si `filters.from` / `filters.to` están definidos, el informe cubre ese rango.
 * - Si no hay filtro, se usa por defecto un rango de las últimas `defaultHours`
 *   horas (12 h).
 * - Se respetan los filtros de la barra superior (radar, zona, búsqueda,
 *   mín. puntos, solo zonas, solo favoritos) para acotar los tracks.
 * - Si se reciben `points`, se dibuja un mapa de calor geográfico y las series
 *   temporales se calculan sobre posiciones reales; si no, se usan los inicios
 *   de track como aproximación.
 */

const FALLBACK_VFS: Record<string, string> = {
  "Roboto-Regular.ttf": "",
  "Roboto-Medium.ttf": "",
  "Roboto-Italic.ttf": "",
  "Roboto-MediumItalic.ttf": "",
};

let vfsReady = false;
function ensureVfs() {
  if (vfsReady) return;
  const fonts = pdfFonts as unknown as {
    pdfMake?: { vfs?: Record<string, string> };
    default?: { pdfMake?: { vfs?: Record<string, string> } };
  };
  const vfs = fonts.pdfMake?.vfs ?? fonts.default?.pdfMake?.vfs ?? FALLBACK_VFS;
  (pdfMake as unknown as { vfs: Record<string, string> }).vfs = vfs;
  vfsReady = true;
}

type CanvasPrimitive =
  | {
    type: "line";
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    lineWidth: number;
    lineColor: string;
  }
  | { type: "rect"; x: number; y: number; w: number; h: number; color: string }
  | {
    type: "text";
    text: string;
    x: number;
    y: number;
    fontSize: number;
    color: string;
    bold?: boolean;
  };

const BRAND = "#0f172a";
const ACCENT = "#65a30d";
const MUTED = "#64748b";
const CRITICAL = "#dc2626";
const GRID = "#e2e8f0";

export interface ReportRange {
  from: Date;
  to: Date;
  /** true si el rango proviene de los filtros (fecha de arriba). */
  filtered: boolean;
}

export interface TrackReportOptions {
  tracks: TrackSummary[];
  total: number;
  filters: TrackSummaryFilters;
  onlyWithZones?: boolean;
  onlyFavorites?: boolean;
  /** Horas por defecto cuando no hay filtro de fechas. */
  defaultHours?: number;
  /** true si el listado es parcial respecto del total del período. */
  limited?: boolean;
  /** Posiciones geográficas muestreadas para heatmap y series. */
  points?: AnalysisPoint[];
  /** Zonas configuradas, para delimitar el heatmap y analizar tráfico por zona. */
  zones?: AnalysisZone[];
  /** Cantidad de tracks de los que se obtuvieron posiciones. */
  tracksAnalyzed?: number;
  /** true si la muestra de posiciones fue recortada. */
  pointsLimited?: boolean;
}

/** Calcula el rango efectivo del informe: filtro de fechas o últimas N horas. */
export function resolveReportRange(
  filters: TrackSummaryFilters,
  defaultHours = 12,
): ReportRange {
  const now = new Date();
  if (filters.from || filters.to) {
    const from = filters.from ? new Date(filters.from) : new Date(0);
    const to = filters.to ? new Date(filters.to) : now;
    return { from, to, filtered: true };
  }
  const from = new Date(now.getTime() - defaultHours * 60 * 60 * 1000);
  return { from, to: now, filtered: false };
}

// ---------------------------------------------------------------------------
// Formateadores
// ---------------------------------------------------------------------------
function fmtDateTime(d?: Date | string | null): string {
  if (!d) return "--";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function fmtDay(d: Date): string {
  return d.toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit" });
}

function fmtDuration(sec?: number | null): string {
  if (sec == null || !Number.isFinite(sec) || sec < 0) return "--";
  const total = Math.round(sec);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function fmtDistance(m?: number | null): string {
  if (m == null || !Number.isFinite(m)) return "--";
  if (m >= 1000) return `${(m / 1000).toFixed(2)} km`;
  return `${Math.round(m)} m`;
}

function fmtSpeed(ms?: number | null): string {
  if (ms == null || !Number.isFinite(ms)) return "--";
  return `${(ms * MS_TO_KMH).toFixed(1)} km/h`;
}

function humanHours(hours: number): string {
  if (hours === 1) return "1 hora";
  return `${hours} horas`;
}

function padHour(hour: number): string {
  return String(hour).padStart(2, "0");
}

// ---------------------------------------------------------------------------
// Cálculos sobre resúmenes de tracks
// ---------------------------------------------------------------------------
interface ReportStats {
  trackCount: number;
  totalPoints: number;
  totalDistance: number;
  totalDuration: number;
  avgSpeed: number | null;
  maxSpeed: number | null;
  withZones: number;
  classified: number;
  byRadar: CountItem[];
  byCategory: CountItem[];
}

interface CountItem {
  label: string;
  count: number;
}

function computeStats(tracks: TrackSummary[]): ReportStats {
  let totalPoints = 0;
  let totalDistance = 0;
  let totalDuration = 0;
  let speedSum = 0;
  let speedCount = 0;
  let maxSpeed: number | null = null;
  let withZones = 0;
  let classified = 0;
  const radarMap = new Map<string, number>();
  const catMap = new Map<string, number>();

  for (const t of tracks) {
    totalPoints += t.point_count ?? 0;
    totalDistance += t.distance_m ?? 0;
    totalDuration += t.duration_seconds ?? 0;
    if (t.avg_speed != null && Number.isFinite(t.avg_speed)) {
      speedSum += t.avg_speed;
      speedCount += 1;
    }
    if (t.max_speed != null && Number.isFinite(t.max_speed)) {
      maxSpeed = maxSpeed == null ? t.max_speed : Math.max(maxSpeed, t.max_speed);
    }
    if (t.zones?.length) withZones += 1;
    if (t.behavior_class && t.behavior_class !== "sin_clasificar") classified += 1;

    const radar = t.tipo_radar || "sin radar";
    radarMap.set(radar, (radarMap.get(radar) ?? 0) + 1);

    const cat = t.behavior_class ? t.behavior_class.replace(/_/g, " ") : "sin clasificar";
    catMap.set(cat, (catMap.get(cat) ?? 0) + 1);
  }

  const toSorted = (map: Map<string, number>): CountItem[] =>
    Array.from(map.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);

  return {
    trackCount: tracks.length,
    totalPoints,
    totalDistance,
    totalDuration,
    avgSpeed: speedCount > 0 ? speedSum / speedCount : null,
    maxSpeed,
    withZones,
    classified,
    byRadar: toSorted(radarMap),
    byCategory: toSorted(catMap),
  };
}

// ---------------------------------------------------------------------------
// Series temporales
// ---------------------------------------------------------------------------
interface SeriesPoint {
  label: string;
  count: number;
}

function trackHour(track: TrackSummary): number | null {
  if (!track.first_seen) return null;
  const hour = new Date(track.first_seen).getHours();
  return Number.isFinite(hour) ? hour : null;
}

function buildHourOfDaySeries(
  points: AnalysisPoint[],
  tracks: TrackSummary[],
): SeriesPoint[] {
  const counts = Array.from({ length: 24 }, () => 0);
  if (points.length > 0) {
    for (const p of points) {
      if (!p.fecha) continue;
      const hour = new Date(p.fecha).getHours();
      if (Number.isFinite(hour)) counts[hour] += 1;
    }
  } else {
    for (const t of tracks) {
      const hour = trackHour(t);
      if (hour != null) counts[hour] += 1;
    }
  }
  return counts.map((count, hour) => ({
    label: `${padHour(hour)}:00`,
    count,
  }));
}

function buildDailySeries(
  points: AnalysisPoint[],
  tracks: TrackSummary[],
  range: ReportRange,
): SeriesPoint[] {
  const start = new Date(range.from);
  start.setHours(0, 0, 0, 0);
  const end = new Date(range.to);
  end.setHours(0, 0, 0, 0);
  const dayMs = 86_400_000;
  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / dayMs) + 1);
  const capped = Math.min(days, 45);
  const buckets: SeriesPoint[] = Array.from({ length: capped }, (_, i) => ({
    label: fmtDay(new Date(start.getTime() + i * dayMs)),
    count: 0,
  }));
  const dayIndex = (value: Date): number =>
    Math.floor((value.getTime() - start.getTime()) / dayMs);

  if (points.length > 0) {
    for (const p of points) {
      if (!p.fecha) continue;
      const idx = dayIndex(new Date(p.fecha));
      if (idx >= 0 && idx < buckets.length) buckets[idx].count += 1;
    }
  } else {
    for (const t of tracks) {
      if (!t.first_seen) continue;
      const idx = dayIndex(new Date(t.first_seen));
      if (idx >= 0 && idx < buckets.length) buckets[idx].count += 1;
    }
  }
  return buckets;
}

const NIGHT_SEQUENCE = [21, 22, 23, 0, 1, 2, 3, 4, 5, 6];

interface HourBucket {
  hour: number;
  count: number;
  label?: string;
  tickLabel?: string;
  color?: string;
}

function nightBucketsFrom(series: SeriesPoint[]): HourBucket[] {
  return NIGHT_SEQUENCE.map((hour, idx) => ({
    hour: idx,
    count: series[hour]?.count ?? 0,
    label: `${padHour(hour)}:00`,
    tickLabel: `${padHour(hour)}h`,
  }));
}

function peakOf(series: SeriesPoint[]): SeriesPoint | null {
  let best: SeriesPoint | null = null;
  for (const item of series) {
    if (best == null || item.count > best.count) best = item;
  }
  return best;
}

// ---------------------------------------------------------------------------
// Tráfico por zona
// ---------------------------------------------------------------------------
interface ZoneTrafficRow {
  name: string;
  positions: number;
  share: number;
  peakHour: number | null;
  tracks: number;
}

interface ZoneTrafficResult {
  rows: ZoneTrafficRow[];
  outside: number;
  total: number;
  basedOnPoints: boolean;
}

function resolveZoneName(
  point: AnalysisPoint,
  zones: AnalysisZone[],
  known: Set<string>,
): string | null {
  if (point.zona && known.has(point.zona)) return point.zona;
  for (const zone of zones) {
    if (zone.vertices.length >= 3 && isPointInPolygon(point.lat, point.lon, zone.vertices)) {
      return zone.nombre;
    }
  }
  return null;
}

function computeZoneTraffic(
  points: AnalysisPoint[],
  zones: AnalysisZone[],
  tracks: TrackSummary[],
): ZoneTrafficResult {
  const known = new Set(zones.map((z) => z.nombre));
  const entries = new Map<string, { positions: number; hours: Map<number, number> }>();
  for (const zone of zones) {
    entries.set(zone.nombre, { positions: 0, hours: new Map() });
  }

  const basedOnPoints = points.length > 0;
  let outside = 0;

  if (basedOnPoints) {
    for (const point of points) {
      const name = resolveZoneName(point, zones, known);
      const entry = name ? entries.get(name) : undefined;
      if (!name || !entry) {
        outside += 1;
        continue;
      }
      entry.positions += 1;
      if (point.fecha) {
        const hour = new Date(point.fecha).getHours();
        if (Number.isFinite(hour)) {
          entry.hours.set(hour, (entry.hours.get(hour) ?? 0) + 1);
        }
      }
    }
  } else {
    for (const track of tracks) {
      for (const name of track.zones ?? []) {
        const entry = entries.get(name);
        if (!entry) continue;
        entry.positions += 1;
        const hour = trackHour(track);
        if (hour != null) {
          entry.hours.set(hour, (entry.hours.get(hour) ?? 0) + 1);
        }
      }
    }
  }

  const trackCounts = new Map<string, number>();
  for (const track of tracks) {
    for (const name of track.zones ?? []) {
      trackCounts.set(name, (trackCounts.get(name) ?? 0) + 1);
    }
  }

  const total = basedOnPoints
    ? points.length
    : Array.from(entries.values()).reduce((sum, e) => sum + e.positions, 0);

  const rows: ZoneTrafficRow[] = Array.from(entries.entries())
    .map(([name, entry]) => {
      let peakHour: number | null = null;
      let best = 0;
      for (const [hour, count] of entry.hours) {
        if (count > best) {
          best = count;
          peakHour = hour;
        }
      }
      return {
        name,
        positions: entry.positions,
        share: total > 0 ? (entry.positions / total) * 100 : 0,
        peakHour,
        tracks: trackCounts.get(name) ?? 0,
      };
    })
    .filter((row) => row.positions > 0)
    .sort((a, b) => b.positions - a.positions);

  return { rows, outside, total, basedOnPoints };
}

// ---------------------------------------------------------------------------
// Construcción del documento
// ---------------------------------------------------------------------------
function statRow(items: { label: string; value: string }[]): Content {
  return {
    table: {
      widths: items.map(() => "*"),
      body: [
        items.map((it) => ({
          stack: [
            { text: it.label.toUpperCase(), fontSize: 7, color: MUTED, characterSpacing: 0.5 } as Content,
            { text: it.value, fontSize: 12, bold: true, color: BRAND, margin: [0, 2, 0, 0] } as Content,
          ],
          fillColor: "#f8fafc",
        })),
      ],
    },
    fillColor: undefined,
    layout: {
      hLineWidth: () => 0,
      vLineWidth: () => 0,
      paddingLeft: () => 0,
      paddingRight: () => 0,
    },
    margin: [0, 6, 0, 6],
  };
}

function sectionTitle(text: string): Content {
  return {
    text,
    fontSize: 10,
    bold: true,
    color: BRAND,
    margin: [0, 12, 0, 4],
  };
}

function buildFilterLine(
  filters: TrackSummaryFilters,
  onlyWithZones: boolean,
  onlyFavorites: boolean,
): string {
  const parts: string[] = [];
  parts.push(`Radar: ${filters.tipoRadar || "todos"}`);
  parts.push(`Zona: ${filters.zone || "todas"}`);
  parts.push(`Mín. puntos: ${filters.minPoints ?? 1}`);
  if (filters.search) parts.push(`Búsqueda: "${filters.search}"`);
  if (onlyWithZones) parts.push("Solo tracks que entraron a zonas");
  if (onlyFavorites) parts.push("Solo favoritos");
  return parts.join("  ·  ");
}

function shortLabel(label: string): string {
  return label.length > 10 ? `${label.slice(0, 9)}...` : label;
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

// ---------------------------------------------------------------------------
// Gráficos vectoriales (sin imágenes externas)
// ---------------------------------------------------------------------------
const CHART_WIDTH = 523;
const AXIS_W = 20;
const AXIS_TOP = 16;
const CHART_HEIGHT = 92;

interface ChartOptions {
  title: string;
  subtitle?: string;
  xLabel: string;
  yLabel: string;
  color?: string;
}

function barChart(buckets: HourBucket[], options: ChartOptions): Content {
  const { title, subtitle, xLabel, yLabel, color } = options;
  const max = Math.max(1, ...buckets.map((b) => b.count));
  const plotW = CHART_WIDTH - AXIS_W;
  const plotH = CHART_HEIGHT;
  const baseY = AXIS_TOP + plotH;
  const slot = plotW / Math.max(1, buckets.length);
  const barW = Math.max(3, slot * 0.62);
  const ticks = max <= 4 ? max : 4;
  const canvas: CanvasPrimitive[] = [];

  canvas.push({ type: "text", text: yLabel, x: 0, y: 0, fontSize: 5.5, color: MUTED });

  for (let i = 0; i <= ticks; i += 1) {
    const value = Math.round((max / ticks) * i);
    const y = baseY - (plotH / ticks) * i;
    canvas.push({
      type: "line",
      x1: AXIS_W,
      y1: y,
      x2: CHART_WIDTH,
      y2: y,
      lineWidth: 0.4,
      lineColor: i === 0 ? "#94a3b8" : GRID,
    });
    canvas.push({ type: "text", text: String(value), x: 0, y: y - 3, fontSize: 6, color: MUTED });
  }

  buckets.forEach((bucket, i) => {
    const h = Math.max(bucket.count > 0 ? 1.5 : 0, Math.round((bucket.count / max) * plotH));
    const x = AXIS_W + i * slot + (slot - barW) / 2;
    if (h > 0) {
      canvas.push({
        type: "rect",
        x,
        y: baseY - h,
        w: barW,
        h,
        color: bucket.color ?? color ?? ACCENT,
      });
      canvas.push({
        type: "text",
        text: String(bucket.count),
        x: x + barW / 2 - 2,
        y: baseY - h - 7,
        fontSize: 5.5,
        color: BRAND,
      });
    }
    const every = buckets.length > 16 ? 3 : buckets.length > 10 ? 2 : 1;
    if (i % every === 0 && bucket.tickLabel) {
      canvas.push({
        type: "text",
        text: bucket.tickLabel,
        x: x + barW / 2 - 5,
        y: baseY + 3,
        fontSize: 5.5,
        color: MUTED,
      });
    }
  });

  canvas.push({
    type: "text",
    text: xLabel,
    x: CHART_WIDTH / 2 - xLabel.length * 1.5,
    y: baseY + 13,
    fontSize: 6,
    color: MUTED,
  });

  return {
    stack: [
      { text: title, fontSize: 7.5, bold: true, color: BRAND } as Content,
      ...(subtitle
        ? [{ text: subtitle, fontSize: 6.5, color: MUTED, margin: [0, 0, 0, 3] } as Content]
        : []),
      { canvas, margin: [0, 0, 0, 10] } as Content,
    ],
  };
}

function lineChart(series: SeriesPoint[], options: ChartOptions): Content {
  const { title, subtitle, xLabel, yLabel, color = ACCENT } = options;
  const max = Math.max(1, ...series.map((p) => p.count));
  const plotW = CHART_WIDTH - AXIS_W;
  const plotH = CHART_HEIGHT;
  const baseY = AXIS_TOP + plotH;
  const n = series.length;
  const stepX = n > 1 ? plotW / (n - 1) : 0;
  const xAt = (i: number): number => AXIS_W + (n > 1 ? i * stepX : plotW / 2);
  const yAt = (value: number): number => baseY - (value / max) * plotH;
  const ticks = max <= 4 ? max : 4;
  const canvas: CanvasPrimitive[] = [];

  canvas.push({ type: "text", text: yLabel, x: 0, y: 0, fontSize: 5.5, color: MUTED });

  for (let i = 0; i <= ticks; i += 1) {
    const value = Math.round((max / ticks) * i);
    const y = baseY - (plotH / ticks) * i;
    canvas.push({
      type: "line",
      x1: AXIS_W,
      y1: y,
      x2: CHART_WIDTH,
      y2: y,
      lineWidth: 0.4,
      lineColor: i === 0 ? "#94a3b8" : GRID,
    });
    canvas.push({ type: "text", text: String(value), x: 0, y: y - 3, fontSize: 6, color: MUTED });
  }

  for (let i = 1; i < n; i += 1) {
    canvas.push({
      type: "line",
      x1: xAt(i - 1),
      y1: yAt(series[i - 1].count),
      x2: xAt(i),
      y2: yAt(series[i].count),
      lineWidth: 1.1,
      lineColor: color,
    });
  }

  series.forEach((point, i) => {
    const x = xAt(i);
    const y = yAt(point.count);
    canvas.push({ type: "rect", x: x - 1.3, y: y - 1.3, w: 2.6, h: 2.6, color });
    if (n <= 26 && point.count > 0) {
      canvas.push({
        type: "text",
        text: String(point.count),
        x: x - 2,
        y: y - 7,
        fontSize: 5.5,
        color: BRAND,
      });
    }
    const every = Math.max(1, Math.ceil(n / 12));
    if ((i % every === 0 || i === n - 1) && point.label) {
      canvas.push({
        type: "text",
        text: point.label,
        x: x - point.label.length * 1.4,
        y: baseY + 3,
        fontSize: 5.5,
        color: MUTED,
      });
    }
  });

  canvas.push({
    type: "text",
    text: xLabel,
    x: CHART_WIDTH / 2 - xLabel.length * 1.5,
    y: baseY + 13,
    fontSize: 6,
    color: MUTED,
  });

  return {
    stack: [
      { text: title, fontSize: 7.5, bold: true, color: BRAND } as Content,
      ...(subtitle
        ? [{ text: subtitle, fontSize: 6.5, color: MUTED, margin: [0, 0, 0, 3] } as Content]
        : []),
      { canvas, margin: [0, 0, 0, 10] } as Content,
    ],
  };
}

const HEAT_RAMP = [
  "#f1f5f9",
  "#ecfccb",
  "#d9f99d",
  "#bef264",
  "#fde047",
  "#fb923c",
  "#ef4444",
  "#b91c1c",
];

function heatColor(ratio: number): string {
  const idx = Math.min(
    HEAT_RAMP.length - 1,
    Math.max(0, Math.round(ratio * (HEAT_RAMP.length - 1))),
  );
  return HEAT_RAMP[idx];
}

interface GeoBounds {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

function computeGeoBounds(
  points: AnalysisPoint[],
  zones: AnalysisZone[],
): GeoBounds | null {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLon = Infinity;
  let maxLon = -Infinity;
  let found = false;

  const include = (lat: number, lon: number) => {
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
    found = true;
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLon = Math.min(minLon, lon);
    maxLon = Math.max(maxLon, lon);
  };

  for (const point of points) include(point.lat, point.lon);
  if (!found) {
    for (const zone of zones) {
      for (const [lat, lon] of zone.vertices) include(lat, lon);
    }
  }

  if (!found) return null;

  const padLat = Math.max((maxLat - minLat) * 0.06, 0.0004);
  const padLon = Math.max((maxLon - minLon) * 0.06, 0.0004);
  return {
    minLat: minLat - padLat,
    maxLat: maxLat + padLat,
    minLon: minLon - padLon,
    maxLon: maxLon + padLon,
  };
}

const MAP_X = 38;
const MAP_Y = 14;
const MAP_W = CHART_WIDTH - MAP_X - 8;
const MAP_H = 208;
const MAP_COLS = 52;
const MAP_ROWS = 26;

function heatmapChart(
  points: AnalysisPoint[],
  zones: AnalysisZone[],
  subtitle: string,
): Content {
  const title = "Mapa de calor de tráfico (posiciones registradas)";
  const bounds = points.length > 0 ? computeGeoBounds(points, zones) : null;

  if (!bounds || points.length === 0) {
    return {
      stack: [
        { text: title, fontSize: 7.5, bold: true, color: BRAND } as Content,
        {
          text: "Sin posiciones geográficas para el período. El heatmap requiere historiales de puntos disponibles.",
          fontSize: 8,
          color: MUTED,
          margin: [0, 3, 0, 0],
        } as Content,
      ],
    };
  }

  const spanLat = bounds.maxLat - bounds.minLat;
  const spanLon = bounds.maxLon - bounds.minLon;
  const xOf = (lon: number): number => MAP_X + ((lon - bounds.minLon) / spanLon) * MAP_W;
  const yOf = (lat: number): number => MAP_Y + ((bounds.maxLat - lat) / spanLat) * MAP_H;
  const cellW = MAP_W / MAP_COLS;
  const cellH = MAP_H / MAP_ROWS;
  const cells = new Uint32Array(MAP_COLS * MAP_ROWS);

  for (const point of points) {
    const col = Math.min(
      MAP_COLS - 1,
      Math.max(0, Math.floor(((point.lon - bounds.minLon) / spanLon) * MAP_COLS)),
    );
    const row = Math.min(
      MAP_ROWS - 1,
      Math.max(0, Math.floor(((bounds.maxLat - point.lat) / spanLat) * MAP_ROWS)),
    );
    cells[row * MAP_COLS + col] += 1;
  }

  let maxCell = 0;
  for (const count of cells) {
    if (count > maxCell) maxCell = count;
  }

  const canvas: CanvasPrimitive[] = [
    { type: "rect", x: MAP_X, y: MAP_Y, w: MAP_W, h: MAP_H, color: "#f8fafc" },
  ];

  for (let row = 0; row < MAP_ROWS; row += 1) {
    for (let col = 0; col < MAP_COLS; col += 1) {
      const count = cells[row * MAP_COLS + col];
      if (count === 0) continue;
      const ratio = Math.log1p(count) / Math.log1p(Math.max(1, maxCell));
      canvas.push({
        type: "rect",
        x: MAP_X + col * cellW,
        y: MAP_Y + row * cellH,
        w: cellW + 0.4,
        h: cellH + 0.8,
        color: heatColor(ratio),
      });
    }
  }

  for (const zone of zones) {
    if (zone.vertices.length < 3) continue;
    const stroke = /^#[0-9a-f]{3,8}$/i.test(zone.color ?? "") ? zone.color! : BRAND;
    for (let i = 0; i < zone.vertices.length; i += 1) {
      const [lat1, lon1] = zone.vertices[i];
      const [lat2, lon2] = zone.vertices[(i + 1) % zone.vertices.length];
      canvas.push({
        type: "line",
        x1: xOf(lon1),
        y1: yOf(lat1),
        x2: xOf(lon2),
        y2: yOf(lat2),
        lineWidth: 0.8,
        lineColor: stroke,
      });
    }
    let cLat = 0;
    let cLon = 0;
    for (const [lat, lon] of zone.vertices) {
      cLat += lat;
      cLon += lon;
    }
    cLat /= zone.vertices.length;
    cLon /= zone.vertices.length;
    let label = truncate(zone.nombre, 16);
    if (label.length > 14) label = `${label.slice(0, 13)}…`;
    canvas.push({
      type: "text",
      text: label,
      x: xOf(cLon) - label.length * 1.4,
      y: yOf(cLat) - 2,
      fontSize: 5.5,
      color: BRAND,
      bold: true,
    });
  }

  canvas.push({ type: "line", x1: MAP_X, y1: MAP_Y + MAP_H, x2: MAP_X + MAP_W, y2: MAP_Y + MAP_H, lineWidth: 0.6, lineColor: "#94a3b8" });
  canvas.push({ type: "line", x1: MAP_X, y1: MAP_Y, x2: MAP_X, y2: MAP_Y + MAP_H, lineWidth: 0.6, lineColor: "#94a3b8" });

  for (let i = 0; i < 3; i += 1) {
    const fraction = i / 2;
    const lon = bounds.minLon + spanLon * fraction;
    const lat = bounds.minLat + spanLat * fraction;
    const tx = MAP_X + MAP_W * fraction;
    const ty = MAP_Y + MAP_H - MAP_H * fraction;
    canvas.push({
      type: "text",
      text: lon.toFixed(4),
      x: tx - 12,
      y: MAP_Y + MAP_H + 3,
      fontSize: 5.5,
      color: MUTED,
    });
    canvas.push({
      type: "text",
      text: lat.toFixed(4),
      x: 0,
      y: ty - 3,
      fontSize: 5.5,
      color: MUTED,
    });
  }

  canvas.push({ type: "text", text: "Latitud", x: 0, y: 0, fontSize: 6, color: MUTED, bold: true });
  canvas.push({
    type: "text",
    text: "Longitud",
    x: MAP_X + MAP_W / 2 - 13,
    y: MAP_Y + MAP_H + 13,
    fontSize: 6,
    color: MUTED,
    bold: true,
  });

  const legendX = MAP_X + MAP_W - HEAT_RAMP.length * 12;
  const legendY = MAP_Y + MAP_H + 25;
  HEAT_RAMP.forEach((color, i) => {
    canvas.push({
      type: "rect",
      x: legendX + i * 12,
      y: legendY,
      w: 12,
      h: 5,
      color,
    });
  });
  canvas.push({ type: "text", text: "0", x: legendX - 7, y: legendY, fontSize: 5.5, color: MUTED });
  canvas.push({
    type: "text",
    text: String(maxCell),
    x: legendX + HEAT_RAMP.length * 12 + 2,
    y: legendY,
    fontSize: 5.5,
    color: MUTED,
  });
  canvas.push({
    type: "text",
    text: "posiciones por celda",
    x: legendX + 20,
    y: legendY - 8,
    fontSize: 5.5,
    color: MUTED,
  });

  return {
    stack: [
      { text: title, fontSize: 7.5, bold: true, color: BRAND } as Content,
      { text: subtitle, fontSize: 6.5, color: MUTED, margin: [0, 0, 0, 3] } as Content,
      { canvas, margin: [0, 0, 0, 10] } as Content,
    ],
  };
}

function zoneTrafficChart(result: ZoneTrafficResult): Content {
  const title = "Tráfico por zona";
  const unit = result.basedOnPoints ? "posiciones" : "tracks";
  const rows = result.rows.slice(0, 9);
  const hasOutside = result.basedOnPoints && result.outside > 0;

  if (rows.length === 0 && !hasOutside) {
    return {
      stack: [
        { text: title, fontSize: 7.5, bold: true, color: BRAND } as Content,
        {
          text: "Sin actividad dentro de las zonas configuradas para el período.",
          fontSize: 8,
          color: MUTED,
          margin: [0, 3, 0, 0],
        } as Content,
      ],
    };
  }

  const rowH = 15;
  const barX = 112;
  const barMax = 250;
  const valueX = 372;
  const maxValue = Math.max(
    ...rows.map((row) => row.positions),
    hasOutside ? result.outside : 0,
    1,
  );
  const canvas: CanvasPrimitive[] = [];

  canvas.push({
    type: "text",
    text: `Zona (eje Y) · cantidad de ${unit} (eje X)`,
    x: 0,
    y: 0,
    fontSize: 5.8,
    color: MUTED,
  });

  const drawRow = (
    index: number,
    name: string,
    value: number,
    share: number,
    peakHour: number | null,
    color: string,
  ) => {
    const y = 11 + index * rowH;
    canvas.push({
      type: "text",
      text: truncate(name, 18),
      x: 0,
      y: y + 1,
      fontSize: 6.5,
      color: "#1e293b",
    });
    canvas.push({ type: "rect", x: barX, y: y + 2, w: barMax, h: 7, color: "#e2e8f0" });
    canvas.push({
      type: "rect",
      x: barX,
      y: y + 2,
      w: Math.max(1, Math.round((value / maxValue) * barMax)),
      h: 7,
      color,
    });
    const peak = peakHour != null ? ` · pico ${padHour(peakHour)}h` : "";
    canvas.push({
      type: "text",
      text: `${value.toLocaleString("es-CL")} · ${share.toFixed(1)}%${peak}`,
      x: valueX,
      y: y + 1,
      fontSize: 6.3,
      color: BRAND,
    });
  };

  rows.forEach((row, i) => {
    drawRow(i, row.name, row.positions, row.share, row.peakHour, ACCENT);
  });

  if (hasOutside) {
    drawRow(
      rows.length,
      "Fuera de zonas",
      result.outside,
      result.total > 0 ? (result.outside / result.total) * 100 : 0,
      null,
      CRITICAL,
    );
  }

  const subtitle = result.basedOnPoints
    ? `${result.total.toLocaleString("es-CL")} posiciones · ${(
      result.total > 0 ? ((result.total - result.outside) / result.total) * 100 : 0
    ).toFixed(1)}% dentro de zonas`
    : "Conteo de tracks por zona (sin posiciones disponibles)";

  return {
    stack: [
      { text: title, fontSize: 7.5, bold: true, color: BRAND } as Content,
      { text: subtitle, fontSize: 6.5, color: MUTED, margin: [0, 0, 0, 3] } as Content,
      {
        canvas,
        margin: [0, 0, 0, 14],
      } as Content,
    ],
  };
}

function buildDocDefinition(opts: TrackReportOptions): {
  docDefinition: TDocumentDefinitions;
  range: ReportRange;
} {
  const {
    tracks,
    total,
    filters,
    onlyWithZones = false,
    onlyFavorites = false,
    defaultHours = 12,
    limited = false,
    points = [],
    zones = [],
    tracksAnalyzed = tracks.length,
    pointsLimited = false,
  } = opts;
  const range = resolveReportRange(filters, defaultHours);
  const stats = computeStats(tracks);
  const generatedAt = new Date();
  const hasPoints = points.length > 0;
  const unit = hasPoints ? "posiciones" : "tracks";

  const topTracks = [...tracks]
    .sort((a, b) => (b.distance_m ?? 0) - (a.distance_m ?? 0))
    .slice(0, 5);

  const hourSeries = buildHourOfDaySeries(points, tracks);
  const dailySeries = buildDailySeries(points, tracks, range);
  const nightBuckets = nightBucketsFrom(hourSeries);
  const nightCount = nightBuckets.reduce((sum, bucket) => sum + bucket.count, 0);
  const nightActive = nightCount > 0;
  const zoneTraffic = computeZoneTraffic(points, zones, tracks);
  const topZone = zoneTraffic.rows[0];

  const categoryBuckets: HourBucket[] = stats.byCategory.slice(0, 8).map((item, i) => ({
    hour: i,
    count: item.count,
    label: item.label,
    tickLabel: shortLabel(item.label),
  }));
  const radarBuckets: HourBucket[] = stats.byRadar.map((item, i) => ({
    hour: i,
    count: item.count,
    label: item.label,
    tickLabel: shortLabel(item.label),
  }));

  const rangeLabel = range.filtered
    ? "Rango según filtro de fechas"
    : `Últimas ${humanHours(defaultHours)} (por defecto)`;

  const peakHour = peakOf(hourSeries);
  const peakDay = peakOf(dailySeries);
  const topCategory = stats.byCategory[0];
  const nightBase = hasPoints ? points.length : stats.trackCount;
  const nightPct = nightBase > 0 ? Math.round((nightCount / nightBase) * 100) : 0;
  const insideZonesPct = zoneTraffic.total > 0
    ? ((zoneTraffic.total - zoneTraffic.outside) / zoneTraffic.total) * 100
    : 0;

  const insights: Content[] = [];
  if (stats.trackCount > 0) {
    if (peakHour && peakHour.count > 0) {
      insights.push({
        text: `Hora pico de tráfico: ${peakHour.label} con ${peakHour.count.toLocaleString("es-CL")} ${unit}`,
        fontSize: 8,
        color: "#1e293b",
      });
    }
    if (dailySeries.length > 1 && peakDay && peakDay.count > 0) {
      insights.push({
        text: `Día de mayor tráfico: ${peakDay.label} con ${peakDay.count.toLocaleString("es-CL")} ${unit}`,
        fontSize: 8,
        color: "#1e293b",
      });
    }
    if (topZone) {
      const peak = topZone.peakHour != null ? ` · pico ${padHour(topZone.peakHour)}h` : "";
      insights.push({
        text: `Zona con mayor tráfico: ${topZone.name} (${topZone.positions.toLocaleString("es-CL")} ${unit} · ${topZone.share.toFixed(1)}%${peak})`,
        fontSize: 8,
        color: "#1e293b",
      });
    }
    if (hasPoints && zoneTraffic.total > 0) {
      insights.push({
        text: `Cobertura de zonas: ${insideZonesPct.toFixed(1)}% de las posiciones dentro de zonas · ${(
          (zoneTraffic.outside / zoneTraffic.total) * 100
        ).toFixed(1)}% fuera`,
        fontSize: 8,
        color: "#1e293b",
      });
    }
    if (topCategory) {
      const share = Math.round((topCategory.count / stats.trackCount) * 100);
      insights.push({
        text: `Categoría principal: ${topCategory.label} (${topCategory.count} tracks · ${share}% del período)`,
        fontSize: 8,
        color: "#1e293b",
      });
    }
    insights.push({
      text: `Actividad nocturna (21:00 - 07:00): ${nightCount.toLocaleString("es-CL")} ${unit} (${nightPct}% del período)`,
      fontSize: 8,
      color: "#1e293b",
    });
  }

  const samplingNote = hasPoints
    ? `Mapa de calor y series temporales basados en ${points.length.toLocaleString("es-CL")} posiciones de ${tracksAnalyzed} tracks${pointsLimited ? " (muestra acotada)" : ""}.`
    : "Las series temporales usan la primera detección de cada track (sin posiciones geográficas disponibles).";

  const heatmapSubtitle = hasPoints
    ? `${points.length.toLocaleString("es-CL")} posiciones · ${tracksAnalyzed}/${tracks.length} tracks analizados${pointsLimited ? " · muestra acotada" : ""}`
    : "Sin posiciones";

  const hourSubtitle = hasPoints
    ? `${points.length.toLocaleString("es-CL")} posiciones agrupadas por hora`
    : `${stats.trackCount} tracks agrupados por hora de inicio`;
  const dailySubtitle = hasPoints
    ? `${points.length.toLocaleString("es-CL")} posiciones agrupadas por día`
    : `${stats.trackCount} tracks agrupados por día de inicio`;

  const docDefinition: TDocumentDefinitions = {
    pageSize: "A4",
    pageMargins: [36, 44, 36, 46],
    info: {
      title: "Informe de actividades - Historial de Tracks",
      author: "RadarED",
      subject: "Actividades registradas",
    },
    defaultStyle: { font: "Roboto", fontSize: 9, color: "#1e293b" },
    header: (currentPage) =>
      currentPage === 1
        ? { text: "" }
        : {
          columns: [
            { text: "INFORME ANALÍTICO DE ACTIVIDADES · HISTORIAL DE TRACKS", fontSize: 7, bold: true, color: MUTED },
            { text: "RadarED", fontSize: 7, color: MUTED, alignment: "right" },
          ],
          margin: [36, 16, 36, 0],
        },
    content: [
      // Cabecera
      {
        columns: [
          {
            width: "*",
            stack: [
              { text: "INFORME ANALÍTICO DE ACTIVIDADES", fontSize: 16, bold: true, color: BRAND },
              { text: "Historial de Tracks · RadarED", fontSize: 9, color: MUTED, margin: [0, 2, 0, 0] },
            ],
          },
          {
            width: "auto",
            alignment: "right",
            stack: [
              { text: "PERÍODO", fontSize: 7, color: MUTED, characterSpacing: 0.5 },
              {
                text: `${fmtDateTime(range.from)} — ${fmtDateTime(range.to)}`,
                fontSize: 8.5,
                bold: true,
                color: BRAND,
                alignment: "right",
              },
              { text: rangeLabel, fontSize: 7, color: MUTED, italics: true, alignment: "right", margin: [0, 1, 0, 0] },
            ],
          },
        ],
      },
      { canvas: [{ type: "line", x1: 0, y1: 0, x2: 523, y2: 0, lineWidth: 1.2, lineColor: ACCENT }], margin: [0, 8, 0, 6] },

      // Resumen
      sectionTitle("Resumen del período"),
      statRow([
        { label: "Tracks", value: String(stats.trackCount) },
        { label: "Puntos", value: stats.totalPoints.toLocaleString("es-CL") },
        { label: "Distancia total", value: fmtDistance(stats.totalDistance) },
        { label: "Tiempo acumulado", value: fmtDuration(stats.totalDuration) },
      ]),
      statRow([
        { label: "Vel. media", value: fmtSpeed(stats.avgSpeed) },
        { label: "Vel. máx.", value: fmtSpeed(stats.maxSpeed) },
        { label: "Entraron a zonas", value: String(stats.withZones) },
        { label: "Clasificados", value: String(stats.classified) },
      ]),
      {
        text: `Filtros aplicados: ${buildFilterLine(filters, onlyWithZones, onlyFavorites)}`,
        fontSize: 7.5,
        color: MUTED,
      },
      {
        text: `Informe generado: ${fmtDateTime(generatedAt)}`,
        fontSize: 7,
        color: MUTED,
        margin: [0, 1, 0, 0],
      },
      {
        text: samplingNote,
        fontSize: 7.5,
        color: "#1e293b",
        margin: [0, 4, 0, 0],
      },
      limited
        ? {
          text: `Nota: el informe incluye ${stats.trackCount} de ${total} tracks del período (por paginación).`,
          fontSize: 7.5,
          color: "#b45309",
          margin: [0, 2, 0, 0],
        }
        : { text: "" },

      // Heatmap
      sectionTitle("Distribución geográfica del tráfico"),
      heatmapChart(points, zones, heatmapSubtitle),

      // Zonas
      zoneTrafficChart(zoneTraffic),

      // Series temporales
      sectionTitle("Evolución temporal del tráfico"),
      lineChart(hourSeries, {
        title: "Tráfico por hora del día",
        subtitle: hourSubtitle,
        xLabel: "Hora del día",
        yLabel: "Cantidad de tráfico",
      }),
      ...(dailySeries.length > 1
        ? [
          lineChart(dailySeries, {
            title: "Tráfico por día",
            subtitle: dailySubtitle,
            xLabel: "Fecha",
            yLabel: "Cantidad de tráfico",
          }),
        ]
        : []),

      // Actividad crítica durante la noche (21:00 - 07:00)
      sectionTitle("Actividad crítica nocturna (21:00 - 07:00)"),
      ...(nightActive
        ? [
          barChart(nightBuckets, {
            title: "Actividad crítica nocturna (21:00 - 07:00)",
            subtitle: `${nightCount.toLocaleString("es-CL")} ${unit} en la franja nocturna`,
            xLabel: "Hora (21:00 - 07:00)",
            yLabel: "Cantidad de tráfico",
            color: CRITICAL,
          }),
        ]
        : [
          { text: "Sin actividad crítica registrada entre las 21:00 y las 07:00.", fontSize: 8, color: MUTED } as Content,
        ]),

      // Distribución de actividades
      sectionTitle("Distribución de actividades"),
      ...(stats.trackCount === 0
        ? [
          { text: "Sin actividad registrada.", fontSize: 8, color: MUTED } as Content,
        ]
        : stats.byRadar.length > 1
          ? [
            {
              columns: [
                barChart(radarBuckets, {
                  title: "Tracks por radar",
                  xLabel: "Radar",
                  yLabel: "Tracks",
                }),
                { width: 16, text: "" } as Content,
                barChart(categoryBuckets, {
                  title: "Tracks por categoría",
                  xLabel: "Categoría",
                  yLabel: "Tracks",
                  color: ACCENT,
                }),
              ],
            } as Content,
          ]
          : [
            barChart(categoryBuckets, {
              title: "Tracks por categoría",
              xLabel: "Categoría",
              yLabel: "Tracks",
              color: ACCENT,
            }),
          ]),

      // Analíticas del período
      sectionTitle("Analíticas del período"),
      ...(stats.trackCount > 0 && insights.length > 0
        ? insights
        : [{ text: "Sin datos analíticos para el período seleccionado.", fontSize: 8, color: MUTED } as Content]),

      // Tracks con mayor recorrido
      ...(topTracks.length > 0
        ? [
          sectionTitle("Tracks con mayor recorrido"),
          {
            ul: topTracks.map(
              (t): Content => ({
                text:
                  `${t.track_id} (${t.tipo_radar || "--"}): ${fmtDistance(t.distance_m)} · ` +
                  `${fmtDuration(t.duration_seconds)} · vel. media ${fmtSpeed(t.avg_speed)}`,
                fontSize: 8,
                margin: [0, 1, 0, 1],
              }),
            ),
            markerColor: ACCENT,
          } as Content,
        ]
        : []),

    ],
    footer: (currentPage, pageCount) => ({
      columns: [
        { text: "RadarED · Informe generado automáticamente · módulo Historial", fontSize: 7, color: MUTED },
        { text: `Página ${currentPage} de ${pageCount}`, fontSize: 7, color: MUTED, alignment: "right" },
      ],
      margin: [36, 8, 36, 0],
    }),
  };

  return { docDefinition, range };
}

/**
 * Genera y descarga el informe PDF analítico de actividades.
 * Devuelve el rango aplicado para que la UI pueda informarlo.
 */
export function downloadTrackActivityReport(opts: TrackReportOptions): ReportRange {
  ensureVfs();
  const { docDefinition, range } = buildDocDefinition(opts);
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  pdfMake.createPdf(docDefinition).download(`informe-actividades-tracks-${stamp}.pdf`);
  return range;
}
