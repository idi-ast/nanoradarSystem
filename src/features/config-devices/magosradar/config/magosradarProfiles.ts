/**
 * Perfiles para MagosRadar.
 * Se cargan desde la API (GET /api-system/perfiles-magos).
 * Se incluye siempre la opción "Personalizado" para configuración manual.
 */
import { usePerfilesMagos } from "../hooks/usePerfilMagos";
import type { PerfilMagos } from "../../types/ConfigServices.type";

export interface MagosradarProfileValues {
  grado: number;
  apertura: number;
  radio: number;
  color: string;
  rcs?: number | null;
  snr?: number | null;
  speed?: number | null;
  maxSpeed?: number | null;
  heading?: number | null;
  trackColor?: string | null;
  minTrackPoints?: number | null;
  associationDist?: number | null;
  ttl?: number | null;
  coastTtl?: number | null;
  stationaryTtl?: number | null;
  emaSmooth?: number | null;
  velSmooth?: number | null;
  maxDetections?: number | null;
  clusterDist?: number | null;
  minConfidence?: number | null;
  confidenceWindow?: number | null;
  elevacion?: number | null;
  altitud?: number | null;
  frecuencia?: number | null;
  potencia?: number | null;
  // ── Macro-parámetros ──
  modo_operacion?: string | null;
  sensibilidad?: number | null;
  persistencia?: number | null;
}

export interface MagosradarProfile {
  id: string;
  name: string;
  description: string;
  values: MagosradarProfileValues;
  /** Indica si es el perfil por defecto del backend */
  isDefault?: boolean;
}

/** Perfil "Personalizado" — siempre presente */
const CUSTOM_PROFILE: MagosradarProfile = {
  id: "custom",
  name: "Personalizado",
  description: "Sin valores predefinidos — configura manualmente",
  values: {
    grado: 0,
    apertura: 360,
    radio: 100,
    color: "#f43f5e",
    rcs: null,
    snr: null,
    speed: null,
    maxSpeed: null,
    heading: null,
    trackColor: null,
    minTrackPoints: null,
    associationDist: null,
    ttl: null,
    coastTtl: null,
    stationaryTtl: null,
    emaSmooth: null,
    velSmooth: null,
    maxDetections: null,
    clusterDist: null,
    minConfidence: null,
    confidenceWindow: null,
    elevacion: null,
    altitud: null,
    frecuencia: null,
    potencia: null,
    modo_operacion: "personalizado",
    sensibilidad: 3,
    persistencia: 3,
  },
};

/** Convierte un PerfilMagos de la API al formato interno */
function apiToProfile(p: PerfilMagos): MagosradarProfile {
  return {
    id: String(p.id),
    name: p.nombre,
    description: p.descripcion,
    isDefault: p.is_default,
    values: {
      grado: 0,
      apertura: 360,
      radio: 100,
      color: p.trackColor ?? "#f43f5e",
      rcs: p.rcs ?? null,
      snr: p.snr ?? null,
      speed: p.speed ?? null,
      maxSpeed: p.maxSpeed ?? null,
      heading: p.heading ?? null,
      trackColor: p.trackColor ?? null,
      minTrackPoints: p.minTrackPoints ?? null,
      associationDist: p.associationDist ?? null,
      ttl: p.ttl ?? null,
      coastTtl: p.coastTtl ?? null,
      stationaryTtl: p.stationaryTtl ?? null,
      emaSmooth: p.emaSmooth ?? null,
      velSmooth: p.velSmooth ?? null,
      maxDetections: p.maxDetections ?? null,
      clusterDist: p.clusterDist ?? null,
      minConfidence: p.minConfidence ?? null,
      confidenceWindow: p.confidenceWindow ?? null,
      elevacion: null,
      altitud: null,
      frecuencia: null,
      potencia: null,
      modo_operacion: p.modo_operacion ?? "personalizado",
      sensibilidad: p.sensibilidad ?? 3,
      persistencia: p.persistencia ?? 3,
    },
  };
}

/**
 * Hook que retorna la lista de perfiles (Personalizado + los de la API).
 */
export function useMagosradarProfiles() {
  const { data: apiProfiles, isLoading, error } = usePerfilesMagos();

  const profiles: MagosradarProfile[] = [
    CUSTOM_PROFILE,
    ...(apiProfiles ?? []).map(apiToProfile),
  ];

  return { profiles, isLoading, error };
}

/** Retorna un perfil por ID desde la lista de perfiles */
export function findProfileById(
  profiles: MagosradarProfile[],
  id: string,
): MagosradarProfile | undefined {
  return profiles.find((p) => p.id === id);
}
