import { apiSystem } from "@/apis";
import type { PerfilMagos, PerfilMagosPayload } from "../../types/ConfigServices.type";

interface ListResponse<T> {
  data: T[];
  message: string;
}

interface SingleResponse<T> {
  data: T;
  message: string;
}

export const perfilMagosService = {
  /** GET /api-system/perfiles-magos */
  list: async (): Promise<PerfilMagos[]> => {
    const res = await apiSystem.get<ListResponse<PerfilMagos>>("/perfiles-magos");
    return res.data.data;
  },

  /** POST /api-system/perfiles-magos */
  create: async (payload: PerfilMagosPayload): Promise<PerfilMagos> => {
    const res = await apiSystem.post<SingleResponse<PerfilMagos>>("/perfiles-magos", payload);
    return res.data.data;
  },

  /** GET /api-system/perfiles-magos/{id} */
  getById: async (id: number): Promise<PerfilMagos> => {
    const res = await apiSystem.get<SingleResponse<PerfilMagos>>(`/perfiles-magos/${id}`);
    return res.data.data;
  },

  /** PUT /api-system/perfiles-magos/{id} */
  update: async (id: number, payload: Partial<PerfilMagosPayload>): Promise<PerfilMagos> => {
    const res = await apiSystem.put<SingleResponse<PerfilMagos>>(`/perfiles-magos/${id}`, payload);
    return res.data.data;
  },

  /** DELETE /api-system/perfiles-magos/{id} */
  delete: async (id: number): Promise<void> => {
    await apiSystem.delete(`/perfiles-magos/${id}`);
  },
};
