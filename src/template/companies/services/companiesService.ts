import { apiClient } from '@/apis/apiClient';
import type { Company, User } from '../types';

export const companiesService = {
  // Obtener todas las compañías (con estadísticas)
  getAllCompanies: async (): Promise<Company[]> => {
    const response = await apiClient.get<Company[]>('/companies/all');
    return response.data;
  },

  // Obtener detalles de una compañía
  getCompanyDetails: async (companyId: number): Promise<Company> => {
    const response = await apiClient.get<Company>(`/companies/${companyId}`);
    return response.data;
  },

  // Obtener usuarios de una compañía
  getCompanyUsers: async (companyId: number): Promise<User[]> => {
    const response = await apiClient.get<User[]>(`/companies/${companyId}/users`);
    return response.data;
  },
};
