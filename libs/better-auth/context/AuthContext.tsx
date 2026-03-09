import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { authClient, useSession as useBetterAuthSession } from "../config";
import type {
  AuthContextType,
  AuthProvider,
  SignUpCredentials,
  BetterAuthUser,
  Session,
} from "../types";

// Exportar el contexto para poder usarlo en proveedores alternativos (ej: BackdoorAuthProvider)
export const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { data: sessionData, isPending } = useBetterAuthSession();
  const [error, setError] = useState<string | null>(null);

  // Estado local para reflejar el login inmediatamente mientras better-auth
  // sincroniza su store reactivo (useBetterAuthSession) desde la cookie.
  const [localAuth, setLocalAuth] = useState<{
    user: BetterAuthUser | null;
    isAuthenticated: boolean;
  } | null>(null);

  // Verdadero mientras se intenta restaurar la sesión desde localStorage (tras F5)
  const [isRestoringSession, setIsRestoringSession] = useState<boolean>(
    () => !!localStorage.getItem("auth_token")
  );

  // Al montar (o tras un F5), si hay token en localStorage intentamos restaurar
  // la sesión llamando a getSession() — customFetchImpl ya inyecta el header.
  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) return;

    authClient.getSession().then((result) => {
      if (result?.data?.user) {
        setLocalAuth({
          user: result.data.user as BetterAuthUser,
          isAuthenticated: true,
        });
      } else {
        // Token inválido o expirado — limpiar
        localStorage.removeItem("auth_token");
      }
    }).catch(() => {
      localStorage.removeItem("auth_token");
    }).finally(() => {
      setIsRestoringSession(false);
    });
  }, []);

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      setError(null);
      // service_code se inyecta automáticamente en authClient (customFetchImpl)
      // signIn.email() retorna { data, error } — nunca lanza excepción
      const result = await authClient.signIn.email({ email, password });

      if (result.error) {
        const message = result.error.message || "Error al iniciar sesión";
        setError(message);
        throw new Error(message);
      }

      // Guardar token en localStorage para enviarlo como Authorization header
      // (las cookies cross-origin en HTTP son bloqueadas por Chrome)
      const token = (result.data as { session?: { token?: string } } | null)?.session?.token;
      if (token) {
        localStorage.setItem("auth_token", token);
      }

      // Guardar user en estado local para que isAuthenticated sea true
      // de inmediato, sin esperar que useBetterAuthSession sincronice la cookie.
      setLocalAuth({
        user: (result.data?.user as BetterAuthUser) ?? null,
        isAuthenticated: true,
      });
    },
    [],
  );

  const signInWithSocial = useCallback(async (provider: AuthProvider) => {
    setError(null);
    try {
      await authClient.signIn.social({ provider });
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  }, []);

  const signUp = useCallback(async (credentials: SignUpCredentials) => {
    setError(null);
    try {
      await authClient.signUp.email({
        email: credentials.email,
        password: credentials.password,
        name: credentials.name,
      });
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  }, []);

  const signOut = useCallback(async () => {
    setError(null);
    try {
      await authClient.signOut();
      localStorage.removeItem("auth_token");
      setLocalAuth(null);
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  }, []);

  const refreshSession = useCallback(async () => {}, []);

  // localAuth actúa como override inmediato tras el login;
  // sessionData toma el control una vez que better-auth sincroniza la cookie.
  const effectiveUser = (sessionData?.user as BetterAuthUser | null) ?? localAuth?.user ?? null;
  const effectiveSession = sessionData?.session as Session | null;
  const isAuthenticated = !!effectiveSession || (localAuth?.isAuthenticated ?? false);

  const value: AuthContextType = {
    session: effectiveSession,
    user: effectiveUser,
    isLoading: isPending || isRestoringSession,
    isAuthenticated,
    error,
    signIn: {
      email: signInWithEmail,
      social: signInWithSocial,
    },
    signUp,
    signOut,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext debe usarse dentro de AuthProvider");
  }
  return context;
}
