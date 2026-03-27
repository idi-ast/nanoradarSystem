import type { UsersType, Data, CreateUserDto, UpdateUserDto } from '../types/users.types';
import { apiSystem } from '@/apis';

export const usersService = {
  getUser: async (): Promise<UsersType> => {
    const response = await apiSystem.get<UsersType>('/usuarios');
    return response.data;
  },
  createUser: async (userData: CreateUserDto): Promise<Data> => {
    const response = await apiSystem.post<Data>('/usuarios', userData);
    return response.data;
  },
  updateUser: async (userId: number, userData: UpdateUserDto): Promise<Data> => {
    const response = await apiSystem.put<Data>(`/usuarios/${userId}`, userData);
    return response.data;
  },
  deleteUser: async (userId: number): Promise<void> => {
    await apiSystem.delete(`/usuarios/${userId}`);
  }
};
