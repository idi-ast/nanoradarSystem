import { useState, useEffect, useRef } from "react";
import { BEAM_ANIMATION } from "../config";
import { useRadarVisualStore } from "../stores/radarVisualStore";

export function useRadarAnimation(targetFps?: number): number {
  const pulseCycleMs = useRadarVisualStore((s) => s.pulseCycleMs);
  const [phase, setPhase] = useState(0);
  const rafIdRef = useRef<number | null>(null);
  const lastFrameRef = useRef(0);
  const frameIntervalMs = 1000 / (targetFps ?? BEAM_ANIMATION.TARGET_FPS);

  useEffect(() => {
    const animate = (now: number) => {
      if (now - lastFrameRef.current >= frameIntervalMs) {
        setPhase((now % pulseCycleMs) / pulseCycleMs);
        lastFrameRef.current = now;
      }
      rafIdRef.current = window.requestAnimationFrame(animate);
    };
    rafIdRef.current = window.requestAnimationFrame(animate);
    return () => {
      if (rafIdRef.current !== null) window.cancelAnimationFrame(rafIdRef.current);
    };
  }, [frameIntervalMs, pulseCycleMs]);

  return phase;
}
