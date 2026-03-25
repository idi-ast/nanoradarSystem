import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Boat3DConfig } from "../components/map/boatSingleRenderer";
import { DEFAULT_BOAT3D_CONFIG } from "../components/map/boatSingleRenderer";

/**
 * Modelo 3D por defecto para cada categoría de detección.
 * Claves = id de ZONE_DETECTION_CATEGORIES.
 */
export const DEFAULT_CATEGORY_MODELS: Record<number, string> = {
  1: "/3d/glb/people.glb",
  2: "/3d/glb/cargo_ship.glb",
  3: "/3d/glb/car2.glb",
  4: "/3d/glb/pet.glb",
  5: "/3d/glb/dron.glb",
};

interface TargetVisualState {
  /** ID de categoría por defecto (ZONE_DETECTION_CATEGORIES). 2 = Barco */
  defaultCategoriaDeteccion: number;
  /**
   * Modo 3D para todos los targets.
   * false = alto rendimiento (icono 2D, por defecto).
   * true  = modelo 3D con iluminación y orientación correcta.
   */
  use3DBoat: boolean;
  /** Configuración global del renderer 3D */
  boat3DConfig: Boat3DConfig;
  /** Modelo GLB asignado a cada categoría de detección (catId → path) */
  categoryModels: Record<number, string>;
}

interface TargetVisualStore extends TargetVisualState {
  setDefaultCategoria: (id: number) => void;
  set3DBoat: (value: boolean) => void;
  setBoat3DConfig: (cfg: Partial<Boat3DConfig>) => void;
  setCategoryModel: (catId: number, path: string) => void;
  reset: () => void;
}

const DEFAULTS: TargetVisualState = {
  defaultCategoriaDeteccion: 2, // Barco
  use3DBoat: false,             // alto rendimiento por defecto
  boat3DConfig: { ...DEFAULT_BOAT3D_CONFIG },
  categoryModels: { ...DEFAULT_CATEGORY_MODELS },
};

export const useTargetVisualStore = create<TargetVisualStore>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      setDefaultCategoria: (id) => set({ defaultCategoriaDeteccion: id }),
      set3DBoat: (value) => set({ use3DBoat: value }),
      setBoat3DConfig: (cfg) =>
        set((s) => ({ boat3DConfig: { ...s.boat3DConfig, ...cfg } })),
      setCategoryModel: (catId, path) =>
        set((s) => ({ categoryModels: { ...s.categoryModels, [catId]: path } })),
      reset: () => set(DEFAULTS),
    }),
    { name: "target-visual-prefs" },
  ),
);
