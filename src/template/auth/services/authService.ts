import { apiSystem } from "@/apis";
import type {
  LoginFormData,
  RegisterFormData,
  ForgotPasswordFormData,
  ResetPasswordFormData,
  AuthResponse,
} from "../types";

interface LoginUser {
  id: number | string;
  email?: string;
  username?: string;
  nombre?: string;
  apellido?: string;
  role_id?: number;
  empresaId?: number;
  empresaEsPrincipal?: boolean;
}
interface TokenResponse {
  access_token?: string;
  token?: string;
  refresh_token?: string;
  refreshToken?: string;
  user?: LoginUser;
}

export const authService = {
  async login(data: LoginFormData): Promise<AuthResponse> {
    let installedToken: string | undefined;
    try {
      const response = await apiSystem.post<TokenResponse | string>("/authenticated", {username:data.email,password:data.password});
      const payload = typeof response.data === 'string' ? undefined : response.data;
      const token = typeof response.data === 'string' ? response.data : payload?.access_token || payload?.token;
      if (typeof token !== 'string' || !token.trim() || token === 'undefined' || token === 'null') return {success:false,message:'No se recibió un token válido.'};
      const cleanToken = token.replace(/"/g,'').trim();
      localStorage.setItem('access_token',cleanToken);
      installedToken = cleanToken;
      apiSystem.setHeader('Authorization',`Bearer ${cleanToken}`);
      const refreshToken = payload?.refresh_token || payload?.refreshToken;
      if (refreshToken) localStorage.setItem('refresh_token',refreshToken);
      else localStorage.removeItem('refresh_token');
      // Use the authenticated identity, never a guessed user ID or user listing.
      const user = payload?.user?.id != null ? payload.user : (await apiSystem.get<{user:LoginUser}>('/verify-token')).data.user;
      if (user?.id == null) throw new Error('No se pudo verificar la identidad de la sesión.');
      if (user.role_id != null) localStorage.setItem('auth_role_id',String(user.role_id));
      if (user.empresaId != null) localStorage.setItem('auth_id_empresa',String(user.empresaId));
      if (user.empresaEsPrincipal != null) localStorage.setItem('auth_empresa_principal',String(user.empresaEsPrincipal));
      return {success:true,message:'Login exitoso',user:{id:String(user.id),email:user.email || user.username || data.email,name:[user.nombre,user.apellido].filter(Boolean).join(' ') || user.email || data.email}};
    } catch (error) {
      if (installedToken && localStorage.getItem('access_token') === installedToken) {
        localStorage.removeItem('access_token');
        apiSystem.removeHeader('Authorization');
      }
      return {success:false,message:error instanceof Error ? error.message : 'Error al iniciar sesión'};
    }
  },

  async register(_data: RegisterFormData): Promise<AuthResponse> {
    void _data;
    return { success: false, message: "Registro no disponible en este sistema." };
  },

  async forgotPassword(_data: ForgotPasswordFormData): Promise<AuthResponse> {
    void _data;
    return { success: false, message: "Recuperación de contraseña no disponible." };
  },

  async resetPassword(_data: ResetPasswordFormData): Promise<AuthResponse> {
    void _data;
    return { success: false, message: "Restablecimiento de contraseña no disponible." };
  },

  async logout(): Promise<void> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      if (localStorage.getItem("access_token")) await apiSystem.post("/logout", undefined, {signal:controller.signal});
    } catch (error) {
      // Local logout remains possible when the backend cannot be reached.
      console.warn("No se pudo confirmar el cierre de sesión en el servidor", error);
    } finally {
      clearTimeout(timeout);
      for (const key of ["access_token", "refresh_token", "auth_role_id", "auth_id_empresa", "auth_empresa_principal", "auth_user"]) localStorage.removeItem(key);
      apiSystem.removeHeader("Authorization");
    }
  },

  async verifySession(): Promise<AuthResponse> {
    const token = localStorage.getItem("access_token");
    if (!token) {
      return { success: false, message: "No hay sesión activa." };
    }

    try {
      apiSystem.setHeader("Authorization", `Bearer ${token}`);
      const response = await apiSystem.get<{access_token?: string}>("/verify-token");
      const replacement = response.data.access_token;
      if (replacement && replacement !== token && localStorage.getItem("access_token") === token) {
        localStorage.setItem("access_token", replacement);
        apiSystem.setHeader("Authorization", `Bearer ${replacement}`);
        if (typeof window !== 'undefined') window.dispatchEvent(new Event('radar-auth-token-changed'));
      }
      
      // Podríamos obtener la info del usuario decodificando el token 
      // o haciendo una petición a /usuarios similar a login, pero por ahora
      // basta con saber que el token es válido:
      return { success: true };
    } catch {
      return { success: false, message: "Token inválido." };
    }
  },

  async refreshToken(): Promise<AuthResponse> {
    // Si no hay endpoint para refrescar token, simplemente lo verificamos.
    return this.verifySession();
  },
};
