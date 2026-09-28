import { apiSystem } from "@/apis";
import type {
  Empresa,
  UsuarioEmpresa,
  DispositivoEmpresa,
  CreateUserForEmpresaDto,
  UpdateEmpresaDto,
} from "../types";

interface ApiListResponse<T> {
  data: T[];
  message: string;
}

interface ApiItemResponse<T> {
  data: T;
  message: string;
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

  updateEmpresa: async (id: number, payload: UpdateEmpresaDto): Promise<Empresa> => {
    const res = await apiSystem.put<ApiItemResponse<Empresa>>(`/empresas/${id}`, payload);
    return res.data.data;
  },

  deleteEmpresa: async (id: number): Promise<void> => {
    await apiSystem.delete(`/empresas/${id}`);
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