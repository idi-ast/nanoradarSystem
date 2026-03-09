import { Link } from "react-router";
import { IconMail, IconLock } from "@tabler/icons-react";
import { useLoginForm } from "../hooks";
import { configServer } from "@/config/ConfigServer";
import { Input, Label, Button, Checkbox, Alert } from "@/components/ui";

export function LoginForm() {
  const { formData, isLoading, error, handleChange, handleSubmit, clearError } =
    useLoginForm();
  const { useAuthConfig } = configServer();

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
          value={formData.email}
          onChange={handleChange}
          leftIcon={<IconMail className="h-5 w-5" />}
          placeholder="tu@email.com"
        />
      </div>

      <div>
        <Label htmlFor="password">Contraseña</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={formData.password}
          onChange={handleChange}
          leftIcon={<IconLock className="h-5 w-5" />}
          placeholder="••••••••"
        />
      </div>

      <div className="flex items-center justify-between">
        <Checkbox
          id="rememberMe"
          name="rememberMe"
          checked={formData.rememberMe}
          onChange={handleChange}
          label="Recordarme"
        />

        <Link
          to={useAuthConfig.AUTH_FORGOT_PASSWORD_PATH}
          className="text-sm font-medium text-blue-400 hover:text-blue-500"
        >
          ¿Olvidaste tu contraseña?
        </Link>
      </div>

      <Button
        type="submit"
        variant="solid"
        fullWidth
        isLoading={isLoading}
        loadingText="Iniciando sesión..."
      >
        Iniciar sesión
      </Button>
    </form>
  );
}
