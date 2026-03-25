import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Boat3DConfig } from "../components/map/boatSingleRenderer";
import { DEFAULT_BOAT3D_CONFIG } from "../components/map/boatSingleRenderer";

interface TargetVisualState {
  /** ID de categoría por defecto (ZONE_DETECTION_CATEGORIES). 2 = Barco */
  defaultCategoriaDeteccion: number;
  /**
   * Modo 3D para el marcador de barco.
   * false = alto rendimiento (icono 2D, por defecto).
   * true  = modelo 3D (OBJ) con iluminación y orientación correcta.
   */
  use3DBoat: boolean;
  /** Configuración del modelo 3D */
  boat3DConfig: Boat3DConfig;
}

interface TargetVisualStore extends TargetVisualState {
  setDefaultCategoria: (id: number) => void;
  set3DBoat: (value: boolean) => void;
  setBoat3DConfig: (cfg: Partial<Boat3DConfig>) => void;
  reset: () => void;
}

const DEFAULTS: TargetVisualState = {
  defaultCategoriaDeteccion: 2, // Barco
  use3DBoat: false,             // alto rendimiento por defecto
  boat3DConfig: { ...DEFAULT_BOAT3D_CONFIG },
};

export const useTargetVisualStore = create<TargetVisualStore>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      setDefaultCategoria: (id) => set({ defaultCategoriaDeteccion: id }),
      set3DBoat: (value) => set({ use3DBoat: value }),
      setBoat3DConfig: (cfg) =>
        set((s) => ({ boat3DConfig: { ...s.boat3DConfig, ...cfg } })),
      reset: () => set(DEFAULTS),
    }),
    { name: "target-visual-prefs" },
  ),
);
