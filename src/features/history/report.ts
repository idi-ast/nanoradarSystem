import type { TDocumentDefinitions, Content } from "pdfmake/interfaces";
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import type { TrackSummary, TrackSummaryFilters } from "./types";
import { MS_TO_KMH } from "@/utils/units";

/**
 * Informe PDF breve de las actividades registradas en el Historial de Tracks.
 *
 * - Si `filters.from` / `filters.to` están definidos, el informe cubre ese rango.
 * - Si no hay filtro, se usa por defecto un rango de las últimas `defaultHours`
 *   horas (12 h).
 * - Se respetan los filtros de la barra superior (radar, zona, búsqueda,
 *   mín. puntos, solo zonas, solo favoritos) para acotar los tracks.
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
  | { type: "text"; text: string; x: number; y: number; fontSize: number; color: string };

const BRAND = "#0f172a";
const ACCENT = "#65a30d";
const MUTED = "#64748b";
const BORDER = "#e2e8f0";

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

function fmtTime(d?: string | null): string {
  if (!d) return "--";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
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

function fmtCategory(t: TrackSummary): string {
  if (!t.behavior_class) return "Sin clasificar";
  const label = t.behavior_class.replace(/_/g, " ");
  if (t.behavior_confidence != null) {
    return `${label} (${Math.round(t.behavior_confidence * 100)}%)`;
  }
  return label;
}

function humanHours(hours: number): string {
  if (hours === 1) return "1 hora";
  return `${hours} horas`;
}

// ---------------------------------------------------------------------------
// Cálculos
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
  byZone: CountItem[];
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
  const zoneMap = new Map<string, number>();

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

    for (const z of t.zones ?? []) {
      zoneMap.set(z, (zoneMap.get(z) ?? 0) + 1);
    }
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
    byZone: toSorted(zoneMap),
  };
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
    // Celdas como tarjetas: sin bordes, para separar visualmente cada KPI.
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

function distributionBlock(title: string, rows: CountItem[]): Content {
  return {
    stack: [
      { text: title, fontSize: 8, bold: true, color: BRAND, margin: [0, 0, 0, 3] },
      ...(rows.length === 0
        ? [{ text: "Sin datos", fontSize: 7.5, color: MUTED }]
        : rows.map(
          (r): Content => ({
            columns: [
              { width: "*", text: r.label, fontSize: 7.5, color: "#1e293b" },
              { width: 26, text: String(r.count), fontSize: 7.5, bold: true, alignment: "right" },
            ],
            margin: [0, 0.8, 0, 0.8],
          }),
        )),
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
  } = opts;
  const range = resolveReportRange(filters, defaultHours);
  const stats = computeStats(tracks);
  const generatedAt = new Date();

  // Orden cronológico: más recientes primero
  const ordered = [...tracks].sort((a, b) => {
    const ta = a.first_seen ? new Date(a.first_seen).getTime() : 0;
    const tb = b.first_seen ? new Date(b.first_seen).getTime() : 0;
    return tb - ta;
  });

  const topTracks = [...tracks]
    .sort((a, b) => (b.distance_m ?? 0) - (a.distance_m ?? 0))
    .slice(0, 5);

  const rangeLabel = range.filtered
    ? "Rango según filtro de fechas"
    : `Últimas ${humanHours(defaultHours)} (por defecto)`;

  // Series del gráfico de actividad: se usa el inicio de cada track.
  const { buckets: hourly, stepHours } = buildHourlyBuckets(tracks, range);

  const detailRows: Content[][] = ordered.map((t, idx) => [
    { text: t.track_id, fontSize: 7.5, bold: true, fillColor: idx % 2 ? "#f8fafc" : undefined },
    { text: t.tipo_radar || "--", fontSize: 7.5, fillColor: idx % 2 ? "#f8fafc" : undefined },
    { text: fmtTime(t.first_seen), fontSize: 7.5, fillColor: idx % 2 ? "#f8fafc" : undefined },
    { text: fmtTime(t.last_seen), fontSize: 7.5, fillColor: idx % 2 ? "#f8fafc" : undefined },
    { text: fmtDuration(t.duration_seconds), fontSize: 7.5, fillColor: idx % 2 ? "#f8fafc" : undefined },
    { text: fmtDistance(t.distance_m), fontSize: 7.5, fillColor: idx % 2 ? "#f8fafc" : undefined },
    { text: fmtCategory(t), fontSize: 7, fillColor: idx % 2 ? "#f8fafc" : undefined },
    { text: t.nivel_max != null ? String(t.nivel_max) : "--", fontSize: 7.5, fillColor: idx % 2 ? "#f8fafc" : undefined },
  ]);

  const activityStack: Content[] = ordered.slice(0, 12).map(
    (t): Content => ({
      columns: [
        { width: 42, text: fmtTime(t.first_seen), fontSize: 8, bold: true, color: ACCENT },
        { width: 56, text: t.track_id, fontSize: 8, bold: true },
        {
          width: "*",
          fontSize: 8,
          color: "#1e293b",
          text:
            `${fmtDuration(t.duration_seconds)} · ${fmtDistance(t.distance_m)} · ` +
            `${fmtCategory(t)} · ${fmtSpeed(t.avg_speed)}` +
            (t.zones?.length ? ` · zonas: ${t.zones.join(", ")}` : ""),
        },
      ],
      margin: [0, 1.5, 0, 1.5],
    }),
  );

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
            { text: "INFORME BREVE DE ACTIVIDADES · HISTORIAL DE TRACKS", fontSize: 7, bold: true, color: MUTED },
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
              { text: "INFORME BREVE DE ACTIVIDADES", fontSize: 16, bold: true, color: BRAND },
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
      limited
        ? {
          text: `Nota: el informe incluye ${stats.trackCount} de ${total} tracks del período (por paginación).`,
          fontSize: 7.5,
          color: "#b45309",
          margin: [0, 4, 0, 0],
        }
        : { text: "" },

      // Actividad
      sectionTitle("Actividad en el período (por hora)"),
      ...(hourly.length === 0
        ? [{ text: "Sin actividad registrada.", fontSize: 8, color: MUTED }]
        : [barChart(hourly, stats.trackCount, range, stepHours)]),

      sectionTitle("Distribución de actividades"),
      ...(stats.trackCount === 0 || stats.byRadar.length <= 1
        ? [
          {
            columns: [
              distributionBlock("Por radar", stats.byRadar),
              distributionBlock("Por categoría", stats.byCategory),
              distributionBlock("Por zona", stats.byZone),
            ],
          } as Content,
        ]
        : [
          {
            columns: [
              barChart(
                stats.byRadar.map((r, i) => ({
                  hour: i,
                  count: r.count,
                  label: r.label,
                  tickLabel: r.label,
                })),
                stats.trackCount,
                range,
                1,
                "Tracks por radar",
              ),
              { width: 16, text: "" } as Content,
              {
                width: 230,
                stack: [
                  distributionBlock("Por categoría", stats.byCategory),
                  { text: "", margin: [0, 8, 0, 0] } as Content,
                  distributionBlock("Por zona", stats.byZone),
                ],
              } as Content,
            ],
          } as Content,
        ]),

      sectionTitle("Actividades destacadas (últimas detecciones)"),
      ...(activityStack.length === 0
        ? [{ text: "No se registraron tracks en el período seleccionado.", fontSize: 8.5, italics: true, color: MUTED }]
        : activityStack),

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

      // Detalle
      { text: "Detalle de tracks", fontSize: 10, bold: true, color: BRAND, margin: [0, 14, 0, 4] },
      {
        text: `${stats.trackCount} tracks · ordenados por primera detección (más recientes primero)`,
        fontSize: 7.5,
        color: MUTED,
        margin: [0, 0, 0, 6],
      },
      ordered.length === 0
        ? { text: "--", fontSize: 8, color: MUTED }
        : {
          table: {
            headerRows: 1,
            widths: ["auto", "auto", "auto", "auto", "auto", "auto", "*", "auto"],
            body: [
              [
                { text: "Track", bold: true, fontSize: 7.5, color: "#ffffff", fillColor: BRAND },
                { text: "Radar", bold: true, fontSize: 7.5, color: "#ffffff", fillColor: BRAND },
                { text: "Inicio", bold: true, fontSize: 7.5, color: "#ffffff", fillColor: BRAND },
                { text: "Fin", bold: true, fontSize: 7.5, color: "#ffffff", fillColor: BRAND },
                { text: "Duración", bold: true, fontSize: 7.5, color: "#ffffff", fillColor: BRAND },
                { text: "Distancia", bold: true, fontSize: 7.5, color: "#ffffff", fillColor: BRAND },
                { text: "Categoría (conf.)", bold: true, fontSize: 7.5, color: "#ffffff", fillColor: BRAND },
                { text: "Nivel", bold: true, fontSize: 7.5, color: "#ffffff", fillColor: BRAND },
              ],
              ...detailRows,
            ],
          },
          layout: {
            hLineWidth: (i, node) => (i === 0 || i === 1 || i === node.table.body.length ? 0.6 : 0),
            vLineWidth: () => 0,
            hLineColor: () => BORDER,
            paddingLeft: () => 4,
            paddingRight: () => 4,
            paddingTop: () => 2.5,
            paddingBottom: () => 2.5,
          },
        },
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

// ---------------------------------------------------------------------------
// Gráficos (barras dibujadas con vectores, sin imágenes externas)
// ---------------------------------------------------------------------------
interface HourBucket {
  /** Índice de la barra dentro de la serie. */
  hour: number;
  count: number;
  label?: string;
  /** Etiqueta corta bajo la barra (hora de inicio del tramo). */
  tickLabel?: string;
}

const CHART_WIDTH = 523;
const CHART_HEIGHT = 90;
const AXIS_W = 18;

function buildHourlyBuckets(
  tracks: TrackSummary[],
  range: ReportRange,
): { buckets: HourBucket[]; stepHours: number } {
  const start = new Date(range.from);
  start.setMinutes(0, 0, 0);
  const totalHours = Math.max(
    1,
    Math.ceil((range.to.getTime() - start.getTime()) / 3_600_000),
  );
  // Máximo 24 barras: si el rango es mayor, se agrupa en bloques de horas.
  const stepHours = Math.max(1, Math.ceil(totalHours / 24));
  const buckets: HourBucket[] = [];
  for (let i = 0, k = 0; i < totalHours; i += stepHours, k += 1) {
    const d = new Date(start.getTime() + i * 3_600_000);
    buckets.push({
      hour: k,
      count: 0,
      label: `${String(d.getHours()).padStart(2, "0")}:00`,
      tickLabel: `${String(d.getHours()).padStart(2, "0")}h`,
    });
  }
  for (const t of tracks) {
    if (!t.first_seen) continue;
    const ts = new Date(t.first_seen).getTime();
    if (ts < start.getTime() || ts > range.to.getTime()) continue;
    const idx = Math.min(
      buckets.length - 1,
      Math.floor((ts - start.getTime()) / 3_600_000 / stepHours),
    );
    buckets[idx].count += 1;
  }
  return { buckets, stepHours };
}

/**
 * Gráfico de barras vectorial con eje Y (líneas guía), valores sobre las
 * barras y etiquetas de eje X. Se dibuja con primitivas de canvas de pdfmake,
 * así que no requiere imágenes ni fuentes adicionales.
 */
function barChart(
  buckets: HourBucket[],
  totalTracks: number,
  range: ReportRange,
  stepHours: number,
  title = "Tracks por hora (según primera detección)",
): Content {
  const max = Math.max(1, ...buckets.map((b) => b.count));
  const plotW = CHART_WIDTH - AXIS_W;
  const plotH = CHART_HEIGHT;
  const slot = plotW / Math.max(1, buckets.length);
  const barW = Math.max(3, slot * 0.62);
  const baseY = plotH;

  const ticks = max <= 4 ? max : 4;
  const canvas: CanvasPrimitive[] = [];

  // Líneas guía horizontales + valores del eje Y
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
      lineColor: i === 0 ? "#94a3b8" : "#e2e8f0",
    });
    canvas.push({
      type: "text",
      text: String(value),
      x: 0,
      y: y - 3,
      fontSize: 6,
      color: MUTED,
    });
  }

  // Barras + valor encima
  buckets.forEach((b, i) => {
    const h = Math.max(b.count > 0 ? 1.5 : 0, Math.round((b.count / max) * plotH));
    const x = AXIS_W + i * slot + (slot - barW) / 2;
    if (h > 0) {
      canvas.push({
        type: "rect",
        x,
        y: baseY - h,
        w: barW,
        h,
        color: i === buckets.length - 1 && !range.filtered ? "#84cc16" : ACCENT,
      });
      canvas.push({
        type: "text",
        text: String(b.count),
        x: x + barW / 2 - 2,
        y: baseY - h - 7,
        fontSize: 5.5,
        color: BRAND,
      });
    }
    // Etiqueta del eje X (se alterna si hay muchas barras)
    const every = buckets.length > 16 ? 3 : buckets.length > 10 ? 2 : 1;
    if (i % every === 0 && b.tickLabel) {
      canvas.push({
        type: "text",
        text: b.tickLabel,
        x: x + barW / 2 - 5,
        y: baseY + 3,
        fontSize: 5.5,
        color: MUTED,
      });
    }
  });

  const subtitle =
    stepHours > 1
      ? `tracks por tramo de ${stepHours} h · total ${totalTracks}`
      : `tracks · total ${totalTracks}`;

  return {
    stack: [
      { text: title, fontSize: 7.5, bold: true, color: BRAND } as Content,
      { text: subtitle, fontSize: 6.5, color: MUTED, margin: [0, 0, 0, 3] } as Content,
      { canvas, margin: [0, 0, 0, 10] } as Content,
    ],
  };
}

/**
 * Genera y descarga el informe PDF breve de actividades.
 * Devuelve el rango aplicado para que la UI pueda informarlo.
 */
export function downloadTrackActivityReport(opts: TrackReportOptions): ReportRange {
  ensureVfs();
  const { docDefinition, range } = buildDocDefinition(opts);
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  pdfMake.createPdf(docDefinition).download(`informe-actividades-tracks-${stamp}.pdf`);
  return range;
}
