import { useEffect } from "react";
import { IconAlertCircle, IconRefresh, IconLogout } from "@tabler/icons-react";
import { Button } from "./Button";

interface SessionExpiredModalProps {
  isOpen: boolean;
  onStay: () => void;
  onLogout: () => void;
  isRefreshing?: boolean;
}

export function SessionExpiredModal({
  isOpen,
  onStay,
  onLogout,
  isRefreshing = false,
}: SessionExpiredModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-expired-title"
    >
      <div className="w-full max-w-md bg-bg-100 rounded-2xl shadow-2xl border border-border overflow-hidden animate-in fade-in zoom-in-95">
        <div className="p-6 text-center">
          <div className="mx-auto mb-4 w-16 h-16 flex items-center justify-center">
            <IconAlertCircle className="h-8 w-8 text-amber-300" />
          </div>

          <h2
            id="session-expired-title"
            className="text-xl font-semibold text-text-100 mb-2"
          >
            Sesión por expirar
          </h2>

          <p className="text-text-300 mb-6 leading-relaxed">
            Tu sesión ha expirado por inactividad. ¿Deseas continuar en la
            aplicación?
          </p>

          <div className="flex gap-3 justify-center">
            <Button
              variant="outline"
              size="md"
              onClick={onLogout}
              leftIcon={<IconLogout className="h-4 w-4" />}
              className="flex-1"
            >
              Cerrar sesión
            </Button>
            <Button
              variant="solid"
              size="md"
              onClick={onStay}
              isLoading={isRefreshing}
              loadingText="Renovando..."
              leftIcon={
                isRefreshing ? null : <IconRefresh className="h-4 w-4" />
              }
              className="flex-1"
            >
              {isRefreshing ? "Renovando..." : "Permanecer"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
