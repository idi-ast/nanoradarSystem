/**
 * AUTH PROVIDER para sistema cerrado (sin internet).
 * Usa directamente el backend local vía authService/apiSystem.
 */

import {
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { AuthContext } from "@/libs/better-auth/context";
import type {
  AuthContextType,
  AuthProvider as AuthProviderType,
  SignUpCredentials,
  BetterAuthUser as User,
  Session,
} from "@/libs/better-auth/types";
import { authService } from "../services/authService";
import { useRole } from "@/context/role";
import type { RoleId } from "@/context/role";

const USER_STORAGE_KEY = "auth_user";

interface BackdoorAuthProviderProps {
  children: ReactNode;
}

export function BackdoorAuthProvider({ children }: BackdoorAuthProviderProps) {
  const { setRoleId } = useRole();

  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem(USER_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Reconstruir sesión desde localStorage si hay token y usuario guardados
  const storedToken = localStorage.getItem("access_token");
  const [session, setSession] = useState<Session | null>(() => {
    if (!storedToken || !user) return null;
    return {
      id: storedToken,
      userId: user?.id ?? "",
      token: storedToken,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  const buildSession = (userId: string, token: string): Session => ({
    id: token,
    userId,
    token,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    setError(null);
    setIsLoading(true);
    try {
      const result = await authService.login({ email, password });
      if (!result.success || !result.user) {
        const message = result.message || "Credenciales incorrectas";
        setError(message);
        throw new Error(message);
      }

      const token = localStorage.getItem("access_token") || result.user.id;
      const newUser: User = {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
      setUser(newUser);
      setSession(buildSession(newUser.id, token));

      const storedRoleId = localStorage.getItem("auth_role_id");
      const parsed = storedRoleId ? parseInt(storedRoleId, 10) : NaN;
      if (parsed === 1 || parsed === 2 || parsed === 3) {
        setRoleId(parsed as RoleId);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signInWithSocial = useCallback(async (_provider: AuthProviderType) => {
    setError("Login social no disponible en este sistema.");
    throw new Error("Login social no disponible en este sistema.");
  }, []);

  const signUp = useCallback(async (_credentials: SignUpCredentials) => {
    setError("Registro no disponible en este sistema.");
    throw new Error("Registro no disponible en este sistema.");
  }, []);

  const signOut = useCallback(async () => {
    setError(null);
    await authService.logout();
    setUser(null);
    setSession(null);
    localStorage.removeItem(USER_STORAGE_KEY);
    setRoleId(null);
  }, [setRoleId]);

  const refreshSession = useCallback(async () => {}, []);

  const value: AuthContextType = {
    session,
    user,
    isLoading,
    isAuthenticated: !!user && !!localStorage.getItem("access_token"),
    error,
    signIn: {
      email: signInWithEmail,
      social: signInWithSocial,
    },
    signUp,
    signOut,
    refreshSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
