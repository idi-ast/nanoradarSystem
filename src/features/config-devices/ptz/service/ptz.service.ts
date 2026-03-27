import { apiSystem } from "@/apis";
import type { Ptz } from "../../types/ConfigServices.type";

export type PtzPayload = Pick<
  Ptz,
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
> & {
  latitud: string;
  longitud: string;
  idEmpresa?: number;
};

export const ptzService = {
  updatePtz: async (id: number, payload: PtzPayload): Promise<Ptz> => {
    const res = await apiSystem.put<Ptz>(`/ptz/${id}`, payload);
    return res.data;
  },

  createPtz: async (payload: PtzPayload): Promise<Ptz> => {
    const res = await apiSystem.post<Ptz>("/ptz", payload);
    return res.data;
  },

  deletePtz: async (id: number): Promise<void> => {
    await apiSystem.delete(`/ptz/${id}`);
  },
};
