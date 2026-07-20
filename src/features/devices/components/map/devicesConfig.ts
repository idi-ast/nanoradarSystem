import type { DeviceVisibility } from "./DevicesOverlay";

export const DEVICES_BELOW_LAYER_ID = "device-layers-upper-bound";

export const NR_PALETTE = [
  { primary: "#b6fa16", pulse: "#c5ff73" },
  { primary: "#fa7a16", pulse: "#ffb347" },
  { primary: "#a855f7", pulse: "#c084fc" },
  { primary: "#06b6d4", pulse: "#67e8f9" },
  { primary: "#ec4899", pulse: "#f9a8d4" },
];

export const MG_PALETTE = [
  { primary: "#f43f5e", pulse: "#fb7185" },
  { primary: "#8b5cf6", pulse: "#a78bfa" },
  { primary: "#14b8a6", pulse: "#5eead4" },
  { primary: "#f97316", pulse: "#fb923c" },
  { primary: "#eab308", pulse: "#facc15" },
];

export const ALL_VISIBLE: DeviceVisibility = {
  hiddenNanoradares: new Set(),
  hiddenMagosradares: new Set(),
  hiddenSpotters: new Set(),
  hiddenCamaras: new Set(),
  hiddenPtz: new Set(),
};
