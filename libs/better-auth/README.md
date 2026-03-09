#  Better Auth

Autenticación moderna y flexible para aplicaciones web.

## Características

- OAuth (Google, GitHub, etc.)
- Email/Password
- Magic Links
- Session management
- CSRF protection

## Configuración

### 1. Variables de entorno (.env)

```env
VITE_AUTH_URL=http://localhost:8000
VITE_AUTH_GOOGLE_CLIENT_ID=tu-client-id
VITE_AUTH_GITHUB_CLIENT_ID=tu-client-id
```

### 2. Envolver la app con AuthProvider

```tsx
import { AuthProvider } from "@/libs/better-auth";

function App() {
  return (
    <AuthProvider>
      <Router />
    </AuthProvider>
  );
}
```

## Uso

```tsx
import { useAuth, useSession } from "@/libs/better-auth";

function LoginButton() {
  const { signIn, signOut, isLoading } = useAuth();
  const { session, user } = useSession();

  if (session) {
    return (
      <div>
        <p>Hola, {user?.name}</p>
        <button onClick={() => signOut()}>
          Cerrar sesión
        </button>
      </div>
    );
  }

  return (
    <div>
      <button onClick={() => signIn.email("email@test.com", "password")}>
        Iniciar con Email
      </button>
      <button onClick={() => signIn.social("google")}>
        Iniciar con Google
      </button>
    </div>
  );
}
```

## Proteger Rutas

```tsx
import { ProtectedRoute } from "@/libs/better-auth";

<Route
  path="/dashboard"
  element={
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  }
/>
```

## Hooks Disponibles

| Hook | Descripción |
|------|-------------|
| `useAuth()` | Acciones de autenticación |
| `useSession()` | Datos de sesión actual |
| `useUser()` | Datos del usuario |
