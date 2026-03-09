import type { QueryParams } from "./query.types";

/**
 * Factory de Query Keys tipadas
 * Permite invalidación granular del cache
 */
export const queryKeys = {
  // Sensores
  sensores: {
    all: ["sensores"] as const,
    lists: () => [...queryKeys.sensores.all, "list"] as const,
    list: (params: QueryParams) =>
      [...queryKeys.sensores.lists(), params] as const,
    details: () => [...queryKeys.sensores.all, "detail"] as const,
    detail: (id: number) => [...queryKeys.sensores.details(), id] as const,
    lecturas: (id: number) =>
      [...queryKeys.sensores.detail(id), "lecturas"] as const,
    alertas: (id: number) =>
      [...queryKeys.sensores.detail(id), "alertas"] as const,
  },

  // Usuarios
  usuarios: {
    all: ["usuarios"] as const,
    lists: () => [...queryKeys.usuarios.all, "list"] as const,
    list: (params: QueryParams) =>
      [...queryKeys.usuarios.lists(), params] as const,
    details: () => [...queryKeys.usuarios.all, "detail"] as const,
    detail: (id: number) => [...queryKeys.usuarios.details(), id] as const,
    me: () => [...queryKeys.usuarios.all, "me"] as const,
  },

  // Auth
  auth: {
    all: ["auth"] as const,
    session: () => [...queryKeys.auth.all, "session"] as const,
  },
};

export type QueryKeys = typeof queryKeys;
