
export interface RadarConfig {
  latitud: string;
  longitud: string;
  azimut: string;
  radio: number;
  grado: number;
  apertura: number;
}


export interface RadarTarget {
  id: string;
  lat: number;
  lon: number;
  nivel: number;
  zona: string;
  lastUpdate: number;
  history: [number, number][];
}


export interface RadarZone {
  id?: number;
  nombre: string;
  descripcion: string;
  idTipoAlerta: number | null;
  idEmpresa?: number | null;
  poligono: {
    color: string;
    // La API puede devolver los vértices como array o como objeto indexado
    vertices: [number, number][] | Record<string, [number, number]>;
  };
}

export interface CreateZonePayload {
  nombre: string;
  descripcion: string;
  idTipoAlerta: number;
  poligono: {
    color: string;
    vertices: [number, number][];
  };
}


export interface RawRadarMessage {
  id: string | number;
  lat: number;
  lon: number;
  nivel: number;
  zona: string;
}
