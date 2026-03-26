import { createContext } from "react";
import type { RoleContextValue } from "../types";

export const RoleContext = createContext<RoleContextValue>({
  roleId: null,
  isSuperAdmin: false,
  isAdmin: false,
  isCliente: false,
  canAccess: () => false,
  setRoleId: () => {},
});
