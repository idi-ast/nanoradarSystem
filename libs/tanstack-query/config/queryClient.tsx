import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

/**
 * Configuración del QueryClient
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Datos se consideran "frescos" por 5 minutos
      staleTime: 5 * 60 * 1000,
      // Cache persiste por 30 minutos
      gcTime: 30 * 60 * 1000,
      // Reintentar 2 veces en caso de error
      retry: 2,
      // No refetch al volver a la ventana (opcional)
      refetchOnWindowFocus: false,
    },
    mutations: {
      // Mostrar errores en consola
      onError: (error) => {
        console.error("Mutation error:", error);
      },
    },
  },
});

/**
 * Provider para envolver la app
 */
interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
