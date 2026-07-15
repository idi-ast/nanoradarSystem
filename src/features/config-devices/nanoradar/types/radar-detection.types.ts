// Tipos para las detecciones del radar vía WebSocket (Socket.IO)

/** Mensaje completo recibido por el canal `radar:detection` */
export type ProcessedRadarMessage = [
  'radar:detection',
  {
    op: 'detections';
    payload: {
      timestamp: number;
      serialNumber: number;
      radarPosition: { latitude: number; longitude: number };
      detections: ProcessedDetection[];
      exception: boolean;
      meta: unknown | null;
      sendTimestamp: number;
    };
    id: number;
  }
];

/** Una detección individual procesada por el radar */
export type ProcessedDetection = {
  /** Ángulo en radianes */
  angle: number;
  /** Distancia en metros */
  range: number;
  /** Relación señal-ruido */
  snr: number;
  /** Índice Doppler */
  dopInd: number;
  /** Sección radar cruzada (Radar Cross Section) */
  rcs: number;
  /** Latitud geográfica calculada */
  latitude: number;
  /** Longitud geográfica calculada */
  longitude: number;
  /** Distancia desde el radar en metros */
  distanceFromRadar: number;
  /** Rumbo en grados (0 = Norte) */
  bearing: number;
};

/** Payload extraído del mensaje del radar */
export type RadarDetectionPayload = ProcessedRadarMessage[1]['payload'];

/** Respuesta del endpoint REST: el array completo tal cual lo devuelve la API */
export type LastDetectionRawResponse = ProcessedRadarMessage;
