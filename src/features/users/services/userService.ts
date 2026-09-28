import type { UsersType, Data, CreateUserDto, UpdateUserDto } from '../types/users.types';
import { apiSystem } from '@/apis';

// El backend responde con el sobre { data, message } en todos los endpoints.
interface ApiItemResponse {
  data: Data;
  message: string;
}

export const usersService = {
  getUser: async (): Promise<UsersType> => {
    const response = await apiSystem.get<UsersType>('/usuarios');
    return response.data;
  },
  createUser: async (userData: CreateUserDto): Promise<ApiItemResponse> => {
    const response = await apiSystem.post<ApiItemResponse>('/usuarios', userData);
    return response.data;
  },
  updateUser: async (userId: number, userData: UpdateUserDto): Promise<ApiItemResponse> => {
    const response = await apiSystem.put<ApiItemResponse>(`/usuarios/${userId}`, userData);
    return response.data;
  },
  deleteUser: async (userId: number): Promise<void> => {
    await apiSystem.delete(`/usuarios/${userId}`);
  }
};
