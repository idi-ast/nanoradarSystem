import { useState, useEffect, useRef, useCallback } from "react";

export interface HistoryRange {
  /** Porcentaje de inicio del rango activo (0–100) */
  start: number;
  /** Porcentaje de fin del rango activo (0–100) */
  end: number;
}

interface HistoryRangeBarProps {
  /** Callback invocado cada vez que cambia el rango seleccionado */
  onChange: (range: HistoryRange) => void;
  initialStart?: number;
  initialEnd?: number;
}

/** Separación mínima entre los dos manejadores (en puntos porcentuales) */
const MIN_GAP = 2;

/**
 * Barra de rango histórico con dos manejadores arrastrables.
 *
 * El área entre los manejadores representa la porción activa del historial.
 * Para filtrar un array de N puntos según el rango:
 *
 *   const startIdx = Math.floor((range.start / 100) * history.length);
 *   const endIdx   = Math.ceil((range.end   / 100) * history.length);
 *   const slice    = history.slice(startIdx, endIdx);
 */
export function HistoryRangeBar({
  onChange,
  initialStart = 0,
  initialEnd = 100,
}: HistoryRangeBarProps) {
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);

  const barRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<"start" | "end" | null>(null);

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
      } else {
        const newEnd = Math.min(100, Math.max(pct, s + MIN_GAP));
        rangeRef.current = { start: s, end: newEnd };
        setEnd(newEnd);
        onChangeRef.current({ start: s, end: newEnd });
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
      } else {
        const newEnd = Math.min(100, Math.max(pct, s + MIN_GAP));
        rangeRef.current = { start: s, end: newEnd };
        setEnd(newEnd);
        onChangeRef.current({ start: s, end: newEnd });
      }
    };

    const onRelease = () => {
      draggingRef.current = null;
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

  const activeWidth = end - start;

  return (
    <div className="w-full px-1 py-1">
      {/* Etiquetas de porcentaje */}
      <div className="flex justify-between mb-1">
        <span className="text-[9px] font-mono text-emerald-400 tabular-nums">
          {Math.round(start)}%
        </span>
        <span className="text-[9px] font-mono text-slate-400 tabular-nums">
          {Math.round(activeWidth)}% visible
        </span>
        <span className="text-[9px] font-mono text-emerald-400 tabular-nums">
          {Math.round(end)}%
        </span>
      </div>

      {/* Barra principal */}
      <div
        ref={barRef}
        className="relative w-full select-none"
        style={{ height: 20 }}
        aria-label="Rango histórico"
      >
        {/* Track base */}
        <div className="absolute inset-0 rounded-full bg-slate-700/80" />

        {/* Zona inactiva izquierda */}
        <div
          className="absolute top-0 bottom-0 left-0 rounded-l-full bg-slate-900/70"
          style={{ width: `${start}%` }}
        />

        {/* Zona activa */}
        <div
          className="absolute top-0 bottom-0 bg-emerald-500/25 border-y border-emerald-500/50"
          style={{ left: `${start}%`, width: `${activeWidth}%` }}
        >
          {/* Brillo central decorativo */}
          <div className="absolute inset-x-0 top-0 h-px bg-emerald-400/40 rounded-full" />
        </div>

        {/* Zona inactiva derecha */}
        <div
          className="absolute top-0 bottom-0 right-0 rounded-r-full bg-slate-900/70"
          style={{ width: `${100 - end}%` }}
        />

        {/* Manejador izquierdo (start) */}
        <RangeHandle
          percent={start}
          side="left"
          onMouseDown={startDragging("start")}
          onTouchStart={startDragging("start")}
        />

        {/* Manejador derecho (end) */}
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

// ─── Handle interno ─────────────────────────────────────────────────────────

interface RangeHandleProps {
  percent: number;
  side: "left" | "right";
  onMouseDown: (e: React.MouseEvent) => void;
  onTouchStart: (e: React.TouchEvent) => void;
}

function RangeHandle({ percent, side, onMouseDown, onTouchStart }: RangeHandleProps) {
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
                 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-300
                 flex flex-col items-center justify-center gap-0.75
                 shadow-[0_0_6px_rgba(16,185,129,0.6)]
                 transition-colors duration-100"
      style={{ left: `${percent}%` }}
    >
      {/* Líneas decorativas del grip */}
      <span className="w-px h-2.5 bg-white/60 rounded-full" />
      {/* Flecha indicadora de dirección */}
      <span
        className={`absolute text-[6px] text-emerald-200 font-bold leading-none
                    ${side === "left" ? "-left-2.5" : "-right-2.5"}`}
      >
        {side === "left" ? "◀" : "▶"}
      </span>
    </div>
  );
}
