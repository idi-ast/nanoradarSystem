# Zustand

Estado global minimalista y rápido para React.

## Características

-  Sin boilerplate
-  TypeScript nativo
-  Middleware incluido (persist, devtools)
-  Selectores automáticos

## Uso Básico

```tsx
import { useUserStore } from "@/libs/zustand";

function Profile() {
  const { user, setUser, logout } = useUserStore();

  return (
    <div>
      <p>Hola, {user?.nombre}</p>
      <button onClick={logout}>Cerrar sesión</button>
    </div>
  );
}
```

## Con Selectores (Optimizado)

```tsx
// Solo re-renderiza cuando cambia el nombre
const nombre = useUserStore((state) => state.user?.nombre);

// Múltiples valores
const { user, isAuthenticated } = useUserStore((state) => ({
  user: state.user,
  isAuthenticated: state.isAuthenticated,
}));
```

## Stores Disponibles

| Store | Descripción |
|-------|-------------|
| `useUserStore` | Usuario y autenticación |
| `useUIStore` | Estado de UI (modales, sidebar) |
| `useNotificationStore` | Notificaciones toast |
