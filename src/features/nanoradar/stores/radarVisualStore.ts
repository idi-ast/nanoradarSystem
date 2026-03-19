import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface RadarVisualState {
  // ── Haz (Beam canvas)
  /** Mostrar/ocultar el haz canvas */
  beamShow: boolean;
  /** Opacidad de la capa raster del haz (0–1) */
  beamOpacity: number;
  /** Grados extra de apertura visual para suavizar bordes del gradiente */
  beamExtraAperture: number;
  /** Opacidad pico del centro del haz en % (0–100) */
  beamPeakOpacityPercent: number;
  /** % del radio donde comienza el desvanecimiento radial (0–100) */
  beamRadialFadeStart: number;

  // ── Pulso animado 
  /** Mostrar/ocultar ondas de pulso */
  pulseShow: boolean;
  /** Número de ondas concéntricas simultáneas */
  pulseWaveCount: number;
  /** Duración de un ciclo completo del pulso en ms */
  pulseCycleMs: number;
  /** Opacidad máxima de las ondas (0–1) */
  pulsePeakOpacity: number;
  /** Grosor máximo de las ondas en px */
  pulsePeakWidth: number;
  /** Desenfoque de las ondas */
  pulseBlur: number;

  // ── Relleno área de cobertura
  /** Opacidad del relleno del círculo de cobertura (0–1) */
  rangeFillOpacity: number;

  // ── Borde del círculo de cobertura 
  rangeBorderShow: boolean;
  rangeBorderWidth: number;
  rangeBorderOpacity: number;

  // ── Líneas de límite de apertura 
  rangeLimitsShow: boolean;
  rangeLimitsWidth: number;
  rangeLimitsOpacity: number;

  // ── Anillos concéntricos
  ringsShow: boolean;
  ringsWidth: number;
  /** Opacidad del arco exterior (fuera de la apertura) */
  ringsOpacity: number;
  /** Opacidad del arco dentro de la apertura */
  ringsArcOpacity: number;

  // ── Línea de dirección (grado)
  gradoLineShow: boolean;
  gradoLineWidth: number;
  gradoLineOpacity: number;
}

interface RadarVisualStore extends RadarVisualState {
  set: <K extends keyof RadarVisualState>(key: K, value: RadarVisualState[K]) => void;
  reset: () => void;
}

export const RADAR_VISUAL_DEFAULTS: RadarVisualState = {
  beamShow: true,
  beamOpacity: 1,
  beamExtraAperture: 0,
  beamPeakOpacityPercent: 40,
  beamRadialFadeStart: 95,

  pulseShow: true,
  pulseWaveCount: 4,
  pulseCycleMs: 9_000,
  pulsePeakOpacity: 0.24,
  pulsePeakWidth: 4,
  pulseBlur: 1,

  rangeFillOpacity: 0.07,

  rangeBorderShow: true,
  rangeBorderWidth: 1,
  rangeBorderOpacity: 0.01,

  rangeLimitsShow: true,
  rangeLimitsWidth: 1,
  rangeLimitsOpacity: 0.1,

  ringsShow: true,
  ringsWidth: 1.5,
  ringsOpacity: 0.1,
  ringsArcOpacity: 0.65,

  gradoLineShow: true,
  gradoLineWidth: 2,
  gradoLineOpacity: 0.6,
};

export const useRadarVisualStore = create<RadarVisualStore>()(
  persist(
    (set) => ({
      ...RADAR_VISUAL_DEFAULTS,
      set: (key, value) => set({ [key]: value } as Partial<RadarVisualStore>),
      reset: () => set(RADAR_VISUAL_DEFAULTS),
    }),
    { name: "radar-visual-prefs" }
  )
);
