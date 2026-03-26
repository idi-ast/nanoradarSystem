export interface UsersType {
  data: Data[];
  message: string;
}

export interface Data {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  role_id: number;
  idEmpresa: number;
}

export interface CreateUserDto {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  role_id: number;
  idEmpresa: number;
}

export interface UpdateUserDto {
  nombre?: string;
  apellido?: string;
  email?: string;
  password?: string;
  role_id?: number;
  idEmpresa?: number;
}
