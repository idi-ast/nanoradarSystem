export interface RadarConfig {
  latitud: string;
  longitud: string;
  azimut: string;
  radio: number;
  grado: number;
  apertura: number;
}

export type DeviceFilter = "all" | "nanoRadar" | "spotter" | "magosradar";

export interface RadarTarget {
  id: string;
  lat: number;
  lon: number;
  nivel: number;
  zona: string;
  lastUpdate: number;
  deviceType: "nanoRadar" | "magosradar" | "spotter";
  /** Cada punto es [lat, lon, timestamp_ms] */
  history: [number, number, number][];
  /** Color asignado por el backend para este track (magosRadar) */
  trackColor?: string;
  /** Velocidad más reciente del track (magosRadar) */
  speed?: number;
  /** SNR — relación señal/ruido (magosRadar) */
  snr?: number;
  /** RCS — sección transversal radar (magosRadar) */
  rcs?: number;
  /** Rumbo/dirección en grados (magosRadar) */
  heading?: number;
  /** Estado del track: "tentative" | "confirmed" | "lost" (magosRadar) */
  trackState?: string;
  /** Confianza 0-100 (magosRadar) */
  confidence?: number;
  /** Indica si el objeto está detenido (magosRadar) */
  isStationary?: boolean;
}

export interface TiposAlertas {
  id: number;
  nombre: string;
  nivelCriticidad: number;
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
  /** Activar seguimiento PTZ automático al detectar tracks en esta zona */
  activarPtz?: boolean;
}

export interface CreateZonePayload {
  nombre: string;
  descripcion: string;
  idTipoAlerta: number;
  sonido?: number | null;
  destello?: boolean;
  categoriaDeteccion?: number;
  activarPtz?: boolean;
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
  activarPtz?: boolean;
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
  /** ID del track al que pertenece la detección (magosRadar) */
  trackId?: string;
  /** Orden del punto dentro del track — ordenar ascendentemente (magosRadar) */
  trackPoints?: number;
  /** Color estable asignado por el backend al track (magosRadar) */
  trackColor?: string;
  /** Velocidad del punto de detección (magosRadar) */
  speed?: number;
  /** SNR — relación señal/ruido (magosRadar) */
  snr?: number;
  /** RCS — sección transversal radar (magosRadar) */
  rcs?: number;
  /** Coordenada X cruda del sensor (magosRadar) */
  x_raw?: number;
  /** Coordenada Y cruda del sensor (magosRadar) */
  y_raw?: number;
  /** Rumbo/dirección en grados (magosRadar) */
  heading?: number;
  /** Estado del track: "tentative" | "confirmed" | "lost" (magosRadar) */
  trackState?: string;
  /** Confianza de la detección 0-100 (magosRadar) */
  confidence?: number;
  /** Indica si el objeto detectado está detenido (magosRadar) */
  isStationary?: boolean;
}

/** Evento de actividad detectado por una cámara (viene en el WS dentro de `actividad.camaras`) */
export interface CamaraActividad {
  /** IP de la cámara qued detectó el evento */
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

/** Posición individual dentro de un track MagosRadar (nuevo formato agrupado) */
export interface MagosRadarPosition {
  lat: number;
  lon: number;
  speed: number;
  heading: number;
  snr: number;
  zona: string;
  nivel: number;
  /** Timestamp Unix en segundos */
  ts: number;
}

/** Track agrupado de MagosRadar con su historial de posiciones (nuevo formato del WebSocket) */
export interface MagosRadarTrack {
  trackId: number;
  positions: MagosRadarPosition[];
}

export interface ActividadPayload {
  camaras: CamaraActividad[];
}

export interface RawRadarPayload {
  nanoRadar: RawRadarMessage[];
  /** @deprecated Formato plano antiguo — reemplazado por `magosRadar` */
  magosradar: RawRadarMessage[];
  /** Nuevo formato de tracks agrupados con array de posiciones */
  magosRadar?: MagosRadarTrack[];
  spotter: RawRadarMessage[];
  actividad?: ActividadPayload;
}
