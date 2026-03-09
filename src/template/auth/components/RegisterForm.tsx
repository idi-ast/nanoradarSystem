import { Link } from "react-router";
import { IconMail, IconLock, IconUser } from "@tabler/icons-react";
import { useRegisterForm } from "../hooks";
import { configServer } from "@/config/ConfigServer";
import { Input, Label, Button, Checkbox, Alert } from "@/components/ui";

export function RegisterForm() {
  const { formData, isLoading, error, handleChange, handleSubmit, clearError } =
    useRegisterForm();
  const { useAuthConfig } = configServer();

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <Alert variant="error" onClose={clearError}>
          {error}
        </Alert>
      )}

      <div>
        <Label htmlFor="name">Nombre completo</Label>
        <Input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          required
          value={formData.name}
          onChange={handleChange}
          leftIcon={<IconUser className="h-5 w-5" />}
          placeholder="Tu nombre"
        />
      </div>

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
          autoComplete="new-password"
          required
          value={formData.password}
          onChange={handleChange}
          leftIcon={<IconLock className="h-5 w-5" />}
          placeholder="Mínimo 8 caracteres"
        />
      </div>

      <div>
        <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          value={formData.confirmPassword}
          onChange={handleChange}
          leftIcon={<IconLock className="h-5 w-5" />}
          placeholder="Repite tu contraseña"
        />
      </div>

      <div className="flex items-start">
        <Checkbox
          id="acceptTerms"
          name="acceptTerms"
          checked={formData.acceptTerms}
          onChange={handleChange}
          className="mt-0.5"
          label={
            <span className="text-text-100">
              Acepto los{" "}
              <a href="#" className="text-blue-600 hover:text-blue-500">
                términos y condiciones
              </a>{" "}
              y la{" "}
              <a href="#" className="text-blue-600 hover:text-blue-500">
                política de privacidad
              </a>
            </span>
          }
        />
      </div>

      <Button
        type="submit"
        variant="solid"
        fullWidth
        isLoading={isLoading}
        loadingText="Creando cuenta..."
      >
        Crear cuenta
      </Button>

      <p className="text-center text-sm text-text-200">
        ¿Ya tienes una cuenta?{" "}
        <Link
          to={useAuthConfig.AUTH_LOGIN_PATH}
          className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
        >
          Inicia sesión
        </Link>
      </p>
    </form>
  );
}
