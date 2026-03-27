import { apiSystem } from "@/apis";
import { PTZ_DURATION, PTZ_SPEED } from "./constants";

export async function ptzMove(
  ptz_id: number,
  pan: number,
  tilt: number,
  zoom = 0,
) {
  try {
    await apiSystem.post("/ptz/move-timed", {
      ptz_id,
      pan,
      tilt,
      zoom,
      duration: PTZ_DURATION,
    });
  } catch (e) {
    console.error("PTZ move", e);
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


export { PTZ_SPEED };
