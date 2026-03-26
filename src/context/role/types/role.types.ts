export type RoleId = 1 | 2 | 3;

export const ROLES = {
  SUPER_ADMIN: 1 as RoleId,
  ADMIN: 2 as RoleId,
  CLIENTE: 3 as RoleId,
} as const;

export const ROLE_STORAGE_KEY = "auth_role_id";

export interface RoleContextValue {
  roleId: RoleId | null;

  /** id 1 — puede hacer todo: crear, editar, eliminar */
  isSuperAdmin: boolean;

  /** id 2 — puede modificar parámetros: zonas, dispositivos, etc. */
  isAdmin: boolean;

  /** id 3 — solo lectura */
  isCliente: boolean;

  /**
   * Devuelve true si el usuario tiene al menos el nivel requerido.
   * Nivel 1 > 2 > 3  (menor id = más privilegios)
   *
   * Ejemplo: canAccess(ROLES.ADMIN) → true para superAdmin y admin
   */
  canAccess: (minRole: RoleId) => boolean;

  /** Actualiza el rol (llamado internamente tras login/logout) */
  setRoleId: (id: RoleId | null) => void;
}
