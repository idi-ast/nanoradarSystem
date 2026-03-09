import { apiClient } from '@/apis/apiClient';
import type { Service } from '../types';

export const servicesPanelService = {
  // Obtener servicios del usuario autenticado
  getUserServices: async (): Promise<Service[]> => {
    const response = await apiClient.get<Service[]>('/companies/user/services');
    return response.data;
  },

  // Obtener servicios de una compañía específica para el usuario autenticado
  getUserServicesByCompany: async (companyId: number): Promise<Service[]> => {
    const response = await apiClient.get<Service[]>(`/companies/user/services/${companyId}`);
    return response.data;
  },
};
