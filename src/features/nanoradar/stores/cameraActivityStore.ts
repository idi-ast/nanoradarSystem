import { create } from "zustand";
import { persist } from "zustand/middleware";

interface CameraActivityStore {
  /** mapa de cameraId → habilitado. True por defecto si no está definido */
  enabled: Record<number, boolean>;
  setEnabled: (cameraId: number, value: boolean) => void;
  isEnabled: (cameraId: number) => boolean;
}

export const useCameraActivityStore = create<CameraActivityStore>()(
  persist(
    (set, get) => ({
      enabled: {},

      setEnabled: (cameraId, value) =>
        set((state) => ({ enabled: { ...state.enabled, [cameraId]: value } })),

      /** Si no está configurada explícitamente, la actividad está ON por defecto */
      isEnabled: (cameraId) => get().enabled[cameraId] ?? true,
    }),
    { name: "camera-activity-prefs" }
  )
);
