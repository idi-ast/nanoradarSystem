export { LoginPage, RegisterPage, ForgotPasswordPage } from "./pages";

export { LoginForm, RegisterForm, ForgotPasswordForm, AuthCard } from "./components";

export {
  useBetterAuth,
  useBetterSession,
  useBetterUser,
  useBetterIsAuthenticated,
  useLoginForm,
  useRegisterForm,
  useForgotPassword,
} from "./hooks";

export { authService } from "./services";

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
  LoginFormData,
  RegisterFormData,
  ForgotPasswordFormData,
  ResetPasswordFormData,
  AuthResponse,
} from "./types";
