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

export interface MapCenter {
  latitude: number;
  longitude: number;
}

export interface IconStyle2D {
  /** Tamaño total del contenedor en px — inactivo */
  size: number;
  /** Tamaño del ícono SVG en px — inactivo */
  iconSize: number;
  /** Radio de borde (0–50, en %) — inactivo */
  borderRadius: number;
  /** Ancho del borde en px — inactivo */
  borderWidth: number;
  /** Color del borde — inactivo */
  borderColor: string;
  /** Color de fondo del contenedor */
  bgColor: string;
  /** Opacidad del fondo (0–1) — inactivo */
  bgOpacity: number;
  /** Color del ícono — inactivo */
  iconColor: string;
  /** Mostrar ícono SVG — inactivo */
  showIcon: boolean;

  /** Tamaño total del contenedor en px — activo */
  movingSize: number;
  /** Tamaño del ícono SVG en px — activo */
  movingIconSize: number;
  /** Radio de borde (0–50, en %) — activo */
  movingBorderRadius: number;
  /** Ancho del borde en px — activo */
  movingBorderWidth: number;
  /** Color del borde — activo */
  movingBorderColor: string;
  /** Opacidad del fondo (0–1) — activo */
  movingBgOpacity: number;
  /** Color del ícono — activo */
  movingIconColor: string;
  /** Mostrar ícono SVG — activo */
  movingShowIcon: boolean;
}

export const DEFAULT_ICON_STYLE_2D: IconStyle2D = {
  size: 38,
  iconSize: 18,
  borderRadius: 50,
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.18)",
  bgColor: "#1a1f2e",
  bgOpacity: 0.75,
  iconColor: "rgba(255,255,255,0.45)",
  showIcon: true,

  movingSize: 38,
  movingIconSize: 18,
  movingBorderRadius: 50,
  movingBorderWidth: 2,
  movingBorderColor: "#38bdf8",
  movingBgOpacity: 0.9,
  movingIconColor: "#7dd3fc",
  movingShowIcon: true,
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
  /** Estilo visual del icono 2D */
  iconStyle2D: IconStyle2D;
  /** Centro del mapa guardado por el usuario. null = usar posición por defecto del config. */
  customMapCenter: MapCenter | null;
  /** Zoom guardado por el usuario. null = usar zoom por defecto del config. */
  customMapZoom: number | null;
  /** Centro del viewport actual (runtime, no persistido). */
  currentViewportCenter: MapCenter | null;
  /** Zoom del viewport actual (runtime, no persistido). */
  currentViewportZoom: number | null;
}

interface TargetVisualStore extends TargetVisualState {
  setDefaultCategoria: (id: number) => void;
  set3DBoat: (value: boolean) => void;
  setBoat3DConfig: (cfg: Partial<Boat3DConfig>) => void;
  setCategoryModel: (catId: number, path: string) => void;
  setIconStyle2D: (style: Partial<IconStyle2D>) => void;
  setCustomMapCenter: (center: MapCenter | null) => void;
  setCustomMapZoom: (zoom: number | null) => void;
  setCurrentViewportCenter: (center: MapCenter | null) => void;
  setCurrentViewportZoom: (zoom: number | null) => void;
  reset: () => void;
}

const DEFAULTS: TargetVisualState = {
  defaultCategoriaDeteccion: 2, // Barco
  use3DBoat: false,             // alto rendimiento por defecto
  boat3DConfig: { ...DEFAULT_BOAT3D_CONFIG },
  categoryModels: { ...DEFAULT_CATEGORY_MODELS },
  iconStyle2D: { ...DEFAULT_ICON_STYLE_2D },
  customMapCenter: null,
  customMapZoom: null,
  currentViewportCenter: null,
  currentViewportZoom: null,
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
      setIconStyle2D: (style) =>
        set((s) => ({ iconStyle2D: { ...s.iconStyle2D, ...style } })),
      setCustomMapCenter: (center) => set({ customMapCenter: center }),
      setCustomMapZoom: (zoom) => set({ customMapZoom: zoom }),
      setCurrentViewportCenter: (center) => set({ currentViewportCenter: center }),
      setCurrentViewportZoom: (zoom) => set({ currentViewportZoom: zoom }),
      reset: () => set(DEFAULTS),
    }),
    {
      name: "target-visual-prefs",
      partialize: (state) => ({
        defaultCategoriaDeteccion: state.defaultCategoriaDeteccion,
        use3DBoat: state.use3DBoat,
        boat3DConfig: state.boat3DConfig,
        categoryModels: state.categoryModels,
        iconStyle2D: state.iconStyle2D,
        customMapCenter: state.customMapCenter,
        customMapZoom: state.customMapZoom,
      }),
    },
  ),
);
