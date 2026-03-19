import { apiSystem } from "@/apis";
import type { Spotters } from "../../types/ConfigServices.type";

interface SpotterListResponse {
  data: Spotters[];
  message: string;
}

export type SpotterPayload = Pick<
  Spotters,
  "nombre" | "direccionIp" | "latitude" | "longitude" | "azimut" | "grado" | "radio" | "apertura" | "color"
>;

export const spotterService = {
  getSpotters: async (): Promise<Spotters[]> => {
    const res = await apiSystem.get<SpotterListResponse>("/spotter-datos");
    return res.data.data;
  },

  updateSpotter: async (id: number, payload: SpotterPayload): Promise<Spotters> => {
    const res = await apiSystem.put<Spotters>(`/spotter-datos/${id}`, payload);
    return res.data;
  },

  createSpotter: async (payload: SpotterPayload): Promise<Spotters> => {
    const res = await apiSystem.post<Spotters>("/spotter-datos", payload);
    return res.data;
  },
};
