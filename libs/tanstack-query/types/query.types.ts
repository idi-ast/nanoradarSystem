// ============================================
// Tipos para Query
// ============================================

export interface QueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  [key: string]: string | number | boolean | undefined;
}

export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================
// Tipos para Sensores (ejemplo)
// ============================================

export type SensorEstado = "activo" | "inactivo" | "mantenimiento" | "error";
export type SensorTipo = "temperatura" | "humedad" | "presion" | "luminosidad";

export interface Sensor {
  id: number;
  nombre: string;
  tipo: SensorTipo;
  ubicacion: string;
  estado: SensorEstado;
  ultima_lectura?: number;
  created_at: string;
  updated_at: string;
}

export interface SensorCreate {
  nombre: string;
  tipo: SensorTipo;
  ubicacion: string;
}

export interface SensorUpdate extends Partial<SensorCreate> {
  estado?: SensorEstado;
}

export interface Lectura {
  id: number;
  sensor_id: number;
  valor: number;
  fecha: string;
}

// ============================================
// Tipos para Opciones de Query
// ============================================

export interface QueryOptions {
  enabled?: boolean;
  staleTime?: number;
  refetchOnWindowFocus?: boolean;
  retry?: number | boolean;
}
