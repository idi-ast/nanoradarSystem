import { create } from "zustand";
import { persist, devtools } from "zustand/middleware";
import type { UserStore, User } from "../types";

/**
 * Store para gestión de usuario y autenticación
 * Persiste en localStorage automáticamente
 */
export const useUserStore = create<UserStore>()(
  devtools(
    persist(
      (set) => ({
        // Estado inicial
        user: null,
        isAuthenticated: false,
        isLoading: false,

        // Acciones
        setUser: (user: User) =>
          set(
            { user, isAuthenticated: true, isLoading: false },
            false,
            "setUser"
          ),

        updateUser: (data: Partial<User>) =>
          set(
            (state) => ({
              user: state.user ? { ...state.user, ...data } : null,
            }),
            false,
            "updateUser"
          ),

        logout: () =>
          set(
            { user: null, isAuthenticated: false },
            false,
            "logout"
          ),

        setLoading: (isLoading: boolean) =>
          set({ isLoading }, false, "setLoading"),
      }),
      {
        name: "user-storage", // Nombre en localStorage
        partialize: (state) => ({
          user: state.user,
          isAuthenticated: state.isAuthenticated,
        }),
      }
    ),
    { name: "UserStore" }
  )
);
