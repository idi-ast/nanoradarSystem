import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ZoneStyleState {
  /** Opacidad del relleno del polígono (0–1) */
  fillOpacity: number;
  /** Opacidad del trazo / borde del polígono (0–1) */
  lineOpacity: number;
  /** Grosor del trazo en píxeles (1–8) */
  lineWidth: number;
  /** Mostrar u ocultar todas las zonas del mapa */
  visible: boolean;
}

interface ZoneStyleStore extends ZoneStyleState {
  setFillOpacity: (v: number) => void;
  setLineOpacity: (v: number) => void;
  setLineWidth: (v: number) => void;
  setVisible: (v: boolean) => void;
  reset: () => void;
}

const DEFAULTS: ZoneStyleState = {
  fillOpacity: 0.3,
  lineOpacity: 1.0,
  lineWidth: 2,
  visible: true,
};

export const useZoneStyleStore = create<ZoneStyleStore>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      setFillOpacity: (v) => set({ fillOpacity: v }),
      setLineOpacity: (v) => set({ lineOpacity: v }),
      setLineWidth: (v) => set({ lineWidth: v }),
      setVisible: (v) => set({ visible: v }),
      reset: () => set(DEFAULTS),
    }),
    { name: "zone-style-prefs" }
  )
);
