import { AuthCard, RegisterForm } from "../components";

export function RegisterPage() {
  return (
    <AuthCard
      title="Crear cuenta"
      subtitle="Completa el formulario para registrarte"
    >
      <RegisterForm />
    </AuthCard>
  );
}
