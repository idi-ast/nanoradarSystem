import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiSystem } from "@/apis/apiSystem";
import {
  useCameraCalibrationStore,
  type CalibrationResult,
  type CalibrationStatus,
} from "../stores/cameraCalibrationStore";

interface UseCameraCalibrationReturn {
  /** Si hay alguna cámara en modo calibración */
  isCalibrating: boolean;
  /** ID de la cámara en calibración */
  calibratingCameraId: number | null;
  /** Resultado de la última calibración */
  lastResult: CalibrationResult | null;
  /** Punto GPS clickeado */
  clickPoint: { lat: number; lon: number } | null;
  /** Estado de cobertura de zonas */
  calibrationStatus: CalibrationStatus | null;

  /** Entra en modo calibración para una cámara */
  startCalibrating: (cameraId: number, isPtz: boolean) => void;
  /** Sale del modo calibración */
  stopCalibrating: () => void;

  /** Actualiza el bearing de la vista previa en vivo */
  setPreviewBearing: (bearing: number | null) => void;

  /** Consulta el estado de calibración/cobertura desde el backend */
  fetchCalibrationStatus: (cameraId: number) => Promise<CalibrationStatus | null>;

  /**
   * Calcula la calibración para una cámara (solo vista previa, no mueve).
   */
  calibrate: (
    cameraId: number,
    isPtz: boolean,
    clickLat: number,
    clickLon: number,
  ) => Promise<CalibrationResult | null>;

  /**
   * GIRA físicamente la cámara para apuntar al punto clickeado (goTo).
   * Solo disponible para cámaras PTZ.
   */
  gotoGps: (
    cameraId: number,
    clickLat: number,
    clickLon: number,
  ) => Promise<boolean>;

  /**
   * Fija el PUNTO 0 (azimut) de la cámara. La cámara debe estar apuntando
   * físicamente al punto indicado.
   * Solo disponible para cámaras PTZ.
   */
  setPointZero: (
    cameraId: number,
    clickLat: number,
    clickLon: number,
  ) => Promise<boolean>;

  /**
   * Alias de setPointZero + centrar la cámara (compatibilidad).
   */
  applyCalibration: (
    cameraId: number,
    clickLat: number,
    clickLon: number,
  ) => Promise<boolean>;
}

export function useCameraCalibration(): UseCameraCalibrationReturn {
  const queryClient = useQueryClient();
  const {
    calibratingCameraId,
    lastResult,
    clickPoint,
    calibrationStatus,
    startCalibrating,
    stopCalibrating,
    setResult,
    setClickPoint,
    setPreviewBearing,
    refreshCalibrationStatus,
  } = useCameraCalibrationStore();

  const isCalibrating = calibratingCameraId !== null;

  const fetchCalibrationStatus = useCallback(
    async (cameraId: number): Promise<CalibrationStatus | null> =>
      refreshCalibrationStatus(cameraId),
    [refreshCalibrationStatus],
  );

  const calibrate = useCallback(
    async (
      cameraId: number,
      isPtz: boolean,
      clickLat: number,
      clickLon: number,
    ): Promise<CalibrationResult | null> => {
      try {
        const endpoint = isPtz
          ? `/ptz/${cameraId}/calibrate`
          : `/camaras/${cameraId}/calibrate`;

        setClickPoint({ lat: clickLat, lon: clickLon });

        const response = await apiSystem.post<CalibrationResult & { status: string }>(
          endpoint,
          { click_lat: clickLat, click_lon: clickLon },
        );

        if (response.ok && response.data) {
          setResult(response.data);
          // Vista previa en vivo: la línea de boresight apunta al nuevo bearing
          setPreviewBearing(response.data.bearing);
          return response.data;
        }

        toast.error("Error al calcular la calibración");
        return null;
      } catch (err) {
        console.error("Error en calibración:", err);
        toast.error("Error de red al calibrar");
        return null;
      }
    },
    [setResult, setClickPoint, setPreviewBearing],
  );

  const gotoGps = useCallback(
    async (
      cameraId: number,
      clickLat: number,
      clickLon: number,
    ): Promise<boolean> => {
      try {
        setClickPoint({ lat: clickLat, lon: clickLon });

        const response = await apiSystem.post<{
          status: string;
          pan: number;
          tilt: number;
          zoom: number;
          bearing: number;
          distance_m: number;
          target_bearing: number;
          azimut: number;
        }>(`/ptz/${cameraId}/goto-gps`, {
          click_lat: clickLat,
          click_lon: clickLon,
        });

        if (response.ok && response.data) {
          // Guardar resultado para que la línea al punto se dibuje
          setResult({
            bearing: response.data.bearing,
            distance_m: response.data.distance_m,
            recommended_azimut: response.data.azimut,
            recommended_height: null,
            recommended_max_range: 1000,
            tilt_angle_used: null,
            pan: response.data.pan,
            tilt: response.data.tilt,
            zoom: response.data.zoom,
          });
          setPreviewBearing(response.data.target_bearing);
          toast.success(
            `Cámara girando: ${response.data.target_bearing.toFixed(1)}° | pan ${response.data.pan.toFixed(3)}`,
          );
          return true;
        }

        toast.error("Error al girar la cámara");
        return false;
      } catch (err) {
        console.error("Error en goto-gps:", err);
        toast.error("Error de red al girar la cámara");
        return false;
      }
    },
    [setClickPoint, setResult, setPreviewBearing],
  );

  const setPointZero = useCallback(
    async (
      cameraId: number,
      clickLat: number,
      clickLon: number,
    ): Promise<boolean> => {
      try {
        setClickPoint({ lat: clickLat, lon: clickLon });

        const response = await apiSystem.post<{
          status: string;
          message: string;
          old_azimut: string;
          new_azimut: number;
          pointing_bearing: number;
          computed_height: number | null;
          altitud_guardada: string;
        }>(`/ptz/${cameraId}/set-point-zero`, {
          click_lat: clickLat,
          click_lon: clickLon,
        });

        if (response.ok && response.data) {
          // La cámara queda apuntando al punto; actualizar la visión en vivo
          if (response.data.pointing_bearing !== undefined) {
            setPreviewBearing(response.data.pointing_bearing);
          }
          const heightMsg =
            response.data.computed_height !== null &&
            response.data.computed_height !== undefined
              ? ` | altura ${response.data.computed_height.toFixed(1)}m`
              : "";
          toast.success(
            (response.data?.message ?? "Punto 0 fijado") + heightMsg,
          );
          // Refrescar la config para reflejar el nuevo azimut y altitud
          queryClient.invalidateQueries({ queryKey: ["config-devices"] });
          // Refrescar el estado de cobertura con el nuevo azimut
          refreshCalibrationStatus(cameraId);
          return true;
        }

        toast.error("Error al fijar el punto 0");
        return false;
      } catch (err) {
        console.error("Error al fijar punto 0:", err);
        toast.error("Error de red al fijar el punto 0");
        return false;
      }
    },
    [setClickPoint, setPreviewBearing, queryClient, refreshCalibrationStatus],
  );

  const applyCalibration = useCallback(
    async (
      cameraId: number,
      clickLat: number,
      clickLon: number,
    ): Promise<boolean> => {
      try {
        const response = await apiSystem.post<{
          status: string;
          message: string;
        }>(`/ptz/${cameraId}/apply-calibration`, {
          click_lat: clickLat,
          click_lon: clickLon,
        });

        if (response.ok) {
          toast.success(response.data?.message ?? "Calibración aplicada");
          stopCalibrating();
          queryClient.invalidateQueries({ queryKey: ["config-devices"] });
          return true;
        }

        toast.error("Error al aplicar la calibración");
        return false;
      } catch (err) {
        console.error("Error al aplicar calibración:", err);
        toast.error("Error de red al aplicar calibración");
        return false;
      }
    },
    [stopCalibrating, queryClient],
  );

  return {
    isCalibrating,
    calibratingCameraId,
    lastResult,
    clickPoint,
    calibrationStatus,
    startCalibrating,
    stopCalibrating,
    calibrate,
    gotoGps,
    setPointZero,
    applyCalibration,
    setPreviewBearing,
    fetchCalibrationStatus,
  };
}
