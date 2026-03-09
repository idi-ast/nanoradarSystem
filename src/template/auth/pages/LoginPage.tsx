import { AuthCard, LoginForm } from "../components";

export function LoginPage() {
  return (
    <AuthCard
      title="Iniciar sesión"
      subtitle="Ingresa tus credenciales para acceder a tu cuenta"
    >
      <LoginForm />
    </AuthCard>
  );
}
