import { apiSystem } from "@/apis";
import type { Camaras } from "../../types/ConfigServices.type";

export type CamaraPayload = Pick<
  Camaras,
  | "nombre"
  | "direccionIp"
  | "channel"
  | "subtype"
  | "azimut"
  | "usuario"
  | "password"
  | "color"
  | "grado"
  | "radio"
  | "apertura"
  | "url_stream"
  | "tipo"
>;

export const camaraService = {
  updateCamara: async (id: number, payload: CamaraPayload): Promise<Camaras> => {
    const res = await apiSystem.put<Camaras>(`/camaras/${id}`, payload);
    return res.data;
  },

  createCamara: async (payload: CamaraPayload): Promise<Camaras> => {
    const res = await apiSystem.post<Camaras>("/camaras", payload);
    return res.data;
  },

  deleteCamara: async (id: number): Promise<void> => {
    await apiSystem.delete(`/camaras/${id}`);
  },
};
