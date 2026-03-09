import { apiClient } from "@/apis";
import { configServer } from "@/config/ConfigServer";
import type {
  LoginFormData,
  RegisterFormData,
  ForgotPasswordFormData,
  ResetPasswordFormData,
  AuthResponse,
} from "../types";

const { useAuthConfig } = configServer();

export const authService = {
  async login(data: LoginFormData): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>(
      `${useAuthConfig.AUTH_ENDPOINT}/login`,
      {
        email: data.email,
        password: data.password,
        service_code: import.meta.env.VITE_APP_CODE,
      }
    );
    return response.data;
  },

  async register(data: RegisterFormData): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>(
      `${useAuthConfig.AUTH_ENDPOINT}/register`,
      {
        name: data.name,
        email: data.email,
        password: data.password,
      }
    );
    return response.data;
  },

  async forgotPassword(data: ForgotPasswordFormData): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>(
      `${useAuthConfig.AUTH_ENDPOINT}/forgot-password`,
      {
        email: data.email,
      }
    );
    return response.data;
  },

  async resetPassword(data: ResetPasswordFormData): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>(
      `${useAuthConfig.AUTH_ENDPOINT}/reset-password`,
      {
        password: data.password,
        token: data.token,
      }
    );
    return response.data;
  },

  async logout(): Promise<void> {
    await apiClient.post(`${useAuthConfig.AUTH_ENDPOINT}/logout`);
  },

  async verifySession(): Promise<AuthResponse> {
    const response = await apiClient.get<AuthResponse>(
      `${useAuthConfig.AUTH_ENDPOINT}/session`
    );
    return response.data;
  },

 
  async refreshToken(): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>(
      `${useAuthConfig.AUTH_ENDPOINT}/refresh`
    );
    return response.data;
  },
};
