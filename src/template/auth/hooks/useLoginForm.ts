import { useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router";
import { useBetterAuth } from "@/libs/better-auth";
import type { LoginFormData } from "../types";

interface UseLoginFormReturn {
  formData: LoginFormData;
  isLoading: boolean;
  error: string | null;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  clearError: () => void;
}

export function useLoginForm(): UseLoginFormReturn {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, isLoading: authLoading, error: authError } = useBetterAuth();

  const [formData, setFormData] = useState<LoginFormData>({
    email: "",
    password: "",
    rememberMe: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as { from?: Location })?.from?.pathname || "/";

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setIsLoading(true);

      try {
        await signIn.email(formData.email, formData.password);
        navigate(from, { replace: true });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Error al iniciar sesión"
        );
      } finally {
        setIsLoading(false);
      }
    },
    [formData.email, formData.password, signIn, navigate, from]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    formData,
    isLoading: isLoading || authLoading,
    error: error || authError,
    handleChange,
    handleSubmit,
    clearError,
  };
}
