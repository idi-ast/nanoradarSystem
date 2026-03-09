import { apiSystem } from "@/apis/apiSystem";
import type { RadarConfig, RadarZone, CreateZonePayload } from "../types";

interface ListResponse<T> {
  data: T[];
}

// Configuración del radar
export async function fetchRadarConfig(): Promise<RadarConfig> {
  const res =
    await apiSystem.get<ListResponse<RadarConfig>>("/configuraciones");
  return res.data.data[0];
}

// Zonas de alerta
export async function fetchRadarZones(): Promise<RadarZone[]> {
  const res = await apiSystem.get<ListResponse<RadarZone>>("/zonas");
  return res.data.data;
}

export async function createRadarZone(
  payload: CreateZonePayload,
): Promise<RadarZone> {
  const res = await apiSystem.post<RadarZone>("/zonas", payload);
  return res.data;
}
