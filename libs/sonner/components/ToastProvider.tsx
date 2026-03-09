import { Toaster } from "sonner";
import type { ToastProviderProps } from "../types";

export function ToastProvider({
  position = "top-right",
  richColors = true,
  expand = false,
  duration = 4000,
  closeButton = true,
}: ToastProviderProps) {
  return (
    <Toaster
      position={position}
      richColors={richColors}
      expand={expand}
      duration={duration}
      closeButton={closeButton}
      toastOptions={{
        className: "sonner-toast",
      }}
      style={{
        // Evita que el contenedor de Sonner cause scroll
        position: "fixed",
        zIndex: 9999,
      }}
      containerAriaLabel="Notificaciones"
    />
  );
}
