import type { DeviceVisibility } from "./DevicesOverlay";
import type { Data } from "@/features/config-devices/types/ConfigServices.type";
import { tipoMeta } from "@/features/config-devices/dispositivos/types";

export const DEVICES_BELOW_LAYER_ID = "device-layers-upper-bound";

/** Claves UI de deviceType → nombre de tipo (tipo_dispositivos) */
const UI_KEY_TO_TIPO: Record<string, string> = {
  nanoRadar: "nano",
  magosradar: "magos",
  spotter: "spotter",
};

function metaDe(uiKey: string) {
  return tipoMeta(UI_KEY_TO_TIPO[uiKey] ?? uiKey);
}

/** Etiquetas legibles para cada tipo de dispositivo radar */
export const DEVICE_LABEL: Record<string, string> = {
  nanoRadar: metaDe("nanoRadar").label,
  magosradar: metaDe("magosradar").label,
  spotter: metaDe("spotter").label,
};

/** Colores de badge para cada tipo de dispositivo radar */
export const DEVICE_COLOR: Record<string, string> = {
  nanoRadar: metaDe("nanoRadar").badge,
  magosradar: metaDe("magosradar").badge,
  spotter: metaDe("spotter").badge,
};

/** Mapeo interno: deviceType → clave del array en Data */
const TYPE_TO_DATA_KEY: Record<string, keyof Data> = {
  nanoRadar: metaDe("nanoRadar").dataKey ?? "nanoradares",
  magosradar: metaDe("magosradar").dataKey ?? "magosradares",
  spotter: metaDe("spotter").dataKey ?? "spotters",
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
