import type { DeviceVisibility } from "./DevicesOverlay";
import type { Data } from "@/features/config-devices/types/ConfigServices.type";

export const DEVICES_BELOW_LAYER_ID = "device-layers-upper-bound";

/** Etiquetas legibles para cada tipo de dispositivo radar */
export const DEVICE_LABEL: Record<string, string> = {
  nanoRadar: "NanoRadar",
  magosradar: "MagosRadar",
  spotter: "Spotter",
};

/** Colores de badge para cada tipo de dispositivo radar */
export const DEVICE_COLOR: Record<string, string> = {
  nanoRadar: "bg-cyan-500/20 text-text-100 border-cyan-500/40",
  magosradar: "bg-rose-500/20 text-text-100 border-rose-500/40",
  spotter: "bg-violet-500/10 text-text-100 border-violet-500/40",
};

/** Mapeo interno: deviceType → clave del array en Data */
const TYPE_TO_DATA_KEY: Record<string, keyof Data> = {
  nanoRadar: "nanoradares",
  magosradar: "magosradares",
  spotter: "spotters",
};

/**
 * Deriva los deviceTypes activos (con al menos un dispositivo configurado)
 * a partir de la respuesta de /api-system/configuracion-general.
 */
export function getActiveDeviceTypes(configData: Data | undefined): string[] {
  if (!configData) return [];
  return Object.entries(TYPE_TO_DATA_KEY)
    .filter(([, dataKey]) => {
      const arr = configData[dataKey];
      return Array.isArray(arr) && arr.length > 0;
    })
    .map(([deviceType]) => deviceType);
}

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
