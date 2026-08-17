import { apiSystem } from "@/apis";
import { PTZ_DURATION_X, PTZ_DURATION_Y, PTZ_SPEED_X, PTZ_SPEED_Y } from "./constants";

export async function ptzMove(
  ptz_id: number,
  pan: number,
  tilt: number,
  zoom = 0,
  luz?: boolean,
  limpiaVidrio?: boolean,
) {
  // Use Y-duration for pure tilt, X-duration for everything else
  const duration = pan === 0 && zoom === 0 ? PTZ_DURATION_Y : PTZ_DURATION_X;
  try {
    await apiSystem.post("/ptz/move-timed", {
      ptz_id,
      pan,
      tilt,
      zoom,
      ...(luz !== undefined && { luz }),
      ...(limpiaVidrio !== undefined && { limpiaVidrio }),
      duration,
    });
  } catch (e) {
    console.error("PTZ move", e);
  }
}

/** Toggle the PTZ light on/off */
export function ptzLuz(ptz_id: number, value: boolean) {
  return ptzMove(ptz_id, 0, 0, 0, value, undefined);
}

/** Toggle the PTZ windshield wiper on/off */
export function ptzLimpiaVidrio(ptz_id: number, value: boolean) {
  return ptzMove(ptz_id, 0, 0, 0, undefined, value);
}

/** Inicia movimiento continuo (mantener presionado). */
export async function ptzStartMove(
  ptz_id: number,
  pan: number,
  tilt: number,
  zoom = 0,
) {
  try {
    await apiSystem.post("/ptz/move", { ptz_id, pan, tilt, zoom });
  } catch (e) {
    console.error("PTZ start move", e);
  }
}


export function ptzZoom(ptz_id: number, zoom: number) {
  return ptzMove(ptz_id, 0, 0, zoom);
}

export async function ptzStop(ptz_id: number) {
  try {
    await apiSystem.get(`/ptz/stop?ptz_id=${ptz_id}`);
  } catch (e) {
    console.error("PTZ stop", e);
  }
}

export async function ptzHome(ptz_id: number) {
  try {
    await apiSystem.get(`/ptz/home?ptz_id=${ptz_id}`);
  } catch (e) {
    console.error("PTZ home", e);
  }
}

/** Apunta la cámara a un RUMBO absoluto de brújula en un solo giro. */
export async function ptzGotoBearing(
  ptz_id: number,
  bearing: number,
  tilt?: number,
  zoom?: number,
) {
  try {
    await apiSystem.post(`/ptz/${ptz_id}/goto-bearing`, {
      bearing,
      ...(tilt !== undefined && { tilt }),
      ...(zoom !== undefined && { zoom }),
    });
  } catch (e) {
    console.error("PTZ goto-bearing", e);
  }
}

/** Respuesta de /calibrate-bearing */
export interface CalibrateBearingResponse {
  status: string;
  message: string;
  old_azimut: number;
  new_azimut: number;
  bearing: number;
  current_pan_deg: number;
  current_tilt_deg: number;
  azimut_jump_deg: number;
  remounted_likely: boolean;
  grado: number;
  invert_pan: boolean;
  coverage: unknown[];
  covered_count: number;
  total_zones: number;
  all_covered: boolean;
  warnings: string[];
  recommended_home: unknown;
}

/** Calibra el azimut: la cámara debe estar apuntando físicamente a `bearing`. */
export async function ptzCalibrateBearing(
  ptz_id: number,
  bearing: number,
): Promise<{ ok: boolean; data: CalibrateBearingResponse | null }> {
  try {
    const res = await apiSystem.post<CalibrateBearingResponse>(
      `/ptz/${ptz_id}/calibrate-bearing`,
      { bearing, confirm: true },
    );
    return { ok: res.ok, data: res.data ?? null };
  } catch (e) {
    console.error("PTZ calibrate-bearing", e);
    return { ok: false, data: null };
  }
}

/** Respuesta de /detect-pan-direction */
export interface DetectPanDirectionResponse {
  pan_before: number;
  pan_after: number;
  delta_deg: number;
  detected_inverted: boolean;
  current_panInvertido: number;
  match: boolean;
  /** Presente solo si auto_fix: true y había inconsistencia */
  auto_fix_applied?: boolean;
  new_panInvertido?: number;
  old_azimut?: number;
  new_azimut?: number;
  message: string;
}

/**
 * Mueve la cámara y detecta automáticamente si `panInvertido` está bien
 * configurado. Con `auto_fix: true` corrige el flag y el azimut si es necesario.
 */
export async function ptzDetectPanDirection(
  ptz_id: number,
  auto_fix = true,
): Promise<{ ok: boolean; data: DetectPanDirectionResponse | null }> {
  try {
    const res = await apiSystem.post<DetectPanDirectionResponse>(
      `/ptz/${ptz_id}/detect-pan-direction`,
      { auto_fix, confirm: true },
    );
    return { ok: res.ok, data: res.data ?? null };
  } catch (e) {
    console.error("PTZ detect-pan-direction", e);
    return { ok: false, data: null };
  }
}

/** Respuesta de /adjust-pan-offset */
export interface AdjustPanOffsetResponse {
  status: string;
  message: string;
  old_offset: number;
  new_offset: number;
}

/**
 * Corrige un offset fijo del pan (grados a sumar al panOffset).
 * - Desviación a la DERECHA de X° → usa `+X`
 * - Desviación a la IZQUIERDA de X° → usa `-X`
 */
export async function ptzAdjustPanOffset(
  ptz_id: number,
  offset_deg: number,
): Promise<{ ok: boolean; data: AdjustPanOffsetResponse | null }> {
  try {
    const res = await apiSystem.post<AdjustPanOffsetResponse>(
      `/ptz/${ptz_id}/adjust-pan-offset`,
      { offset_deg, confirm: true },
    );
    return { ok: res.ok, data: res.data ?? null };
  } catch (e) {
    console.error("PTZ adjust-pan-offset", e);
    return { ok: false, data: null };
  }
}

/** Resultado de una prueba individual (home o 90°) en /verify-calibration */
export interface VerifyTestResult {
  target_pan: number;
  actual_pan: number;
  error_deg: number;
  ok: boolean;
}

/** Respuesta de /verify-calibration */
export interface VerifyCalibrationResponse {
  azimut: number;
  invert_pan: boolean;
  test_home: VerifyTestResult;
  test_90: VerifyTestResult;
  all_ok: boolean;
  issues: string[];
}

/**
 * Mueve la cámara a posiciones de prueba y verifica que la calibración sea
 * correcta. Si `all_ok` es false, revisar el array `issues`.
 */
export async function ptzVerifyCalibration(
  ptz_id: number,
): Promise<{ ok: boolean; data: VerifyCalibrationResponse | null }> {
  try {
    const res = await apiSystem.post<VerifyCalibrationResponse>(
      `/ptz/${ptz_id}/verify-calibration`,
    );
    return { ok: res.ok, data: res.data ?? null };
  } catch (e) {
    console.error("PTZ verify-calibration", e);
    return { ok: false, data: null };
  }
}

/** Respuesta de /diagnose-pipeline */
export interface DiagnosePipelineResponse {
  ptz: {
    id: number;
    cam_lat: number;
    cam_lon: number;
    azimut: number;
    invert_pan: boolean;
    pan_offset: number;
  };
  calculos: { bearing_grados: number; distancia_m: number };
  pan_encoder: {
    con_invert_pan_false: number;
    con_invert_pan_true: number;
    con_panInvertido_actual: number;
  };
  zona_del_punto: string | null;
  todas_las_zonas: unknown[];
  diagnostico: { tipo: string; mensaje: string }[];
}

/** Toma un punto GPS y muestra todo el cálculo interno del pipeline. */
export async function ptzDiagnosePipeline(
  ptz_id: number,
  point_lat: number,
  point_lon: number,
): Promise<{ ok: boolean; data: DiagnosePipelineResponse | null }> {
  try {
    const res = await apiSystem.post<DiagnosePipelineResponse>(
      `/ptz/diagnose-pipeline`,
      { ptz_id, point_lat, point_lon },
    );
    return { ok: res.ok, data: res.data ?? null };
  } catch (e) {
    console.error("PTZ diagnose-pipeline", e);
    return { ok: false, data: null };
  }
}

export { PTZ_SPEED_X, PTZ_SPEED_Y };
