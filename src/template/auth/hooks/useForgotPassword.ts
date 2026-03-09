import { useState, useCallback } from "react";
import { authService } from "../services";
import type { ForgotPasswordFormData } from "../types";

interface UseForgotPasswordReturn {
  email: string;
  isLoading: boolean;
  error: string | null;
  isSuccess: boolean;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

export function useForgotPassword(): UseForgotPasswordReturn {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setIsSuccess(false);

      if (!email.trim()) {
        setError("El email es requerido");
        return;
      }

      setIsLoading(true);

      try {
        const data: ForgotPasswordFormData = { email };
        await authService.forgotPassword(data);
        setIsSuccess(true);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Error al enviar email de recuperación"
        );
      } finally {
        setIsLoading(false);
      }
    },
    [email]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setEmail("");
    setError(null);
    setIsSuccess(false);
  }, []);

  return {
    email,
    isLoading,
    error,
    isSuccess,
    handleChange,
    handleSubmit,
    clearError,
    reset,
  };
}
