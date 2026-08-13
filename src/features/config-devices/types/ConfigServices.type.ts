export interface ConfigServicesType {
  data: Data;
  message: string;
}

export interface Data {
  nanoradares: Nanoradares[];
  camaras: Camaras[];
  ptz: Ptz[];
  spotters: Spotters[];
  magosradares: Magosradares[];
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
  puertoOnvif?: number;
  puertoRtsp?: number;
  channel: number;
  subtype: number;
  azimut: string;
  usuario: string;
  password: string;
  color: string;
  grado: number;
  radio: number;
  apertura: number;
  altitud?: string;
  panInvertido?: number;
  tiltInvertido?: number;
  url_stream: string;
  tipo: string;
  idEmpresa?: number;
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

export interface Magosradares {
  // Campos base
  id: number;
  idEmpresa: number;
  nombre: string;
  direccionIp: string;
  latitud: string;
  longitud: string;
  azimut: string;
  radio: number;
  grado: number;
  apertura: number;
  color: string | null;

  // Visualización / operación
  trackColor: string | null;

  // Metadatos
  enabled: number | null; // 1 o 0
  modelo: string | null;
  frecuencia: number | null;
  potencia: number | null;
  elevacion: number | null;
  altitud: number | null;
  notas: string | null;

  // Nuevos campos desde backend
  trackState?: string | null;
  confidence?: number | null;
  isStationary?: boolean | null;

  // Auto-tracking PTZ
  idPtz?: number | null;
  ptzAutoTracking?: boolean;

  // ── Toggle sin filtro ──
  sinFiltro?: number | null;
  // ── Modo espejo (orientación) ──
  espejoX?: number | null;
  espejoY?: number | null;
  // ── Tracking manual ──
  trackingManual?: number | null;
  snr?: number | null;
  rcs?: number | null;
  maxSpeed?: number | null;
  associationDist?: number | null;
  minTrackPoints?: number | null;
  ttl?: number | null;
  stationaryTtl?: number | null;
  emaSmooth?: number | null;
  velSmooth?: number | null;
  maxDetections?: number | null;
  clusterDist?: number | null;
  // ── Zoom automático PTZ ──
  zoomAutomatico?: number | null;
}
