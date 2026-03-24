import { apiSystem } from "@/apis";
import type { Nanoradares } from "../../types/ConfigServices.type";

export type NanoradarPayload = Pick<
  Nanoradares,
  "nombre" | "direccionIp" | "latitud" | "longitud" | "azimut" | "grado" | "radio" | "apertura" | "color"
>;

export const nanoradarService = {
  updateNanoradar: async (id: number, payload: NanoradarPayload): Promise<Nanoradares> => {
    const res = await apiSystem.put<Nanoradares>(`/nanoradares/${id}`, payload);
    return res.data;
  },

  createNanoradar: async (payload: NanoradarPayload): Promise<Nanoradares> => {
    const res = await apiSystem.post<Nanoradares>("/nanoradares", payload);
    return res.data;
  },

  deleteNanoradar: async (id: number): Promise<void> => {
    await apiSystem.delete(`/nanoradares/${id}`);
  },
};
