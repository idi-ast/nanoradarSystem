export interface Empresa {
  id: number;
  nombre: string;
  rut: string;
  direccion: string;
  telefono: string;
  email: string;
  principal: boolean;
}

export interface UsuarioEmpresa {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  role_id: number;
  idEmpresa: number;
}

export interface DispositivoEmpresa {
  id: number;
  modelo: string;
  serial: string | null;
  status: boolean;
  categoria: string | null;
  tipo_radar: string;
  id_empresa: number;
}

export interface EmpresaProfile {
  empresa: Empresa;
  usuarios: UsuarioEmpresa[];
  dispositivos: DispositivoEmpresa[];
}
