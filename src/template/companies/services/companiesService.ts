import { apiSystem } from "@/apis";
import type { Empresa, UsuarioEmpresa, DispositivoEmpresa } from "../types";

interface ApiListResponse<T> {
  data: T[];
  message: string;
}

interface ApiItemResponse<T> {
  data: T;
  message: string;
}

export interface CreateUserForEmpresaDto {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  role_id: number;
  idEmpresa: number;
}

export const companiesService = {
  getEmpresas: async (): Promise<Empresa[]> => {
    const res = await apiSystem.get<ApiListResponse<Empresa>>("/empresas");
    return res.data.data;
  },

  getEmpresa: async (id: number): Promise<Empresa> => {
    const res = await apiSystem.get<ApiItemResponse<Empresa>>(`/empresas/${id}`);
    return res.data.data;
  },

  createEmpresa: async (empresa: Omit<Empresa, "id">): Promise<Empresa> => {
    const res = await apiSystem.post<ApiItemResponse<Empresa>>("/empresas", empresa);
    return res.data.data;
  },

  getEmpresaUsers: async (): Promise<UsuarioEmpresa[]> => {
    const res = await apiSystem.get<ApiListResponse<UsuarioEmpresa>>("/usuarios");
    return res.data.data;
  },

  getEmpresaDispositivos: async (): Promise<DispositivoEmpresa[]> => {
    const res = await apiSystem.get<ApiListResponse<DispositivoEmpresa>>("/dispositivos");
    return res.data.data;
  },

  createUserForEmpresa: async (userData: CreateUserForEmpresaDto): Promise<UsuarioEmpresa> => {
    const res = await apiSystem.post<ApiItemResponse<UsuarioEmpresa>>("/usuarios", userData);
    return res.data.data;
  },
};