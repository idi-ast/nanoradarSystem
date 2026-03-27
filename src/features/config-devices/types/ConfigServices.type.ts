export interface ConfigServicesType {
  data: Data;
  message: string;
}

export interface Data {
  nanoradares: Nanoradares[];
  camaras: Camaras[];
  ptz: Ptz[];
  spotters: Spotters[];
}

export interface Spotters {
  nombre: string;
  direccionIp: string;
  model: string;
  timestamp: number;
  longitude: string;
  declination: string;
  color: string;
  serial: string;
  id: number;
  version: string;
  latitude: string;
  altitude: string;
  bearing: string;
  idEmpresa: number;
  azimut: string;
  grado: number;
  radio: number;
  apertura: number;
}

export interface Camaras {
  id: number;
  nombre: string;
  ubicacion: Ubicacion;
  direccionIp: string;
  channel: number;
  subtype: number;
  azimut: string;
  usuario: string;
  password: string;
  color: string;
  grado: number;
  radio: number;
  apertura: number;
  url_stream: string;
  tipo: string;
}


export interface Ubicacion {
  lat: string;
  lng: string;
}

export interface Ptz {
  id: number;
  nombre: string;
  ubicacion: Ubicacion;
  direccionIp: string;
  channel: number;
  subtype: number;
  azimut: string;
  usuario: string;
  password: string;
  color: string;
  grado: number;
  radio: number;
  apertura: number;
  url_stream: string;
  tipo: string;
}


export interface Nanoradares {
  nombre: string;
  direccionIp: string;
  longitud: string;
  radio: number;
  apertura: number;
  idEmpresa: number;
  id: number;
  latitud: string;
  azimut: string;
  grado: number;
  color: string;
}