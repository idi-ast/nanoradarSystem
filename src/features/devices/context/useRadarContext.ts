import { useContext } from "react";
import { RadarContext, RadarTargetsContext, RadarStableTargetsContext } from "./radarContextDef";
import type { RadarContextValue, RadarTargetsContextValue, RadarStableTargetsContextValue } from "./radarContextDef";

/**
 * Datos estáticos: config, zonas, dibujo.
 * NO re-renderiza cuando llegan nuevos targets del WebSocket.
 */
export function useRadarContext(): RadarContextValue {
  const ctx = useContext(RadarContext);
  if (!ctx) {
    throw new Error("useRadarContext debe usarse dentro de <RadarProvider>");
  }
  return ctx;
}

/**
 * Datos de alta frecuencia: targets detectados por el radar (WebSocket).
 * Solo los componentes que lo usen re-renderizarán con cada actualización.
 */
export function useRadarTargets(): RadarTargetsContextValue {
  const ctx = useContext(RadarTargetsContext);
  if (!ctx) {
    throw new Error("useRadarTargets debe usarse dentro de <RadarProvider>");
  }
  return ctx;
}

/**
 * Targets de baja frecuencia: la referencia del array SOLO cambia cuando
 * el conjunto de IDs cambia (nueva detección o target perdido).
 * Movimiento de coordenadas NO dispara re-renders en el componente suscrito.
 * Ideal para listas de detección en la barra lateral.
 */
export function useRadarStableTargets(): RadarStableTargetsContextValue {
  const ctx = useContext(RadarStableTargetsContext);
  if (!ctx) {
    throw new Error("useRadarStableTargets debe usarse dentro de <RadarProvider>");
  }
  return ctx;
}
