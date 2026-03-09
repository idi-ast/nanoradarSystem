import { AuthCard, ForgotPasswordForm } from "../components";

export function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Recuperar contraseña"
      subtitle="Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña"
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
