import { apiClient } from '@/apis/apiClient';
import type { UserProfile } from '../types';

export const userProfileService = {
  // Obtener perfil completo del usuario autenticado
  getUserProfile: async (): Promise<UserProfile> => {
    const response = await apiClient.get<UserProfile>('/companies/user/profile');
    return response.data;
  },
};
