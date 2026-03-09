import { Link } from "react-router";
import { IconMail, IconCheck } from "@tabler/icons-react";
import { useForgotPassword } from "../hooks";
import { configServer } from "@/config/ConfigServer";
import { Input, Label, Button, Alert } from "@/components/ui";

export function ForgotPasswordForm() {
  const {
    email,
    isLoading,
    error,
    isSuccess,
    handleChange,
    handleSubmit,
    clearError,
    reset,
  } = useForgotPassword();
  const { useAuthConfig } = configServer();

  if (isSuccess) {
    return (
      <div className="text-center space-y-4">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30">
          <IconCheck className="h-6 w-6 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h3 className="text-lg font-medium text-text-100">
            ¡Correo enviado!
          </h3>
          <p className="mt-2 text-sm text-text-200">
            Hemos enviado un enlace de recuperación a <strong>{email}</strong>.
            Por favor revisa tu bandeja de entrada.
          </p>
        </div>
        <div className="pt-4 space-y-3">
          <Button variant="outline" fullWidth onClick={reset}>
            Enviar a otro correo
          </Button>
          <Link
            to={useAuthConfig.AUTH_LOGIN_PATH}
            className="block w-full py-2.5 px-4 text-center text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="error" onClose={clearError}>
          {error}
        </Alert>
      )}

      <div>
        <Label htmlFor="email">Correo electrónico</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={handleChange}
          leftIcon={<IconMail className="h-5 w-5" />}
          placeholder="tu@email.com"
        />
      </div>

      <Button
        type="submit"
        variant="solid"
        fullWidth
        isLoading={isLoading}
        loadingText="Enviando..."
      >
        Enviar enlace de recuperación
      </Button>

      <p className="text-center text-sm text-text-200">
        <Link
          to={useAuthConfig.AUTH_LOGIN_PATH}
          className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
        >
          ← Volver al inicio de sesión
        </Link>
      </p>
    </form>
  );
}
