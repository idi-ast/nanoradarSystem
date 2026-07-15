import { apiSystem } from "@/apis";
import type { Nanoradares } from "../../types/ConfigServices.type";
import type { RadarDetectionPayload, LastDetectionRawResponse } from "../types/radar-detection.types";

export type NanoradarPayload = Pick<
  Nanoradares,
  "nombre" | "direccionIp" | "latitud" | "longitud" | "azimut" | "grado" | "radio" | "apertura" | "color"
>;

const RADAR_API_BASE = import.meta.env.VITE_RADAR_API_URL ?? "http://localhost:4000/api";

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

  /**
   * Obtiene la última detección del radar vía polling REST.
   * La API devuelve el array completo `["radar:detection", { op, payload, id }]`.
   * Este método extrae y retorna solo el `payload`.
   */
  getLastDetection: async (): Promise<RadarDetectionPayload> => {
    const res = await fetch(`${RADAR_API_BASE}/radar/last-detection`);
    if (!res.ok) {
      throw new Error(`Error al obtener última detección: ${res.status} ${res.statusText}`);
    }
    const raw: LastDetectionRawResponse = await res.json();
    return raw[1].payload;
  },
};
