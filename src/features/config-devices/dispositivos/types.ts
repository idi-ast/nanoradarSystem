import type { Data } from "../types/ConfigServices.type";

/**
 * Catálogo genérico de dispositivos (nueva arquitectura).
 * La relación se hace por TIPO (tipo_dispositivos) y MODELO (dispositivos),
 * no por tablas hardcodeadas.
 */

export interface TipoDispositivo {
  id: number;
  nombre: string;
  fecha_ingreso?: string | null;
}

export interface Dispositivo {
  id: number;
  id_tipo_dispositivo: number;
  /** Heredado automáticamente de tipo_dispositivos.nombre */
  tipo_radar: string;
  modelo: string;
  serial?: string | null;
  status: boolean;
  id_empresa: number;
  config: Record<string, unknown> | null;
  fecha_ingreso?: string | null;
}

export type DispositivoPayload = {
  id_tipo_dispositivo: number;
  modelo: string;
  serial?: string | null;
  status?: boolean;
  id_empresa: number;
  config?: Record<string, unknown> | null;
};

export type DispositivoUpdatePayload = Partial<DispositivoPayload>;

/**
 * Vocabulario central tipo_dispositivo → metadatos de UI.
 * Un solo lugar para labels, estilos y claves de datos legacy,
 * de modo que el resto del frontend se relacione por "tipo" y "modelo".
 */
export const TIPO_DISPOSITIVO_META: Record<
  string,
  {
    label: string;
    badge: string;
    dataKey: keyof Data | null;
  }
> = {
  nano: {
    label: "NanoRadar",
    badge: "bg-cyan-500/20 text-text-100 border-cyan-500/40",
    dataKey: "nanoradares",
  },
  magos: {
    label: "MagosRadar",
    badge: "bg-sky-500/20 text-text-100 border-sky-500/40",
    dataKey: "magosradares",
  },
  spotter: {
    label: "Spotter",
    badge: "bg-violet-500/10 text-text-100 border-violet-500/40",
    dataKey: "spotters",
  },
  ptz: {
    label: "PTZ",
    badge: "bg-amber-500/15 text-text-100 border-amber-500/40",
    dataKey: "ptz",
  },
  camara: {
    label: "Cámara",
    badge: "bg-orange-500/15 text-text-100 border-orange-500/40",
    dataKey: "camaras",
  },
  sensor: {
    label: "Sensor",
    badge: "bg-emerald-500/15 text-text-100 border-emerald-500/40",
    dataKey: null,
  },
};

export const TIPO_DISPOSITIVO_FALLBACK = {
  label: "Dispositivo",
  badge: "bg-text-100/10 text-text-100 border-text-100/30",
  dataKey: null,
} as const;

export function tipoMeta(nombre: string) {
  return TIPO_DISPOSITIVO_META[nombre] ?? TIPO_DISPOSITIVO_FALLBACK;
}

export function tipoLabel(nombre: string): string {
  return tipoMeta(nombre).label;
}

/** Verifica y devuelve un objeto JSON válido para el campo config. */
export function parseConfig(text: string): Record<string, unknown> {
  const trimmed = text.trim();
  if (!trimmed) return {};
  const parsed = JSON.parse(trimmed) as unknown;
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("config debe ser un objeto JSON válido: { clave: valor }");
  }
  return parsed as Record<string, unknown>;
}