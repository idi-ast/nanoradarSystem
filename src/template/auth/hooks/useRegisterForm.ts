import { useState, useCallback } from "react";
import { useNavigate } from "react-router";
import { useBetterAuth } from "@/libs/better-auth";
import { configServer } from "@/config/ConfigServer";
import type { RegisterFormData } from "../types";

const { useAuthConfig } = configServer();

interface UseRegisterFormReturn {
  formData: RegisterFormData;
  isLoading: boolean;
  error: string | null;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  clearError: () => void;
}

export function useRegisterForm(): UseRegisterFormReturn {
  const navigate = useNavigate();
  const { signUp, isLoading: authLoading, error: authError } = useBetterAuth();

  const [formData, setFormData] = useState<RegisterFormData>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }, []);

  const validateForm = useCallback((): string | null => {
    if (!formData.name.trim()) {
      return "El nombre es requerido";
    }
    if (!formData.email.trim()) {
      return "El email es requerido";
    }
    if (formData.password.length < 8) {
      return "La contraseña debe tener al menos 8 caracteres";
    }
    if (formData.password !== formData.confirmPassword) {
      return "Las contraseñas no coinciden";
    }
    if (!formData.acceptTerms) {
      return "Debes aceptar los términos y condiciones";
    }
    return null;
  }, [formData]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      const validationError = validateForm();
      if (validationError) {
        setError(validationError);
        return;
      }

      setIsLoading(true);

      try {
        await signUp({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        });
        navigate(useAuthConfig.AUTH_LOGIN_PATH, {
          state: { message: "Registro exitoso. Por favor inicia sesión." },
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al registrarse");
      } finally {
        setIsLoading(false);
      }
    },
    [formData, signUp, navigate, validateForm]
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
