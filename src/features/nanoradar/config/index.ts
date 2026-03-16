
export interface BeamConfig {
  /** FPS objetivo de la animación del haz */
  TARGET_FPS: number;
  /** Duración de un ciclo completo de pulso en ms */
  PULSE_CYCLE_MS: number;
  /** Número de ondas concéntricas simultáneas */
  WAVE_COUNT: number;
  /** Pasos por onda (precisión del círculo) */
  WAVE_STEPS: number;
  /** Número de polígonos de gradiente del sector */
  GRADIENT_STEPS: number;
}

export interface RadarColorsConfig {
  /** Color principal del haz y los anillos */
  primary: string;
  /** Color de la línea de pulso (ondas) */
  pulse: string;
  /** Color del centro (punto) del radar */
  center: string;
  /** Color de relleno del área de cobertura */
  rangeFill: string;
  /** Color de las líneas límite del sector */
  rangeLimits: string;
  /** Opacidad del relleno del área de cobertura */
  rangeFillOpacity: number;
  /** Opacidad del haz principal */
  beamOpacity: number;
}

export interface TargetColorsConfig {
  /** Color cuando el objetivo está activo/moviéndose */
  moving: string;
  /** Stroke del objetivo activo */
  movingStroke: string;
  /** Color cuando el objetivo está detenido/sin señal */
  stopped: string;
  /** Stroke del objetivo detenido */
  stoppedStroke: string;
}

export interface TargetTimingConfig {
  /** Tiempo en ms sin actualización para considerar un objetivo detenido */
  TRACKING_ACTIVE_MS: number;
  /** Intervalo de refresco de color en ms */
  COLOR_REFRESH_MS: number;
  /** Tiempo en ms sin actualización para eliminar el objetivo del mapa */
  TARGET_TIMEOUT_MS: number;
  /** Máximo de puntos de historial por objetivo */
  HISTORY_MAX_POINTS: number;
}

export interface GeofenceConfig {
  /** Ventana de tiempo en ms para considerar un objetivo activo en la detección */
  ACTIVE_MS: number;
}

export interface MapConfig {
  zoom: number;
  pitch: number;
  bearing: number;
  /** Centro inicial del mapa (usado si el config del radar no está disponible aún) */
  fallbackCenter: { longitude: number; latitude: number };
}


export const BEAM_ANIMATION: BeamConfig = {
  TARGET_FPS: 60,
  PULSE_CYCLE_MS: 9_000,
  WAVE_COUNT: 7,
  WAVE_STEPS: 8,
  GRADIENT_STEPS: 6,
};

export const RADAR_COLORS: RadarColorsConfig = {
  primary: "#b6fa16",
  pulse: "#c5ff73",
  center: "#e6fa16",
  rangeFill: "#504f6e",
  rangeLimits: "#2dd4bf",
  rangeFillOpacity: 0.3,
  beamOpacity: 0.92,
};

export const TARGET_COLORS: TargetColorsConfig = {
  moving: "#22d3ee",
  movingStroke: "#7dd3fc",
  stopped: "#7a7a7a",
  stoppedStroke: "#9e9e9e",
};

export const TARGET_TIMING: TargetTimingConfig = {
  TRACKING_ACTIVE_MS: 4_000,
  COLOR_REFRESH_MS: 1_000,
  TARGET_TIMEOUT_MS: 70_000,
  HISTORY_MAX_POINTS: 500,
};

export const GEOFENCE: GeofenceConfig = {
  ACTIVE_MS: 4_000,
};

export const MAP_DEFAULTS: MapConfig = {
  zoom: 17,
  pitch: 0,
  bearing: 0,
  fallbackCenter: {
    longitude: -72.9883559747647,
    latitude: -41.46281337025373,
  },
};

// ─────────────────────────────────────────────
// INSTANCIAS DE RADAR
// Agrega aquí cada radar del sistema.
// Los datos dinámicos (latitud, longitud, radio, etc.) se cargan desde la API.
// Aquí solo se declaran las diferencias respecto a los defaults.
// ─────────────────────────────────────────────

export interface RadarInstanceConfig {
  /** Identificador único del radar */
  id: string;
  /** Nombre visible en la UI */
  label: string;
  /** URL del stream HLS de la cámara asociada (vacío string si no tiene cámara) */
  cameraUrl: string;
  /** URL del WebSocket de datos del radar */
  wsUrl: string;
  /** Sobreescrituras de animación del haz */
  beam?: Partial<BeamConfig>;
  /** Sobreescrituras de colores del radar */
  colors?: Partial<RadarColorsConfig>;
  /** Sobreescrituras de colores de objetivos */
  targetColors?: Partial<TargetColorsConfig>;
  /** Sobreescrituras de timing de objetivos */
  timing?: Partial<TargetTimingConfig>;
  /** Sobreescrituras de detección geofence */
  geofence?: Partial<GeofenceConfig>;
  /** Sobreescrituras del mapa */
  map?: Partial<Omit<MapConfig, "fallbackCenter">> & {
    fallbackCenter?: Partial<MapConfig["fallbackCenter"]>;
  };
}

/** Configuración de instancia completamente resuelta (con defaults aplicados) */
export interface ResolvedRadarConfig {
  id: string;
  label: string;
  cameraUrl: string;
  wsUrl: string;
  beam: BeamConfig;
  colors: RadarColorsConfig;
  targetColors: TargetColorsConfig;
  timing: TargetTimingConfig;
  geofence: GeofenceConfig;
  map: MapConfig;
}

/** Aplica los defaults del sistema a una instancia de radar */
export function resolveRadarConfig(
  instance: RadarInstanceConfig,
): ResolvedRadarConfig {
  return {
    id: instance.id,
    label: instance.label,
    cameraUrl: instance.cameraUrl,
    wsUrl: instance.wsUrl,
    beam: { ...BEAM_ANIMATION, ...instance.beam },
    colors: { ...RADAR_COLORS, ...instance.colors },
    targetColors: { ...TARGET_COLORS, ...instance.targetColors },
    timing: { ...TARGET_TIMING, ...instance.timing },
    geofence: { ...GEOFENCE, ...instance.geofence },
    map: {
      ...MAP_DEFAULTS,
      ...instance.map,
      fallbackCenter: {
        ...MAP_DEFAULTS.fallbackCenter,
        ...instance.map?.fallbackCenter,
      },
    },
  };
}

export const RADAR_INSTANCES: RadarInstanceConfig[] = [
  {
    id: "nanoradar-1",
    label: "NanoRadar Principal",
    cameraUrl: "http://10.30.7.14:8888/camara_dahua/video1_stream.m3u8",
    wsUrl: import.meta.env.VITE_SOCKET_URL as string,
  },
  // Para agregar un segundo radar, descomenta y ajusta solo lo que difiera:
  // {
  //   id: "nanoradar-2",
  //   label: "NanoRadar Secundario",
  //   cameraUrl: "http://10.30.7.14:8888/camara_2/stream.m3u8",
  //   wsUrl: import.meta.env.VITE_SOCKET_URL as string,
  //   colors: { primary: "#fa7a16", pulse: "#ffb347" },
  //   timing: { TARGET_TIMEOUT_MS: 60_000 },
  //   geofence: { ACTIVE_MS: 2_000 },
  //   targetColors: { moving: "#22d3ee", stopped: "#7a7a7a" },
  //   beam: { WAVE_COUNT: 7, WAVE_STEPS: 8, GRADIENT_STEPS: 2 },
  // },
];

/** Instancia activa por defecto (primer elemento de RADAR_INSTANCES) */
export const ACTIVE_RADAR = RADAR_INSTANCES[0];
