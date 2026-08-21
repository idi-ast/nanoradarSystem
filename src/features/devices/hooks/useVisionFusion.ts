import { useEffect, useRef, useState } from "react";
import {
  fetchVisionFusion,
  type VisionFusionStatus,
} from "../services/visionService";

const POLL_MS = 1500;
/** La fusión se considera activa si el backend reporta datos recientes. */
const FRESH_S = 5;

interface UseVisionFusionResult {
  /** Estado crudo de la fusión (null mientras no hay datos). */
  fusion: VisionFusionStatus | null;
  /** Lock visual: la IA tiene asociado el track que la PTZ está siguiendo. */
  visualLock: boolean;
}

/**
 * Consulta periódicamente el estado de la fusión radar↔visión de una PTZ.
 * El polling solo corre mientras `active` sea true (IA encendida).
 */
export function useVisionFusion(
  ptzId: number,
  active: boolean,
): UseVisionFusionResult {
  const [fusion, setFusion] = useState<VisionFusionStatus | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    if (!active) {
      setFusion(null);
      return;
    }

    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      try {
        const status = await fetchVisionFusion(ptzId);
        if (!mounted.current) return;
        setFusion(
          status.hasData && (status.ageSec ?? Infinity) < FRESH_S
            ? status
            : null,
        );
      } catch {
        if (mounted.current) setFusion(null);
      } finally {
        if (mounted.current) timer = setTimeout(poll, POLL_MS);
      }
    };

    void poll();
    return () => {
      mounted.current = false;
      clearTimeout(timer);
    };
  }, [ptzId, active]);

  return { fusion, visualLock: Boolean(fusion?.visualLock) };
}
