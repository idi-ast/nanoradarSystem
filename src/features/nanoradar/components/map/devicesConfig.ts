import type { DeviceVisibility } from "./DevicesOverlay";

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
