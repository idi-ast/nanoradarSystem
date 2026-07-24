import { apiSystem } from "@/apis/apiSystem";
import type {
  RadarConfig,
  RadarZone,
  CreateZonePayload,
  UpdateZonePayload,
  TiposAlertas,
} from "../types";

interface ListResponse<T> {
  data: T[];
}

// Configuración del radar
export async function fetchRadarConfig(): Promise<RadarConfig> {
  const res =
    await apiSystem.get<ListResponse<RadarConfig>>("/configuraciones");
  return res.data.data[0];
}
// Tipos de Alertas
export async function fetchTiposAlertas(): Promise<TiposAlertas[]> {
  const res = await apiSystem.get<ListResponse<TiposAlertas>>("/tipos-alertas");
  return res.data.data;
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

export async function updateRadarZone(
  id: number,
  payload: UpdateZonePayload,
): Promise<RadarZone> {
  const res = await apiSystem.put<RadarZone>(`/zonas/${id}`, payload);
  return res.data;
}

export async function deleteRadarZone(id: number): Promise<void> {
  await apiSystem.delete(`/zonas/${id}`);
}
