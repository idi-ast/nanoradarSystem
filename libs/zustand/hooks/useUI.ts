import { useUIStore } from "../stores";

/**
 * Hook para controlar el sidebar
 */
export function useSidebar() {
  const {
    sidebarOpen,
    sidebarCollapsed,
    toggleSidebar,
    setSidebarCollapsed,
  } = useUIStore();

  return {
    isOpen: sidebarOpen,
    isCollapsed: sidebarCollapsed,
    toggle: toggleSidebar,
    setCollapsed: setSidebarCollapsed,
  };
}

/**
 * Hook para controlar el tema
 */
export function useTheme() {
  const theme = useUIStore((state) => state.theme);
  const setTheme = useUIStore((state) => state.setTheme);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return { theme, setTheme, toggleTheme };
}

/**
 * Hook para controlar modales
 */
export function useModal(modalId?: string) {
  const { modalOpen, openModal, closeModal } = useUIStore();

  return {
    isOpen: modalId ? modalOpen === modalId : modalOpen !== null,
    currentModal: modalOpen,
    open: (id?: string) => openModal(id ?? modalId ?? "default"),
    close: closeModal,
  };
}
