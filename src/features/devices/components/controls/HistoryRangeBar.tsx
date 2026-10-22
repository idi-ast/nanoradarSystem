import {
  IconArrowBarLeft,
  IconArrowBarRight,
  IconClock,
  IconHistory,
} from "@tabler/icons-react";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";

export interface HistoryRange {
  start: number;
  end: number;
  startTs?: number;
  endTs?: number;
  isLive?: boolean;
}

export interface HistoryTimeRange {
  start: number;
  end: number;
  startTs: number;
  endTs: number;
  isLive: boolean;
  fromIso: string;
  toIso: string;
  durationMs: number;
}

interface HistoryRangeBarProps {
  onChange: (range: HistoryRange, timeRange?: HistoryTimeRange) => void;
  onCommit?: (range: HistoryRange, timeRange?: HistoryTimeRange) => void;
  initialStart?: number;
  initialEnd?: number;
  /** Timestamp (ms) del primer punto del historial completo (para mostrar fechas) */
  minTime?: number;
  /** Timestamp (ms) del último punto del historial completo (para mostrar fechas) */
  maxTime?: number;
  /** Ventana de tiempo por defecto en ms cuando no hay minTime/maxTime (default: 1 hora = 3.600.000 ms) */
  defaultWindowMs?: number;
  /** Mostrar barra de presets rápidos (1m, 15m, 1h, 6h, 24h) */
  showPresets?: boolean;
  /** Si debe iniciar en modo en vivo (default: true) */
  initialLive?: boolean;
  className?: string;
}

/** Separación mínima entre los dos manejadores (en puntos porcentuales) */
const MIN_GAP = 1;

function formatDateTime(ms: number | undefined | null): string {
  if (ms == null || !isFinite(ms)) return "—";
  const d = new Date(ms);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getFullYear());
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`;
}

function formatDuration(ms: number): string {
  if (!isFinite(ms) || ms <= 0) return "0s";
  const totalSec = Math.round(ms / 1000);
  if (totalSec < 60) return `${totalSec}s`;
  const totalMin = Math.floor(totalSec / 60);
  if (totalMin < 60) return `${totalMin}m ${totalSec % 60}s`;
  const hours = Math.floor(totalMin / 60);
  const remMin = totalMin % 60;
  return remMin > 0 ? `${hours}h ${remMin}m` : `${hours}h`;
}

interface PresetOption {
  id: string;
  label: string;
  ms: number;
  isLive: boolean;
}

const DEFAULT_PRESETS: PresetOption[] = [
  { id: "1m", label: "1m (En vivo)", ms: 60_000, isLive: true },
  { id: "15m", label: "15m", ms: 15 * 60_000, isLive: false },
  { id: "1h", label: "1h", ms: 60 * 60_000, isLive: false },
  { id: "6h", label: "6h", ms: 6 * 60 * 60_000, isLive: false },
  { id: "24h", label: "24h", ms: 24 * 60 * 60_000, isLive: false },
];

/**
 * Barra de rango histórico y tiempo real mejorada.
 *
 * Soporta:
 * - Modo "EN VIVO": Muestra tracks activos en tiempo real con su último minuto de traza.
 * - Modo "HISTÓRICO (BD)": Permite buscar y navegar hacia el pasado consultando la base de datos.
 * - Presets temporales rápidos (1m, 15m, 1h, 6h, 24h).
 * - Fechas y horas reales calculadas de manera robusta.
 * - Deslizamiento suave de extremos y del rango completo (drag central).
 */
export function HistoryRangeBar({
  onChange,
  onCommit,
  initialStart = 0,
  initialEnd = 100,
  minTime,
  maxTime,
  defaultWindowMs = 3_600_000, // 1 hora por defecto
  showPresets = true,
  initialLive = true,
  className = "",
}: HistoryRangeBarProps) {
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);
  const [isLive, setIsLive] = useState(initialLive);
  const [now, setNow] = useState(() => Date.now());

  const barRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<"start" | "end" | "move" | null>(null);
  const moveRef = useRef<{ startX: number; start: number; end: number } | null>(
    null,
  );

  const rangeRef = useRef({ start: initialStart, end: initialEnd });
  const isLiveRef = useRef(isLive);
  const onChangeRef = useRef(onChange);
  const onCommitRef = useRef(onCommit);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onCommitRef.current = onCommit;
  }, [onCommit]);

  useEffect(() => {
    rangeRef.current = { start, end };
    isLiveRef.current = isLive;
  }, [start, end, isLive]);

  // Actualizar `now` periódicamente cuando estamos en vivo para que la hora avance
  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [isLive]);

  // Cálculo de los límites temporales efectivos
  const { effectiveMinTime, timeSpan } = useMemo(() => {
    const max = maxTime != null && isFinite(maxTime) ? maxTime : now;
    let min = minTime != null && isFinite(minTime) ? minTime : max - defaultWindowMs;

    if (min >= max) {
      min = max - defaultWindowMs;
    }

    return {
      effectiveMinTime: min,
      timeSpan: Math.max(1000, max - min),
    };
  }, [minTime, maxTime, now, defaultWindowMs]);

  // Cálculo de timestamps del rango visible actual
  const startTs = Math.round(effectiveMinTime + (start / 100) * timeSpan);
  const endTs = Math.round(effectiveMinTime + (end / 100) * timeSpan);
  const activeDurationMs = Math.max(0, endTs - startTs);

  const buildTimeRange = useCallback(
    (s: number, e: number, live: boolean): HistoryTimeRange => {
      const sTs = Math.round(effectiveMinTime + (s / 100) * timeSpan);
      const eTs = Math.round(effectiveMinTime + (e / 100) * timeSpan);
      return {
        start: s,
        end: e,
        startTs: sTs,
        endTs: eTs,
        isLive: live,
        fromIso: new Date(sTs).toISOString(),
        toIso: new Date(eTs).toISOString(),
        durationMs: Math.max(0, eTs - sTs),
      };
    },
    [effectiveMinTime, timeSpan],
  );

  /** Convierte una posición X del cursor en porcentaje respecto a la barra */
  const getPercent = useCallback((clientX: number): number => {
    if (!barRef.current) return 0;
    const { left, width } = barRef.current.getBoundingClientRect();
    if (width <= 0) return 0;
    return Math.min(100, Math.max(0, ((clientX - left) / width) * 100));
  }, []);

  // Registrar listeners globales para arrastre
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      const pct = getPercent(e.clientX);
      const { start: s, end: en } = rangeRef.current;

      if (draggingRef.current === "start") {
        const newStart = Math.max(0, Math.min(pct, en - MIN_GAP));
        rangeRef.current = { start: newStart, end: en };
        setStart(newStart);
        const live = isLiveRef.current && en >= 98;
        const timeRange = buildTimeRange(newStart, en, live);
        onChangeRef.current({ start: newStart, end: en, startTs: timeRange.startTs, endTs: timeRange.endTs, isLive: live }, timeRange);
      } else if (draggingRef.current === "end") {
        const newEnd = Math.min(100, Math.max(pct, s + MIN_GAP));
        const live = newEnd >= 98;
        setIsLive(live);
        isLiveRef.current = live;
        rangeRef.current = { start: s, end: newEnd };
        setEnd(newEnd);
        const timeRange = buildTimeRange(s, newEnd, live);
        onChangeRef.current({ start: s, end: newEnd, startTs: timeRange.startTs, endTs: timeRange.endTs, isLive: live }, timeRange);
      } else if (draggingRef.current === "move") {
        const m = moveRef.current;
        if (!m) return;
        const startPct = getPercent(m.startX);
        const delta = pct - startPct;
        const width = m.end - m.start;
        const newStart = Math.max(0, Math.min(100 - width, m.start + delta));
        const newEnd = newStart + width;
        const live = newEnd >= 98;
        setIsLive(live);
        isLiveRef.current = live;
        rangeRef.current = { start: newStart, end: newEnd };
        setStart(newStart);
        setEnd(newEnd);
        const timeRange = buildTimeRange(newStart, newEnd, live);
        onChangeRef.current({ start: newStart, end: newEnd, startTs: timeRange.startTs, endTs: timeRange.endTs, isLive: live }, timeRange);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!draggingRef.current || !e.touches[0]) return;
      const pct = getPercent(e.touches[0].clientX);
      const { start: s, end: en } = rangeRef.current;

      if (draggingRef.current === "start") {
        const newStart = Math.max(0, Math.min(pct, en - MIN_GAP));
        rangeRef.current = { start: newStart, end: en };
        setStart(newStart);
        const live = isLiveRef.current && en >= 98;
        const timeRange = buildTimeRange(newStart, en, live);
        onChangeRef.current({ start: newStart, end: en, startTs: timeRange.startTs, endTs: timeRange.endTs, isLive: live }, timeRange);
      } else if (draggingRef.current === "end") {
        const newEnd = Math.min(100, Math.max(pct, s + MIN_GAP));
        const live = newEnd >= 98;
        setIsLive(live);
        isLiveRef.current = live;
        rangeRef.current = { start: s, end: newEnd };
        setEnd(newEnd);
        const timeRange = buildTimeRange(s, newEnd, live);
        onChangeRef.current({ start: s, end: newEnd, startTs: timeRange.startTs, endTs: timeRange.endTs, isLive: live }, timeRange);
      } else if (draggingRef.current === "move") {
        const m = moveRef.current;
        if (!m) return;
        const startPct = getPercent(m.startX);
        const delta = pct - startPct;
        const width = m.end - m.start;
        const newStart = Math.max(0, Math.min(100 - width, m.start + delta));
        const newEnd = newStart + width;
        const live = newEnd >= 98;
        setIsLive(live);
        isLiveRef.current = live;
        rangeRef.current = { start: newStart, end: newEnd };
        setStart(newStart);
        setEnd(newEnd);
        const timeRange = buildTimeRange(newStart, newEnd, live);
        onChangeRef.current({ start: newStart, end: newEnd, startTs: timeRange.startTs, endTs: timeRange.endTs, isLive: live }, timeRange);
      }
    };

    const onRelease = () => {
      if (draggingRef.current) {
        const { start: s, end: en } = rangeRef.current;
        const live = isLiveRef.current;
        const timeRange = buildTimeRange(s, en, live);
        onCommitRef.current?.({ start: s, end: en, startTs: timeRange.startTs, endTs: timeRange.endTs, isLive: live }, timeRange);
      }
      draggingRef.current = null;
      moveRef.current = null;
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onRelease);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onRelease);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onRelease);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onRelease);
    };
  }, [getPercent, buildTimeRange]);

  const startDragging =
    (handle: "start" | "end") => (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      draggingRef.current = handle;
    };

  const startDraggingMove = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!barRef.current) return;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    moveRef.current = {
      startX: clientX,
      start: rangeRef.current.start,
      end: rangeRef.current.end,
    };
    draggingRef.current = "move";
  };

  /** Clic en preset */
  const handleSelectPreset = useCallback(
    (preset: PresetOption) => {
      if (preset.isLive) {
        // En vivo: snaps to end
        setStart(0);
        setEnd(100);
        setIsLive(true);
        isLiveRef.current = true;
        rangeRef.current = { start: 0, end: 100 };
        const timeRange = buildTimeRange(0, 100, true);
        onChangeRef.current({ start: 0, end: 100, startTs: timeRange.startTs, endTs: timeRange.endTs, isLive: true }, timeRange);
        onCommitRef.current?.({ start: 0, end: 100, startTs: timeRange.startTs, endTs: timeRange.endTs, isLive: true }, timeRange);
      } else {
        // Preset de tiempo en el pasado: calcula el porcentaje según la duración
        const windowPct = Math.min(100, Math.max(5, (preset.ms / timeSpan) * 100));
        const newStart = Math.max(0, 100 - windowPct);
        const newEnd = 100;
        setStart(newStart);
        setEnd(newEnd);
        setIsLive(false);
        isLiveRef.current = false;
        rangeRef.current = { start: newStart, end: newEnd };
        const timeRange = buildTimeRange(newStart, newEnd, false);
        onChangeRef.current({ start: newStart, end: newEnd, startTs: timeRange.startTs, endTs: timeRange.endTs, isLive: false }, timeRange);
        onCommitRef.current?.({ start: newStart, end: newEnd, startTs: timeRange.startTs, endTs: timeRange.endTs, isLive: false }, timeRange);
      }
    },
    [timeSpan, buildTimeRange],
  );

  /** Volver inmediatamente a En Vivo */
  const handleGoLive = useCallback(() => {
    setStart(0);
    setEnd(100);
    setIsLive(true);
    isLiveRef.current = true;
    rangeRef.current = { start: 0, end: 100 };
    const timeRange = buildTimeRange(0, 100, true);
    onChangeRef.current({ start: 0, end: 100, startTs: timeRange.startTs, endTs: timeRange.endTs, isLive: true }, timeRange);
    onCommitRef.current?.({ start: 0, end: 100, startTs: timeRange.startTs, endTs: timeRange.endTs, isLive: true }, timeRange);
  }, [buildTimeRange]);

  const activeWidth = Math.max(MIN_GAP, end - start);

  return (
    <div className={`w-full px-2 py-1 bg-bg-200/95 backdrop-blur border-t border-border/40 select-none ${className}`}>
      {/* Fila superior: Estado, Fechas y Presets */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1 text-xs font-mono">
        {/* Izquierda: Modo En Vivo / Histórico y Fecha de Inicio */}
        <div className="flex items-center gap-2">
          {isLive ? (
            <span
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm"
              title="Mostrando posiciones en tiempo real con 1 minuto de traza"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              EN VIVO (1m)
            </span>
          ) : (
            <button
              type="button"
              onClick={handleGoLive}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-emerald-500/20 hover:text-emerald-300 hover:border-emerald-500/40 transition-colors shadow-sm cursor-pointer"
              title="Click para volver a modo EN VIVO"
            >
              <IconHistory size={12} className="text-amber-300" />
              HISTÓRICO BD
              <span className="ml-1 text-[9px] px-1 bg-amber-400/20 text-amber-200 rounded">
                Volver a Vivo ⚡
              </span>
            </button>
          )}

          <div className="flex items-center gap-1 text-text-200 text-[11px] tabular-nums">
            <IconClock size={12} className="text-text-400" />
            <span className="text-text-100 font-semibold">{formatDateTime(startTs)}</span>
          </div>
        </div>

        {/* Centro: Presets rápidos */}
        {showPresets && (
          <div className="flex items-center gap-1 bg-bg-100/60 p-0.5 rounded-lg border border-border/40">
            {DEFAULT_PRESETS.map((p) => {
              const active = p.isLive ? isLive : !isLive && Math.abs(activeDurationMs - p.ms) < p.ms * 0.25;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectPreset(p)}
                  className={`px-2 py-0.5 text-[10px] rounded transition-all font-medium cursor-pointer ${
                    active
                      ? "bg-bg-300 text-sky-300 border border-sky-500/30 font-bold shadow-xs"
                      : "text-text-400 hover:text-text-100 hover:bg-bg-300/50"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Derecha: Fecha de Fin y Duración de la Ventana */}
        <div className="flex items-center gap-2 text-right">
          <span className="text-[10px] px-2 py-0.5 rounded bg-bg-100/80 text-text-300 border border-border/30 tabular-nums">
            Ventana: <strong className="text-text-100">{formatDuration(activeDurationMs)}</strong> ({Math.round(activeWidth)}%)
          </span>
          <div className="flex items-center gap-1 text-text-200 text-[11px] tabular-nums">
            <span className="text-text-100 font-semibold">{formatDateTime(endTs)}</span>
          </div>
        </div>
      </div>

      {/* Barra de Línea de Tiempo con manejadores arrastrables */}
      <div
        ref={barRef}
        className="relative w-full select-none bg-bg-100/90 rounded-md border border-border/60 overflow-visible"
        style={{ height: 20 }}
        aria-label="Línea de tiempo del historial"
      >
        {/* Guías de fondo (marcas de tiempo visuales) */}
        <div className="absolute inset-0 flex justify-between px-2 items-center pointer-events-none opacity-20">
          <span className="w-px h-2 bg-text-400" />
          <span className="w-px h-1.5 bg-text-400" />
          <span className="w-px h-1.5 bg-text-400" />
          <span className="w-px h-2 bg-text-400" />
          <span className="w-px h-1.5 bg-text-400" />
          <span className="w-px h-1.5 bg-text-400" />
          <span className="w-px h-2 bg-text-400" />
        </div>

        {/* Zona izquierda inactiva */}
        <div
          className="absolute top-0 bottom-0 left-0 bg-bg-100/80 rounded-l-md"
          style={{ width: `${start}%` }}
        />

        {/* Zona activa (ventana temporal seleccionada) - ARRASTRABLE */}
        <div
          className={`absolute top-0 bottom-0 cursor-grab active:cursor-grabbing border-y transition-colors ${
            isLive
              ? "bg-gradient-to-r from-emerald-500/20 via-sky-500/25 to-emerald-500/30 border-emerald-500/50"
              : "bg-gradient-to-r from-amber-500/20 via-sky-500/25 to-amber-500/30 border-amber-500/50"
          }`}
          style={{
            left: `${start}%`,
            width: `${activeWidth}%`,
            touchAction: "none",
          }}
          onMouseDown={startDraggingMove}
          onTouchStart={startDraggingMove}
          title="Arrastra para mover la ventana temporal en el tiempo"
        >
          {/* Líneas de agarre en el centro */}
          <div className="absolute inset-0 flex items-center justify-center gap-0.5 pointer-events-none opacity-60">
            <span className="w-0.5 h-3 bg-white/40 rounded-full" />
            <span className="w-0.5 h-3 bg-white/40 rounded-full" />
            <span className="w-0.5 h-3 bg-white/40 rounded-full" />
          </div>
          {/* Indicador superior luminoso */}
          <div
            className={`absolute inset-x-0 top-0 h-1 rounded-t-sm ${
              isLive ? "bg-emerald-400" : "bg-amber-400"
            }`}
          />
        </div>

        {/* Zona derecha inactiva */}
        <div
          className="absolute top-0 bottom-0 right-0 bg-bg-100/80 rounded-r-md"
          style={{ width: `${100 - end}%` }}
        />

        {/* Manejador izquierdo (Start) */}
        <RangeHandle
          percent={start}
          side="left"
          isLive={false}
          onMouseDown={startDragging("start")}
          onTouchStart={startDragging("start")}
          title="Arrastrar para ajustar inicio del rango"
        />

        {/* Manejador derecho (End) */}
        <RangeHandle
          percent={end}
          side="right"
          isLive={isLive}
          onMouseDown={startDragging("end")}
          onTouchStart={startDragging("end")}
          title="Arrastrar para ajustar fin del rango (llevar al 100% para En Vivo)"
        />
      </div>
    </div>
  );
}

interface RangeHandleProps {
  percent: number;
  side: "left" | "right";
  isLive?: boolean;
  title?: string;
  onMouseDown: (e: React.MouseEvent) => void;
  onTouchStart: (e: React.TouchEvent) => void;
}

function RangeHandle({
  percent,
  side,
  isLive = false,
  title,
  onMouseDown,
  onTouchStart,
}: RangeHandleProps) {
  return (
    <div
      role="slider"
      aria-valuenow={Math.round(percent)}
      aria-valuemin={0}
      aria-valuemax={100}
      title={title}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20
                 w-3.5 h-7.5 rounded-sm cursor-ew-resize
                 flex flex-col items-center justify-center gap-0.5
                 border shadow-md transition-transform active:scale-110
                 ${
                   isLive && side === "right"
                     ? "bg-emerald-500 border-emerald-300 shadow-emerald-500/50"
                     : "bg-bg-400 hover:bg-bg-300 border-border active:border-sky-400 shadow-black/40"
                 }`}
      style={{ left: `${percent}%` }}
    >
      <span className="w-px h-3 bg-white/70 rounded-full" />
      <span
        className={`absolute text-[8px] font-bold leading-none pointer-events-none ${
          isLive && side === "right" ? "text-emerald-300" : "text-text-300"
        } ${side === "left" ? "-left-4" : "-right-4"}`}
      >
        {side === "left" ? (
          <IconArrowBarLeft size={14} stroke={2.5} />
        ) : (
          <IconArrowBarRight size={14} stroke={2.5} />
        )}
      </span>
    </div>
  );
}
