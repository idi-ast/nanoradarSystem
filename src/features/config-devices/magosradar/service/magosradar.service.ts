import { apiSystem } from "@/apis";
import type { Magosradares } from "../../types/ConfigServices.type";

// Campos obligatorios para creación
export type MagosradarPayload = Pick<
  Magosradares,
  | "nombre"
  | "direccionIp"
  | "latitud"
  | "longitud"
  | "azimut"
  | "grado"
  | "radio"
  | "apertura"
  | "color"
> & {
  // Tracking (opcional)
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

  // Scoring / Confianza (opcional)
  minConfidence?: number | null;
  confidenceWindow?: number | null;
  rcsRangeRef?: number | null;

  // Metadatos (opcional)
  enabled?: number | null;
  modelo?: string | null;
  frecuencia?: number | null;
  potencia?: number | null;
  elevacion?: number | null;
  altitud?: number | null;
  notas?: string | null;

  // Nuevos campos backend
  trackState?: string | null;
  confidence?: number | null;
  isStationary?: boolean | null;
};

// Tipo para PUT: todos los campos son opcionales
export type MagosradarUpdatePayload = Partial<MagosradarPayload>;

export const magosradarService = {
  updateMagosradar: async (id: number, payload: MagosradarUpdatePayload): Promise<Magosradares> => {
    const res = await apiSystem.put<Magosradares>(`/magosradares/${id}`, payload);
    return res.data;
  },

  createMagosradar: async (payload: MagosradarPayload): Promise<Magosradares> => {
    const res = await apiSystem.post<Magosradares>("/magosradares", payload);
    return res.data;
  },

  deleteMagosradar: async (id: number): Promise<void> => {
    await apiSystem.delete(`/magosradares/${id}`);
  },
};
