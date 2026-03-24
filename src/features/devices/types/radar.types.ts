export interface RadarConfig {
  latitud: string;
  longitud: string;
  azimut: string;
  radio: number;
  grado: number;
  apertura: number;
}

export type DeviceFilter = "all" | "nanoRadar" | "spotter";

export interface RadarTarget {
  id: string;
  lat: number;
  lon: number;
  nivel: number;
  zona: string;
  lastUpdate: number;
  deviceType: "nanoRadar" | "spotter";
  /** Cada punto es [lat, lon, timestamp_ms] */
  history: [number, number, number][];
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
  sonido: number | null;
  /** Activar destello de pantalla (bordes parpadeantes) al detectar entrada a la zona */
  destello?: boolean;
  /** Categoría del icono de detección: corresponde al id de ZONE_DETECTION_CATEGORIES */
  categoriaDeteccion?: number;
}

export interface CreateZonePayload {
  nombre: string;
  descripcion: string;
  idTipoAlerta: number;
  sonido?: number | null;
  destello?: boolean;
  categoriaDeteccion?: number;
  poligono: {
    color: string;
    vertices: [number, number][];
  };
}

export interface UpdateZonePayload {
  nombre: string;
  descripcion: string;
  idTipoAlerta: number;
  sonido?: number | null;
  destello?: boolean;
  categoriaDeteccion?: number;
  poligono: {
    color: string;
    vertices: [number, number][] | Record<string, [number, number]>;
  };
}

export interface RawRadarMessage {
  id: string | number;
  lat: number;
  lon: number;
  nivel: number;
  zona: string;
}

/** Evento de actividad detectado por una cámara (viene en el WS dentro de `actividad.camaras`) */
export interface CamaraActividad {
  /** IP de la cámara que detectó el evento */
  ip: string;
  /** Tipo de evento, ej: "CrossLineDetection", "FaceDetection" */
  tipo_evento: string;
  /** Bounding box en píxeles del frame: [x1, y1, x2, y2] — puede ser undefined si el servidor no lo envía */
  bbox?: [number, number, number, number];
  /** Tipo de objeto detectado, ej: "Vehicle", "Human" */
  objeto_tipo: string;
  /** Timestamp interno (asignado al recibir el mensaje) */
  timestamp?: number;
}

export interface ActividadPayload {
  camaras: CamaraActividad[];
}

export interface RawRadarPayload {
  nanoRadar: RawRadarMessage[];
  spotter: RawRadarMessage[];
  actividad?: ActividadPayload;
}
