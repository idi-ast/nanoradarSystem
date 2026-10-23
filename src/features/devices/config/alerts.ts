import type { RadarZone, TiposAlertas } from "../types";

export interface AlertLevelInfo {
  /** Nivel de criticidad (1-4). 0 si es ignorar detección o sin alerta */
  level: number;
  /** True si la zona es de tipo "Ignorar detección" o "No detección" */
  isIgnore: boolean;
}

/**
 * Determina el nivel de criticidad (1-4) y si es una zona de ignorar detección.
 *
 * Prioridad de niveles:
 * - Crítico: 4 (máxima prioridad)
 * - Alto: 3
 * - Medio: 2
 * - Bajo: 1
 * - No detección / Ignorar detección: 0 (no genera alertas ni mueve PTZ)
 */
export function getAlertLevelAndType(
  zoneOrTipo:
    | Partial<RadarZone>
    | Partial<TiposAlertas>
    | number
    | null
    | undefined,
): AlertLevelInfo {
  if (zoneOrTipo === null || zoneOrTipo === undefined) {
    return { level: 0, isIgnore: false };
  }

  let id: number | null | undefined;
  let name = "";

  if (typeof zoneOrTipo === "number") {
    id = zoneOrTipo;
  } else {
    // Si es un objeto tipo RadarZone o TiposAlertas
    id = (zoneOrTipo as TiposAlertas).id ?? (zoneOrTipo as RadarZone).idTipoAlerta;
    name = (zoneOrTipo.nombre || "").toLowerCase();
  }

  // 1. Zonas de ignorar detección o No detección (ID 6 o 1 o por nombre)
  if (
    id === 6 ||
    id === 1 ||
    name.includes("ignorar") ||
    name.includes("no deteccion") ||
    name.includes("no detección")
  ) {
    return { level: 0, isIgnore: true };
  }

  // 2. Niveles por ID estándar o por nombre
  // Crítico: máxima prioridad (4)
  if (id === 5 || name.includes("critico") || name.includes("crítico")) {
    return { level: 4, isIgnore: false };
  }

  // Alto: prioridad 3
  if (id === 4 || name.includes("alto")) {
    return { level: 3, isIgnore: false };
  }

  // Medio: prioridad 2
  if (id === 3 || name.includes("medio")) {
    return { level: 2, isIgnore: false };
  }

  // Bajo: prioridad 1
  if (id === 2 || name.includes("bajo")) {
    return { level: 1, isIgnore: false };
  }

  // Fallback por nivelCriticidad si existe
  if (typeof zoneOrTipo === "object" && "nivelCriticidad" in zoneOrTipo) {
    const raw = Number((zoneOrTipo as TiposAlertas).nivelCriticidad ?? 0);
    if (id === 6) return { level: 0, isIgnore: true };
    if (raw >= 4) return { level: 4, isIgnore: false };
    return { level: Math.max(0, raw), isIgnore: false };
  }

  return { level: 0, isIgnore: false };
}
