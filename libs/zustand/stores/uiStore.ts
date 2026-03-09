import { create } from "zustand";
import { persist, devtools } from "zustand/middleware";
import type { UIStore } from "../types";

/**
 * Store para estado de UI
 */
export const useUIStore = create<UIStore>()(
  devtools(
    persist(
      (set) => ({
        // Estado inicial
        sidebarOpen: true,
        sidebarCollapsed: false,
        theme: "system",
        modalOpen: null,

        // Acciones
        toggleSidebar: () =>
          set(
            (state) => ({ sidebarOpen: !state.sidebarOpen }),
            false,
            "toggleSidebar"
          ),

        setSidebarCollapsed: (collapsed: boolean) =>
          set({ sidebarCollapsed: collapsed }, false, "setSidebarCollapsed"),

        setTheme: (theme) =>
          set({ theme }, false, "setTheme"),

        openModal: (modalId: string) =>
          set({ modalOpen: modalId }, false, "openModal"),

        closeModal: () =>
          set({ modalOpen: null }, false, "closeModal"),
      }),
      {
        name: "ui-storage",
        partialize: (state) => ({
          sidebarCollapsed: state.sidebarCollapsed,
          theme: state.theme,
        }),
      }
    ),
    { name: "UIStore" }
  )
);
