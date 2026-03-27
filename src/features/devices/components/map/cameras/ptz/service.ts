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

export { PTZ_SPEED_X, PTZ_SPEED_Y };
