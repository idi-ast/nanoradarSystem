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

export { PTZ_SPEED_X, PTZ_SPEED_Y };
