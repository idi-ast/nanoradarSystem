import { Navigate, useLocation } from "react-router";
import { useBetterSession } from "../hooks";
import type { ReactNode } from "react";

interface ProtectedRouteProps {
  children: ReactNode;
  redirectTo?: string;
  fallback?: ReactNode;
}

/**
 * Componente para proteger rutas que requieren autenticacion
 */
export function ProtectedRoute({
  children,
  redirectTo = "/login",
  fallback = (
    <div className="bg-bg-100 text-text-100 h-screen w-screen flex items-center justify-center">
      Cargando...
    </div>
  ),
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useBetterSession();
  const location = useLocation();

  if (isLoading) {
    return <>{fallback}</>;
  }

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

interface PublicOnlyRouteProps {
  children: ReactNode;
  redirectTo?: string;
}

/**
 * Componente para rutas solo accesibles sin autenticacion
 * (ej: login, register)
 */
export function PublicOnlyRoute({
  children,
  redirectTo = "/dashboard",
}: PublicOnlyRouteProps) {
  const { isAuthenticated, isLoading } = useBetterSession();

  if (isLoading) {
    return (
      <div className="bg-bg-100 text-text-100 h-screen w-screen flex items-center justify-center">
        Cargando...
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
