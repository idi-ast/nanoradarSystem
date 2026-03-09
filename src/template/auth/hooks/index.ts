// Re-exportar hooks de la libreria
export {
  useBetterAuth,
  useBetterSession,
  useBetterUser,
  useBetterIsAuthenticated,
} from "@/libs/better-auth";

// Hooks especificos de la feature
export { useLoginForm } from "./useLoginForm";
export { useRegisterForm } from "./useRegisterForm";
export { useForgotPassword } from "./useForgotPassword";
