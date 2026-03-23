import { useState, useEffect, useRef } from "react";
import { BEAM_ANIMATION } from "../config";
import { useRadarVisualStore } from "../stores/radarVisualStore";

// ─── Singleton RAF ────────────────────────────────────────────────────────
// Un ÚNICO requestAnimationFrame compartido por todos los consumidores del hook.
// Elimina N bucles RAF independientes (uno por dispositivo) que antes causaban
// N×fps re-renders React/segundo (p.ej. 5 dispositivos × 60fps = 300/s).
let _phase = 0;
let _rafId: number | null = null;
let _pulseCycleMs = BEAM_ANIMATION.PULSE_CYCLE_MS;
const _listeners = new Set<(p: number) => void>();

function _loop(now: number) {
  _phase = (now % _pulseCycleMs) / _pulseCycleMs;
  _listeners.forEach((fn) => fn(_phase));
  _rafId = window.requestAnimationFrame(_loop);
}

function _attach(fn: (p: number) => void): () => void {
  _listeners.add(fn);
  if (_listeners.size === 1) {
    _rafId = window.requestAnimationFrame(_loop);
  }
  return () => {
    _listeners.delete(fn);
    if (_listeners.size === 0 && _rafId !== null) {
      window.cancelAnimationFrame(_rafId);
      _rafId = null;
    }
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────
export function useRadarAnimation(targetFps?: number): number {
  const pulseCycleMs = useRadarVisualStore((s) => s.pulseCycleMs);
  const frameIntervalMs = 1000 / (targetFps ?? BEAM_ANIMATION.TARGET_FPS);
  const lastFrameRef = useRef(0);
  const [phase, setPhase] = useState(0);

  // Sincronizar pulseCycleMs del store con el singleton
  useEffect(() => {
    _pulseCycleMs = pulseCycleMs;
  }, [pulseCycleMs]);

  useEffect(() => {
    const notify = (p: number) => {
      const now = performance.now();
      if (now - lastFrameRef.current >= frameIntervalMs) {
        setPhase(p);
        lastFrameRef.current = now;
      }
    };
    return _attach(notify);
  }, [frameIntervalMs]);

  return phase;
}
