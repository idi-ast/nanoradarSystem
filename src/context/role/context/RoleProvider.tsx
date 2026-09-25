import { useState, useEffect, type ReactNode } from "react";
import { RoleContext } from "./RoleContext";
import {
  ROLES,
  ROLE_STORAGE_KEY,
  EMPRESA_STORAGE_KEY,
  EMPRESA_PRINCIPAL_STORAGE_KEY,
} from "../types";
import type { RoleId } from "../types";

function parseRoleId(value: string | null): RoleId | null {
  const parsed = value ? parseInt(value, 10) : NaN;
  return parsed === 1 || parsed === 2 || parsed === 3 ? (parsed as RoleId) : null;
}

function parseEmpresa(value: string | null): number | null {
  const parsed = value ? parseInt(value, 10) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function parseBool(value: string | null): boolean {
  return value === "true";
}

export function RoleProvider({ children }: { children: ReactNode }) {
  const [roleId, setRoleIdState] = useState<RoleId | null>(() =>
    parseRoleId(localStorage.getItem(ROLE_STORAGE_KEY)),
  );
  const [idEmpresa, setIdEmpresa] = useState<number | null>(() =>
    parseEmpresa(localStorage.getItem(EMPRESA_STORAGE_KEY)),
  );
  const [empresaEsPrincipal, setEmpresaEsPrincipalState] = useState<boolean>(() =>
    parseBool(localStorage.getItem(EMPRESA_PRINCIPAL_STORAGE_KEY)),
  );

  const setRoleId = (id: RoleId | null) => {
    setRoleIdState(id);
    if (id !== null) {
      localStorage.setItem(ROLE_STORAGE_KEY, String(id));
    } else {
      localStorage.removeItem(ROLE_STORAGE_KEY);
    }
  };

  const setRoleEmpresa = (empresaId: number | null) => {
    setIdEmpresa(empresaId);
    if (empresaId !== null) {
      localStorage.setItem(EMPRESA_STORAGE_KEY, String(empresaId));
    } else {
      localStorage.removeItem(EMPRESA_STORAGE_KEY);
    }
  };

  const setEmpresaEsPrincipal = (esPrincipal: boolean) => {
    setEmpresaEsPrincipalState(esPrincipal);
    if (esPrincipal) {
      localStorage.setItem(EMPRESA_PRINCIPAL_STORAGE_KEY, "true");
    } else {
      localStorage.removeItem(EMPRESA_PRINCIPAL_STORAGE_KEY);
    }
  };

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === ROLE_STORAGE_KEY) {
        setRoleIdState(parseRoleId(e.newValue));
      }
      if (e.key === EMPRESA_STORAGE_KEY) {
        setIdEmpresa(parseEmpresa(e.newValue));
      }
      if (e.key === EMPRESA_PRINCIPAL_STORAGE_KEY) {
        setEmpresaEsPrincipalState(parseBool(e.newValue));
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
      value={{
        roleId,
        idEmpresa,
        empresaEsPrincipal,
        isSuperAdmin,
        isAdmin,
        isCliente,
        canAccess,
        setRoleId,
        setRoleEmpresa,
        setEmpresaEsPrincipal,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}