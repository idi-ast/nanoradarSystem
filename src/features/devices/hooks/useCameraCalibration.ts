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
  /** Punto GPS clickeado (modo "save") */
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
   * Calcula la calibración para una cámara fija (solo vista previa, no mueve).
   */
  calibrate: (
    cameraId: number,
    isPtz: boolean,
    clickLat: number,
    clickLon: number,
  ) => Promise<CalibrationResult | null>;

  /**
   * GIRA físicamente la cámara para apuntar al punto clickeado (goTo).
   * NO modifica la calibración. Solo disponible para cámaras PTZ.
   */
  gotoGps: (
    cameraId: number,
    clickLat: number,
    clickLon: number,
  ) => Promise<boolean>;

  /**
   * CALIBRACIÓN GUIADA (v2): GUARDA la referencia.
   * Requisito: la cámara debe estar apuntando FÍSICAMENTE al punto indicado
   * (click_lat/click_lon). Lee la posición real del encoder y deduce azimut
   * y tiltOffset. Es la ÚNICA escritura de calibración (single-write).
   */
  saveReference: (
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
          pan_deg: number;
          target_pan: number;
          current_pan: number | null;
          tilt_deg: number;
          zoom: number;
          bearing: number;
          distance_m: number;
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
            pan: response.data.pan_deg,
            tilt: response.data.tilt_deg,
            zoom: response.data.zoom,
          });
          setPreviewBearing(response.data.bearing);
          toast.success(
            `Cámara girando: ${response.data.bearing.toFixed(1)}° | pan ${response.data.pan_deg.toFixed(1)}°`,
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

  const saveReference = useCallback(
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
          old_azimut: number;
          new_azimut: number;
          tilt_offset: number;
          grado: number;
          bearing: number;
          distance_m: number;
          elevation_deg: number;
          current_pan_deg: number;
          current_tilt_deg: number;
          remounted_likely: boolean;
          azimut_jump_deg: number;
          warnings: string[];
          coverage: unknown[];
          covered_count: number;
          total_zones: number;
          all_covered: boolean;
          recommended_home: unknown;
          /** Verificación de coherencia del pipeline */
          verification?: {
            coherent: boolean;
            warning?: string;
            encoder_pan_deg?: number;
            reconstructed_bearing?: number;
            expected_bearing?: number;
            error_deg?: number;
          };
        }>(`/ptz/${cameraId}/calibrate`, {
          click_lat: clickLat,
          click_lon: clickLon,
          confirm: true,
        });

        if (response.ok && response.data) {
          const data = response.data;

          // La cámara queda apuntando al punto; actualizar la visión en vivo
          setPreviewBearing(data.bearing);

          // Resultados en el panel
          setResult({
            bearing: data.bearing,
            distance_m: data.distance_m,
            recommended_azimut: data.new_azimut,
            recommended_height: null,
            recommended_max_range: 1000,
            tilt_angle_used: data.elevation_deg,
            tilt_offset: data.tilt_offset,
            pan: data.current_pan_deg,
            tilt: data.current_tilt_deg,
            zoom: 0,
          });

          // Refrescar cobertura con el nuevo azimut
          const status = await refreshCalibrationStatus(cameraId);

          const jumpMsg =
            data.remounted_likely
              ? "  El azimut cambió más de 40°: revisa que la cámara esté apuntando al punto elegido."
              : "";
          toast.success(
            `${data.message ?? "Calibración guardada"}.${jumpMsg}`,
          );

          // Si el backend detecta incoherencia, guiar al usuario a re-detectar el pan.
          if (data.verification && !data.verification.coherent) {
            toast.warning(
              data.verification.warning ??
                "Inconsistencia detectada. Ejecuta 'Detectar dirección PAN' desde el panel de calibración.",
            );
          }

          // Refrescar la config para reflejar el nuevo azimut/tiltOffset
          queryClient.invalidateQueries({ queryKey: ["config-devices"] });
          return !!status || true;
        }

        toast.error("Error al guardar la referencia");
        return false;
      } catch (err) {
        console.error("Error en saveReference:", err);
        toast.error("Error de red al guardar la referencia");
        return false;
      }
    },
    [setClickPoint, setPreviewBearing, setResult, refreshCalibrationStatus, queryClient],
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
    saveReference,
    setPreviewBearing,
    fetchCalibrationStatus,
  };
}
