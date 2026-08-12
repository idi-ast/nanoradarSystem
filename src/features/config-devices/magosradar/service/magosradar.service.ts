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
  trackColor?: string | null;

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

  // ── Toggle sin filtro ──
  sinFiltro?: number | null;
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

  /** Asignar o desasignar cámara PTZ al MagosRadar */
  assignPtz: async (magosId: number, ptzId: number | null): Promise<Magosradares> => {
    const res = await apiSystem.put<Magosradares>(`/magosradares/${magosId}/ptz-assign`, { ptz_id: ptzId });
    return res.data;
  },

  /** Activar/desactivar auto-tracking */
  setAutoTracking: async (magosId: number, enabled: boolean): Promise<Magosradares> => {
    const res = await apiSystem.put<Magosradares>(`/magosradares/${magosId}/auto-tracking`, { enabled });
    return res.data;
  },

  /** Obtener estado de tracking activo (badge opcional) */
  getTrackingStatus: async (): Promise<{
    sessions: { radar_ip: string; ptz_id: number; mode: string; tracks_in_zone: number; last_command_time: number }[];
    total_active: number;
  }> => {
    const res = await apiSystem.get<{
      sessions: { radar_ip: string; ptz_id: number; mode: string; tracks_in_zone: number; last_command_time: number }[];
      total_active: number;
    }>("/tracking/status");
    return res.data;
  },
};
