export type {
  BetterAuthUser,
  Session,
  SessionData,
  AuthProvider,
  SignInCredentials,
  SignUpCredentials,
  AuthState,
  AuthActions,
  AuthContextType,
  AuthConfig,
} from "@/libs/better-auth";

export interface LoginFormData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}

export interface ForgotPasswordFormData {
  email: string;
}

export interface ResetPasswordFormData {
  password: string;
  confirmPassword: string;
  token: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  user?: {
    id: string;
    email: string;
    name: string;
  };
}
