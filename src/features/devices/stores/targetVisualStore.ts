import { create } from "zustand";
import { persist } from "zustand/middleware";

interface TargetVisualState {
  /** ID de categoría por defecto (ZONE_DETECTION_CATEGORIES). 2 = Barco */
  defaultCategoriaDeteccion: number;
}

interface TargetVisualStore extends TargetVisualState {
  setDefaultCategoria: (id: number) => void;
  reset: () => void;
}

const DEFAULTS: TargetVisualState = {
  defaultCategoriaDeteccion: 2, // Barco
};

export const useTargetVisualStore = create<TargetVisualStore>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      setDefaultCategoria: (id) => set({ defaultCategoriaDeteccion: id }),
      reset: () => set(DEFAULTS),
    }),
    { name: "target-visual-prefs" },
  ),
);
