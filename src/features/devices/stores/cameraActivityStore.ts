import { create } from "zustand";
import { persist } from "zustand/middleware";

interface CameraActivityStore {
  enabled: Record<number, boolean>;
  /** Suspensión GLOBAL del activity tracking (ej. durante calibración PTZ) */
  suspended: boolean;
  setSuspended: (value: boolean) => void;
  setEnabled: (cameraId: number, value: boolean) => void;
  isEnabled: (cameraId: number) => boolean;
}

export const useCameraActivityStore = create<CameraActivityStore>()(
  persist(
    (set, get) => ({
      enabled: {},
      suspended: false,
      setSuspended: (value) => set({ suspended: value }),
      setEnabled: (cameraId, value) =>
        set((state) => ({ enabled: { ...state.enabled, [cameraId]: value } })),
      isEnabled: (cameraId) =>
        !get().suspended && (get().enabled[cameraId] ?? true),
    }),
    // `suspended` es estado de sesión: no debe persistirse entre recargas
    {
      name: "camera-activity-prefs",
      partialize: (state) => ({ enabled: state.enabled }),
    },
  ),
);
