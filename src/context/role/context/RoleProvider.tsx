import { useState, useEffect, type ReactNode } from "react";
import { RoleContext } from "./RoleContext";
import { ROLES, ROLE_STORAGE_KEY } from "../types";
import type { RoleId } from "../types";

function parseRoleId(value: string | null): RoleId | null {
  const parsed = value ? parseInt(value, 10) : NaN;
  return parsed === 1 || parsed === 2 || parsed === 3 ? (parsed as RoleId) : null;
}

export function RoleProvider({ children }: { children: ReactNode }) {
  const [roleId, setRoleIdState] = useState<RoleId | null>(() =>
    parseRoleId(localStorage.getItem(ROLE_STORAGE_KEY)),
  );

  const setRoleId = (id: RoleId | null) => {
    setRoleIdState(id);
    if (id !== null) {
      localStorage.setItem(ROLE_STORAGE_KEY, String(id));
    } else {
      localStorage.removeItem(ROLE_STORAGE_KEY);
    }
  };

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === ROLE_STORAGE_KEY) {
        setRoleIdState(parseRoleId(e.newValue));
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const isSuperAdmin = roleId === ROLES.SUPER_ADMIN;
  const isAdmin = roleId === ROLES.ADMIN;
  const isCliente = roleId === ROLES.CLIENTE;

  const canAccess = (minRole: RoleId) => roleId !== null && roleId <= minRole;

  return (
    <RoleContext.Provider
      value={{ roleId, isSuperAdmin, isAdmin, isCliente, canAccess, setRoleId }}
    >
      {children}
    </RoleContext.Provider>
  );
}
