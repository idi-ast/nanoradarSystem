import { create } from "zustand";
import { apiSystem } from "@/apis/apiSystem";

interface PinnedTargetStore {
  /** ID del track fijado (ej. "T12") o null si no hay ninguno */
  pinnedTrackId: string | null;
  /** Fija un track como objetivo exclusivo de la PTZ */
  pinTarget: (trackId: string) => Promise<void>;
  /** Quita el fijado; la PTZ vuelve a la selección automática */
  unpinTarget: () => Promise<void>;
}

export const usePinnedTargetStore = create<PinnedTargetStore>()((set, get) => ({
  pinnedTrackId: null,

  pinTarget: async (trackId) => {
    try {
      await apiSystem.post("/tracking/fix-target", { trackId });
      set({ pinnedTrackId: trackId });
    } catch (e) {
      console.error("fix-target", e);
    }
  },

  unpinTarget: async () => {
    try {
      await apiSystem.post("/tracking/unfix-target", {});
      set({ pinnedTrackId: null });
    } catch (e) {
      console.error("unfix-target", e);
    }
  },
}));
