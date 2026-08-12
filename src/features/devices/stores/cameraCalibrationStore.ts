import { create } from "zustand";
import { apiSystem } from "@/apis/apiSystem";

/** Resultado de una calibración */
export interface CalibrationResult {
  bearing: number;
  distance_m: number;
  recommended_azimut: number;
  recommended_height: number | null;
  recommended_max_range: number;
  tilt_angle_used: number | null;
  /** Pan normalizado ONVIF [0,1] para apuntar al punto */
  pan?: number;
  /** Tilt normalizado ONVIF [0,1] */
  tilt?: number;
  /** Zoom normalizado ONVIF [0,1] */
  zoom?: number;
}

/** Cobertura de una zona con activarPtz respecto a la calibración actual */
export interface ZoneCoverage {
  nombre: string;
  priority: number;
  covered: boolean;
  pan_deg: number;
  pan: number;
  tilt: number;
  dist_center_m: number;
  dist_min_m: number;
  dist_max_m: number;
}

/** Posición home óptima (centroide ponderado por prioridad) */
export interface HomePosition {
  lat: number;
  lon: number;
  pan_deg: number;
  pan: number;
  tilt: number;
  distance_m: number;
}

/** Estado de calibración + cobertura devuelto por /calibration-status */
export interface CalibrationStatus {
  azimut: number;
  lat: number;
  lon: number;
  altura_m: number;
  invert_pan: boolean;
  invert_tilt: boolean;
  zones: ZoneCoverage[];
  covered_count: number;
  total_zones: number;
  all_covered: boolean;
  warnings: string[];
  home: HomePosition | null;
}

interface CameraCalibrationState {
  /** Cámara actualmente en modo calibración (ID de la cámara) */
  calibratingCameraId: number | null;
  /** Si es PTZ (true) o cámara fija (false) */
  calibratingIsPtz: boolean;
  /** Resultado de la última calibración */
  lastResult: CalibrationResult | null;
  /** Coordenadas del punto clickeado en el mapa */
  clickPoint: { lat: number; lon: number } | null;
  /** Bearing en vivo (vista previa) de la línea de boresight durante la calibración */
  previewBearing: number | null;
  /** Estado de cobertura de zonas (calibration-status) */
  calibrationStatus: CalibrationStatus | null;
  /**
   * Modo de calibración:
   * - "goto": al hacer clic en el mapa, la cámara GIRA hacia el punto
   * - "setPointZero": al hacer clic en el mapa, se FIJA el punto 0 (azimut)
   */
  mode: "goto" | "setPointZero";

  /** Activa el modo calibración para una cámara */
  startCalibrating: (cameraId: number, isPtz: boolean) => void;
  /** Desactiva el modo calibración */
  stopCalibrating: () => void;
  /** Guarda el resultado de una calibración */
  setResult: (result: CalibrationResult) => void;
  /** Guarda el punto clickeado */
  setClickPoint: (point: { lat: number; lon: number } | null) => void;
  /** Actualiza el bearing de la vista previa en vivo */
  setPreviewBearing: (bearing: number | null) => void;
  /** Cambia el modo de calibración */
  setMode: (mode: "goto" | "setPointZero") => void;
  /** Guarda el estado de cobertura */
  setCalibrationStatus: (status: CalibrationStatus | null) => void;
  /** Consulta el estado de cobertura desde el backend */
  refreshCalibrationStatus: (cameraId: number) => Promise<CalibrationStatus | null>;
}

export const useCameraCalibrationStore = create<CameraCalibrationState>()(
  (set, get) => ({
    calibratingCameraId: null,
    calibratingIsPtz: false,
    lastResult: null,
    clickPoint: null,
    previewBearing: null,
    calibrationStatus: null,
    mode: "goto",

    startCalibrating: (cameraId, isPtz) => {
      if (isPtz) {
        // Pausar el auto-tracking para que no interfiera con la calibración.
        apiSystem
          .post(`/ptz/${cameraId}/pause-tracking`)
          .catch(() => {});
        // Cargar estado de cobertura actual.
        get().refreshCalibrationStatus(cameraId);
      }
      set({
        calibratingCameraId: cameraId,
        calibratingIsPtz: isPtz,
        lastResult: null,
        clickPoint: null,
        previewBearing: null,
        calibrationStatus: null,
        mode: "goto",
      });
    },

    stopCalibrating: () => {
      const { calibratingCameraId, calibratingIsPtz } = get();
      if (calibratingIsPtz && calibratingCameraId !== null) {
        // Reanudar el auto-tracking al salir del modo calibración.
        apiSystem
          .post(`/ptz/${calibratingCameraId}/resume-tracking`)
          .catch(() => {});
      }
      set({
        calibratingCameraId: null,
        calibratingIsPtz: false,
        lastResult: null,
        clickPoint: null,
        previewBearing: null,
        calibrationStatus: null,
        mode: "goto",
      });
    },

    setResult: (result) => set({ lastResult: result }),

    setClickPoint: (point) => set({ clickPoint: point }),

    setPreviewBearing: (bearing) => set({ previewBearing: bearing }),

    setMode: (mode) => set({ mode }),

    setCalibrationStatus: (status) => set({ calibrationStatus: status }),

    refreshCalibrationStatus: async (cameraId) => {
      try {
        const response = await apiSystem.get<CalibrationStatus>(
          `/ptz/${cameraId}/calibration-status`,
        );
        if (response.ok && response.data) {
          set({ calibrationStatus: response.data });
          return response.data;
        }
        return null;
      } catch {
        return null;
      }
    },
  }),
);
