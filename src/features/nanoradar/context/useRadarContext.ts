import { useContext } from "react";
import { RadarContext } from "./radarContextDef";
import type { RadarContextValue } from "./radarContextDef";

/**
 * Hook de consumo del contexto del radar.
 * Debe usarse dentro de <RadarProvider>.
 */
export function useRadarContext(): RadarContextValue {
  const ctx = useContext(RadarContext);
  if (!ctx) {
    throw new Error("useRadarContext debe usarse dentro de <RadarProvider>");
  }
  return ctx;
}
