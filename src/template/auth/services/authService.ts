import { apiSystem } from "@/apis";
import type {
  LoginFormData,
  RegisterFormData,
  ForgotPasswordFormData,
  ResetPasswordFormData,
  AuthResponse,
} from "../types";

export const authService = {
  async login(data: LoginFormData): Promise<AuthResponse> {
    try {
      const response = await apiSystem.post<any>("/authenticated", {
        username: data.email, // el backend requiere username
        password: data.password,
      });

      // Validamos cómo viene el token (string directo o en data)
      const tokenData = response.data;
      const token = typeof tokenData === "string" ? tokenData : (tokenData?.token || String(tokenData));
      const cleanToken = token.replace(/"/g, "");

      if (cleanToken && cleanToken !== "undefined" && cleanToken !== "null") {
        localStorage.setItem("access_token", cleanToken);
        apiSystem.setHeader("Authorization", `Bearer ${cleanToken}`);

        // Guardar role_id si viene en la respuesta del login
        const roleId = tokenData?.user?.role_id;
        if (roleId !== undefined && roleId !== null) {
          localStorage.setItem("auth_role_id", String(roleId));
        }

        let user = null;
        try {
          // Obtener usuarios para buscar los datos del usuario actual
          const usersResponse = await apiSystem.get<any>("/usuarios");
          const users = usersResponse.data?.data || [];
          user = users.find((u: any) => u.email === data.email);
        } catch (error) {
          console.warn("No se pudieron obtener los datos de usuario", error);
        }

        return {
          success: true,
          message: "Login exitoso",
          user: user
            ? {
                id: String(user.id),
                email: user.email,
                name: `${user.nombre} ${user.apellido}`,
              }
            : {
                id: "1",
                email: data.email,
                name: "Admin User",
              },
        };
      }

      return {
        success: false,
        message: "No se recibió un token válido.",
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Error al iniciar sesión",
      };
    }
  },

  async register(_data: RegisterFormData): Promise<AuthResponse> {
    return { success: false, message: "Registro no disponible en este sistema." };
  },

  async forgotPassword(_data: ForgotPasswordFormData): Promise<AuthResponse> {
    return { success: false, message: "Recuperación de contraseña no disponible." };
  },

  async resetPassword(_data: ResetPasswordFormData): Promise<AuthResponse> {
    return { success: false, message: "Restablecimiento de contraseña no disponible." };
  },

  async logout(): Promise<void> {
    localStorage.removeItem("access_token");
    localStorage.removeItem("auth_role_id");
    apiSystem.removeHeader("Authorization");
  },

  async verifySession(): Promise<AuthResponse> {
    const token = localStorage.getItem("access_token");
    if (!token) {
      return { success: false, message: "No hay sesión activa." };
    }

    try {
      apiSystem.setHeader("Authorization", `Bearer ${token}`);
      await apiSystem.get<any>("/verify-token");
      
      // Podríamos obtener la info del usuario decodificando el token 
      // o haciendo una petición a /usuarios similar a login, pero por ahora
      // basta con saber que el token es válido:
      return { success: true };
    } catch (error) {
      return { success: false, message: "Token inválido." };
    }
  },

  async refreshToken(): Promise<AuthResponse> {
    // Si no hay endpoint para refrescar token, simplemente lo verificamos.
    return this.verifySession();
  },
};
