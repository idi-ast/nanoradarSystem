import type { DeviceVisibility } from "./DevicesOverlay";

/**
 * ID de la capa sentinel invisible que actúa como límite superior para todas
 * las capas GL de dispositivos (rings, beam, pulse, FOV de cámaras).
 * Todas las capas de dispositivos usan `beforeId={DEVICES_BELOW_LAYER_ID}`
 * para insertarse DEBAJO de este ancla, garantizando que zonas y targets
 * (que se montan sin beforeId) queden siempre POR ENCIMA.
 */
export const DEVICES_BELOW_LAYER_ID = "device-layers-upper-bound";

export const NR_PALETTE = [
  { primary: "#b6fa16", pulse: "#c5ff73" },
  { primary: "#fa7a16", pulse: "#ffb347" },
  { primary: "#a855f7", pulse: "#c084fc" },
  { primary: "#06b6d4", pulse: "#67e8f9" },
  { primary: "#ec4899", pulse: "#f9a8d4" },
];

export const ALL_VISIBLE: DeviceVisibility = {
  hiddenNanoradares: new Set(),
  hiddenSpotters: new Set(),
  hiddenCamaras: new Set(),
};
