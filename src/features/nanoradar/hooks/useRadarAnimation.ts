import { useState, useEffect, useRef } from "react";
import { BEAM_ANIMATION } from "../config";

/**
 * Devuelve `phase` [0, 1) actualizado al TARGET_FPS configurado mediante
 * requestAnimationFrame. Cada componente que llame a este hook tendrá su
 * propio loop — úsalo solo en los componentes de pulso animado
 * (NanoradarPulseLayer, SpotterPulseLayer) para que el resto del árbol
 * no re-renderice por la animación.
 */
export function useRadarAnimation(): number {
  const [phase, setPhase] = useState(0);
  const rafIdRef = useRef<number | null>(null);
  const lastFrameRef = useRef(0);
  const frameIntervalMs = 1000 / BEAM_ANIMATION.TARGET_FPS;

  useEffect(() => {
    const animate = (now: number) => {
      if (now - lastFrameRef.current >= frameIntervalMs) {
        setPhase((now % BEAM_ANIMATION.PULSE_CYCLE_MS) / BEAM_ANIMATION.PULSE_CYCLE_MS);
        lastFrameRef.current = now;
      }
      rafIdRef.current = window.requestAnimationFrame(animate);
    };
    rafIdRef.current = window.requestAnimationFrame(animate);
    return () => {
      if (rafIdRef.current !== null) window.cancelAnimationFrame(rafIdRef.current);
    };
  }, [frameIntervalMs]);

  return phase;
}
