import { createAuthClient } from "better-auth/react";
import type { AuthConfig } from "../types";

const defaultConfig: AuthConfig = {
  baseUrl: import.meta.env.VITE_AUTH_URL || "http://localhost:8000",
  callbackUrl: import.meta.env.VITE_AUTH_CALLBACK_URL || "/",
};

/**
 * Interceptor de fetch para better-auth:
 * - Inyecta `service_code` en el body de /sign-in/email
 * - Normaliza la respuesta de error del servidor para que better-auth
 *   pueda leer el campo `error` como `message`
 */
const customFetchImpl = async (
  url: URL | string | Request,
  init?: RequestInit
): Promise<Response> => {
  const urlStr = url.toString();

  // Inyectar Authorization header si hay token guardado (fallback a cookies)
  const token = localStorage.getItem("auth_token");
  if (token) {
    init = {
      ...init,
      headers: {
        ...((init?.headers as Record<string, string>) || {}),
        Authorization: `Bearer ${token}`,
      },
    };
  }

  if (urlStr.includes("/sign-in/email")) {
    // Inyectar service_code en el body
    if (init?.body) {
      try {
        const body = JSON.parse(init.body as string) as Record<string, unknown>;
        init = {
          ...init,
          body: JSON.stringify({
            ...body,
            service_code: import.meta.env.VITE_APP_CODE,
          }),
        };
      } catch { /* ignorar si el body no es JSON */ }
    }

    const response = await fetch(url, init);

    if (!response.ok) {
      // Leer el body del error y normalizar { error: "..." } → { message: "..." }
      // para que better-auth lo exponga en result.error.message
      const errorData = await response
        .json()
        .catch(() => ({}) as Record<string, string>) as Record<string, string>;

      if (errorData.error && !errorData.message) {
        errorData.message = errorData.error;
      }

      return new Response(JSON.stringify(errorData), {
        status: response.status,
        statusText: response.statusText,
        headers: { "Content-Type": "application/json" },
      });
    }

    return response;
  }

  return fetch(url, init);
};

/**
 * Cliente de Better Auth configurado
 */
export const authClient = createAuthClient({
  baseURL: defaultConfig.baseUrl,
  fetchOptions: {
    credentials: "include",
    customFetchImpl,
  },
});

/**
 * Accesos directos al cliente
 */
export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
} = authClient;

export { defaultConfig as authConfig };
