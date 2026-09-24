import { apiSystem } from "@/apis";
import type {
  Categoria,
  Dispositivo,
  DispositivoPayload,
  DispositivoUpdatePayload,
  TipoDispositivo,
} from "../types";

interface ApiListResponse<T> {
  data: T[];
  message: string;
}

interface ApiItemResponse<T> {
  data: T;
  message: string;
}

interface Empresa {
  id: number;
  nombre: string;
}

export const dispositivosService = {
  // ── Tipos de dispositivo ──
  getTiposDispositivos: async (): Promise<TipoDispositivo[]> => {
    const res = await apiSystem.get<ApiListResponse<TipoDispositivo>>("/dispositivos/tipos");
    return res.data.data;
  },

  // ── Categorías con sus tipos ──
  getCategorias: async (): Promise<Categoria[]> => {
    const res = await apiSystem.get<ApiListResponse<Categoria>>("/dispositivos/categorias");
    return res.data.data;
  },

  // ── Dispositivos (registro genérico) ──
  getDispositivos: async (params?: {
    tipo_radar?: string;
    modelo?: string;
  }): Promise<Dispositivo[]> => {
    const res = await apiSystem.get<ApiListResponse<Dispositivo>>("/dispositivos", params);
    return res.data.data;
  },

  getDispositivo: async (id: number): Promise<Dispositivo> => {
    const res = await apiSystem.get<ApiItemResponse<Dispositivo>>(`/dispositivos/${id}`);
    return res.data.data;
  },

  createDispositivo: async (payload: DispositivoPayload): Promise<Dispositivo> => {
    const res = await apiSystem.post<ApiItemResponse<Dispositivo>>("/dispositivos", payload);
    return res.data.data;
  },

  updateDispositivo: async (
    id: number,
    payload: DispositivoUpdatePayload
  ): Promise<Dispositivo> => {
    const res = await apiSystem.put<ApiItemResponse<Dispositivo>>(`/dispositivos/${id}`, payload);
    return res.data.data;
  },

  deleteDispositivo: async (id: number): Promise<void> => {
    await apiSystem.delete(`/dispositivos/${id}`);
  },

  // ── Empresas (para el selector del formulario) ──
  getEmpresas: async (): Promise<Empresa[]> => {
    const res = await apiSystem.get<ApiListResponse<Empresa>>("/empresas");
    return res.data.data;
  },
};