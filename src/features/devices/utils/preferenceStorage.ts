import { createJSONStorage } from "zustand/middleware";

/** Los cambios de estado runtime no deben reescribir preferencias idénticas. */
export const preferenceStorage = createJSONStorage(() => ({
  getItem: (name: string) => localStorage.getItem(name),
  setItem: (name: string, value: string) => {
    if (localStorage.getItem(name) !== value) localStorage.setItem(name, value);
  },
  removeItem: (name: string) => localStorage.removeItem(name),
}));
