import { IconArrowBarLeft, IconArrowBarRight } from "@tabler/icons-react";
import { useState, useEffect, useRef, useCallback } from "react";

export interface HistoryRange {
  start: number;
  end: number;
}

interface HistoryRangeBarProps {
  onChange: (range: HistoryRange) => void;
  initialStart?: number;
  initialEnd?: number;
  /** Timestamp (ms) del primer punto del historial completo (para mostrar fechas) */
  minTime?: number;
  /** Timestamp (ms) del último punto del historial completo (para mostrar fechas) */
  maxTime?: number;
}

/** Separación mínima entre los dos manejadores (en puntos porcentuales) */
const MIN_GAP = 2;

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

/**
 * Barra de rango histórico con dos manejadores arrastrables.
 *
 * El área entre los manejadores representa la porción activa del historial.
 * Para filtrar un array de N puntos según el rango:
 *
 *   const startIdx = Math.floor((range.start / 100) * history.length);
 *   const endIdx   = Math.ceil((range.end   / 100) * history.length);
 *   const slice    = history.slice(startIdx, endIdx);
 *
 * Si se proporcionan minTime y maxTime, se muestran las fechas/horas reales
 * del rango visible junto a los porcentajes. Además del estiramiento por los
 * extremos, se puede arrastrar el área central para mover el rango completo
 * (inicio y fin juntos).
 */
export function HistoryRangeBar({
  onChange,
  initialStart = 80,
  initialEnd = 100,
  minTime,
  maxTime,
}: HistoryRangeBarProps) {
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);

  const barRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<"start" | "end" | "move" | null>(null);
  const moveRef = useRef<{ startX: number; start: number; end: number } | null>(
    null,
  );

  // Refs para leer los valores actuales dentro de los event listeners
  // sin necesidad de re-registrarlos en cada renderizado.
  const rangeRef = useRef({ start: initialStart, end: initialEnd });
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Mantener rangeRef sincronizado (para los event listeners sin re-registro)
  useEffect(() => {
    rangeRef.current = { start, end };
  }, [start, end]);

  /** Convierte una posición X del cursor en porcentaje respecto a la barra */
  const getPercent = useCallback((clientX: number): number => {
    if (!barRef.current) return 0;
    const { left, width } = barRef.current.getBoundingClientRect();
    return Math.min(100, Math.max(0, ((clientX - left) / width) * 100));
  }, []);

  // Registrar los listeners globales una sola vez (getPercent es estable)
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      const pct = getPercent(e.clientX);
      const { start: s, end: en } = rangeRef.current;

      if (draggingRef.current === "start") {
        const newStart = Math.max(0, Math.min(pct, en - MIN_GAP));
        rangeRef.current = { start: newStart, end: en };
        setStart(newStart);
        onChangeRef.current({ start: newStart, end: en });
      } else if (draggingRef.current === "end") {
        const newEnd = Math.min(100, Math.max(pct, s + MIN_GAP));
        rangeRef.current = { start: s, end: newEnd };
        setEnd(newEnd);
        onChangeRef.current({ start: s, end: newEnd });
      } else if (draggingRef.current === "move") {
        const m = moveRef.current;
        if (!m) return;
        const startPct = getPercent(m.startX);
        const delta = pct - startPct;
        const width = m.end - m.start;
        const newStart = Math.max(0, Math.min(100 - width, m.start + delta));
        const newEnd = newStart + width;
        rangeRef.current = { start: newStart, end: newEnd };
        setStart(newStart);
        setEnd(newEnd);
        onChangeRef.current({ start: newStart, end: newEnd });
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
        onChangeRef.current({ start: newStart, end: en });
      } else if (draggingRef.current === "end") {
        const newEnd = Math.min(100, Math.max(pct, s + MIN_GAP));
        rangeRef.current = { start: s, end: newEnd };
        setEnd(newEnd);
        onChangeRef.current({ start: s, end: newEnd });
      } else if (draggingRef.current === "move") {
        const m = moveRef.current;
        if (!m) return;
        const startPct = getPercent(m.startX);
        const delta = pct - startPct;
        const width = m.end - m.start;
        const newStart = Math.max(0, Math.min(100 - width, m.start + delta));
        const newEnd = newStart + width;
        rangeRef.current = { start: newStart, end: newEnd };
        setStart(newStart);
        setEnd(newEnd);
        onChangeRef.current({ start: newStart, end: newEnd });
      }
    };

    const onRelease = () => {
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
  }, [getPercent]);

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

  const activeWidth = end - start;
  const hasDates = minTime != null && maxTime != null && maxTime > minTime;
  const startTs = hasDates
    ? minTime! + (start / 100) * (maxTime! - minTime!)
    : undefined;
  const endTs = hasDates
    ? minTime! + (end / 100) * (maxTime! - minTime!)
    : undefined;

  return (
    <div className="w-full px-1 py-1 bg-bg-300">
      <div className="flex justify-between mb-1 py-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-text-100 tabular-nums">
            {Math.round(start)}%
          </span>
          {hasDates && (
            <span className="text-xs font-mono text-text-100/50 tabular-nums">
              {formatDateTime(startTs)}
            </span>
          )}
        </div>
        <span className="text-xs font-mono text-text-100 tabular-nums bg-bg-100 px-3 py-0.5 rounded-full">
          {Math.round(activeWidth)}% visible
        </span>
        <div className="flex items-center gap-2 text-right">
          <span className="text-xs font-mono text-text-100 tabular-nums">
            {Math.round(end)}%
          </span>
          {hasDates && (
            <span className="text-xs font-mono text-text-100/50 tabular-nums">
              {formatDateTime(endTs)}
            </span>
          )}
        </div>
      </div>

      <div
        ref={barRef}
        className="relative w-full select-none bg-bg-100"
        style={{ height: 20 }}
        aria-label="Rango histórico"
      >
        <div className="absolute inset-0 rounded-full bg-bg-400" />

        <div
          className="absolute top-0 bottom-0 left-0 rounded-l-full bg-bg-100"
          style={{ width: `${start}%` }}
        />

        <div
          className="absolute top-0 bottom-0 bg-bg-300 border-y border-bg-400 cursor-grab active:cursor-grabbing"
          style={{
            left: `${start}%`,
            width: `${activeWidth}%`,
            touchAction: "none",
          }}
          onMouseDown={startDraggingMove}
          onTouchStart={startDraggingMove}
        >
          <div className="absolute inset-x-0 top-0 h-px bg-red-400/40 rounded-full" />
        </div>

        <div
          className="absolute top-0 bottom-0 right-0 rounded-r-full bg-bg-100"
          style={{ width: `${100 - end}%` }}
        />
        <RangeHandle
          percent={start}
          side="left"
          onMouseDown={startDragging("start")}
          onTouchStart={startDragging("start")}
        />

        <RangeHandle
          percent={end}
          side="right"
          onMouseDown={startDragging("end")}
          onTouchStart={startDragging("end")}
        />
      </div>
    </div>
  );
}

interface RangeHandleProps {
  percent: number;
  side: "left" | "right";
  onMouseDown: (e: React.MouseEvent) => void;
  onTouchStart: (e: React.TouchEvent) => void;
}

function RangeHandle({
  percent,
  side,
  onMouseDown,
  onTouchStart,
}: RangeHandleProps) {
  return (
    <div
      role="slider"
      aria-valuenow={Math.round(percent)}
      aria-valuemin={0}
      aria-valuemax={100}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10
                 w-3 h-7 rounded-sm cursor-ew-resize
                 bg-bg-400 hover:bg-bg-400/80 active:bg-sky-500
                 flex flex-col items-center justify-center gap-0.75
                 shadow-[0_0_6px_rgba(16,185,129,0.6)]
                 transition-colors duration-100"
      style={{ left: `${percent}%` }}
    >
      <span className="w-px h-2.5 bg-text-400 rounded-full" />
      <span
        className={`absolute text-[6px] text-white-200 font-bold leading-none
                    ${side === "left" ? "-left-5.5" : "-right-5.5"}`}
      >
        {side === "left" ? (
          <IconArrowBarLeft stroke={2} />
        ) : (
          <IconArrowBarRight stroke={2} />
        )}
      </span>
    </div>
  );
}
