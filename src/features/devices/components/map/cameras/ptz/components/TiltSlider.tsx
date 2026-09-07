import { useState, useRef, useEffect } from "react";
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react";

// ─── Slider de inclinación (tilt) tipo "barra de volumen" centrado en 0 ──
//   Controla el ÁNGULO real respecto a la horizontal: + = mira hacia abajo,
//   - = mira hacia arriba, 0 = horizontal. Al soltar se dispara onCommit(angle)
//   para mover la cámara; el backend devuelve la posición real y se reconcilia.
//   Incluye botones de ajuste fino (+/-) para precisión paso a paso.
//
//   Para que los botones sean CONTINUOS (el reporte de la cámara puede oscilar
//   mecánicamente al releer), el componente mantiene un "objetivo" interno
//   durante la interacción y solo se re-sincroniza con el `value` real (prop)
//   tras quedar inactivo un momento. Así cada clic avanza un paso estable
//   sobre el objetivo, no sobre la lectura real oscilante.

interface TiltSliderProps {
  value: string;
  onChange: (v: string) => void;
  onCommit: (angle: number) => void;
  min?: number;
  max?: number;
  /** Paso de los botones de ajuste fino (en grados). Default: 1 */
  fineStep?: number;
  /** Milisegundos de inactividad tras los cuales se re-sincroniza con el valor real */
  resyncMs?: number;
  label?: string;
  hint?: string;
}

export function TiltSlider({
  value,
  onChange,
  onCommit,
  min = -90,
  max = 90,
  fineStep = 1,
  resyncMs = 1500,
  label = "Inclinación de cámara (°)",
  hint,
}: TiltSliderProps) {
  // Objetivo interno que se mantiene estable durante la interacción del usuario
  const [inner, setInner] = useState<string | null>(null);
  const resyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cuando el valor real cambia desde fuera y NO hay interacción, borrar el objetivo
  const prevValue = useRef(value);
  useEffect(() => {
    if (prevValue.current !== value && !inner) {
      prevValue.current = value;
    }
    return () => {
      if (resyncTimer.current) clearTimeout(resyncTimer.current);
    };
  }, [value, inner]);

  const display = inner ?? value;
  const raw = Number(display);
  const num = Number.isNaN(raw) ? 0 : raw;
  const span = max - min;
  const clamped = Math.round(Math.min(Math.max(num, min), max));
  const norm = span === 0 ? 0.5 : (max - clamped) / span; // 0 abajo, 1 arriba

  // Reinicia el objetivo interno para seguir al valor real tras pausa
  const scheduleResync = () => {
    if (resyncTimer.current) clearTimeout(resyncTimer.current);
    resyncTimer.current = setTimeout(() => setInner(null), resyncMs);
  };

  const beginInteraction = (nextStr: string) => {
    setInner(nextStr);
    prevValue.current = nextStr;
    onChange(nextStr);
    scheduleResync();
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    beginInteraction(v === "" ? "" : String(Number(v)));
  };

  const handleDone = () => {
    const val = Number.isNaN(Number(display)) ? 0 : Number(display);
    onCommit(val);
  };

  const nudge = (delta: number) => {
    const base = Number.isNaN(num) ? 0 : num;
    // Recorta a 1 decimal para pasos continuos estables (sin oscilación)
    const next = Math.round((Math.min(Math.max(base + delta, min), max)) * 10) / 10;
    beginInteraction(String(next));
    onCommit(next);
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-semibold text-text-100/50 uppercase tracking-widest">
          {label}
        </span>
        {hint && (
          <span className="text-[9px] text-text-100/40" title={hint}>
            ({min}° a {max}° · + abajo / − arriba)
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* ── Barra vertical ── */}
        <div className="relative h-36 w-8 select-none touch-none">
          {/* Pista */}
          <div className="absolute inset-y-0 left-1/2 w-1.5 -translate-x-1/2 rounded-full bg-bg-300" />
          {/* Marca del centro (0 = horizontal) */}
          <div className="absolute top-1/2 left-0 right-0 h-px -translate-y-1/2 bg-text-100/30" />
          {/* Relleno desde el centro */}
          <div
            className={`absolute left-1/2 w-1.5 -translate-x-1/2 rounded-full ${
              num >= 0 ? "bottom-1/2 bg-emerald-400" : "top-1/2 bg-red-400"
            }`}
            style={{ height: `${Math.abs(norm - 0.5) * 100}%` }}
          />
          {/* Puntero */}
          <div
            className="absolute left-1/2 z-10 h-4 w-8 -translate-x-1/2 -translate-y-1/2 rounded-sm border border-emerald-400/70 bg-bg-100 shadow"
            style={{ top: `${norm * 100}%` }}
          />
          {/* Etiquetas de extremos */}
          <span className="absolute -left-0.5 -top-3 text-[8px] font-mono text-text-100/40">−{Math.abs(min)}°</span>
          <span className="absolute -left-1 -bottom-3 text-[8px] font-mono text-text-100/40">+{max}°</span>
          {/* Range nativo (interacción) */}
          <input
            type="range"
            min={min}
            max={max}
            step={1}
            value={clamped}
            onInput={handleInput}
            onChange={handleInput}
            onPointerUp={handleDone}
            onKeyUp={handleDone}
            aria-label={label}
            className="absolute inset-0 z-20 h-full w-full cursor-ns-resize opacity-0 [writing-mode:vertical-lr] [direction:ltr]"
          />
        </div>

        {/* ── Controles numéricos y botones de ajuste fino ── */}
        <div className="flex flex-col items-center gap-1">
          <button
            type="button"
            onClick={() => nudge(-fineStep)}
            title={`Subir ${fineStep}° (mira arriba)`}
            className="flex h-6 w-12 items-center justify-center rounded-md bg-bg-200/50 border border-border/60 text-red-400/80 hover:bg-bg-200 hover:text-red-300 transition-colors"
          >
            <IconChevronUp size={14} />
          </button>
          <input
            type="number"
            min={min}
            max={max}
            step={fineStep}
            value={display}
            onChange={(e) => beginInteraction(e.target.value)}
            onBlur={handleDone}
            onKeyDown={(e) => { if (e.key === "Enter") handleDone(); }}
            className="w-16 shrink-0 text-center text-[13px] font-mono font-bold bg-bg-200/50 border border-border/60 rounded-md px-1 py-0.5 text-text-100 tabular-nums focus:outline-none focus:border-emerald-500/60"
          />
          <button
            type="button"
            onClick={() => nudge(fineStep)}
            title={`Bajar ${fineStep}° (mira abajo)`}
            className="flex h-6 w-12 items-center justify-center rounded-md bg-bg-200/50 border border-border/60 text-emerald-400/80 hover:bg-bg-200 hover:text-emerald-300 transition-colors"
          >
            <IconChevronDown size={14} />
          </button>
          <span className="text-[9px] font-semibold text-text-100/40 uppercase tracking-wider">
            ±{fineStep}°
          </span>
        </div>
      </div>
    </div>
  );
}
