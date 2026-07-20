import { apiSystem } from "@/apis";
import type { Magosradares } from "../../types/ConfigServices.type";

export type MagosradarPayload = Pick<
  Magosradares,
  "nombre" | "direccionIp" | "latitud" | "longitud" | "azimut" | "grado" | "radio" | "apertura" | "color"
>;

export const magosradarService = {
  updateMagosradar: async (id: number, payload: MagosradarPayload): Promise<Magosradares> => {
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
