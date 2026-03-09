# Sonner

Libreria de notificaciones toast elegante y accesible.

## Caracteristicas

- Accesible
- Personalizable
- Animaciones fluidas
- Soporte para promesas

## Configuracion

```tsx
// En App.tsx o layout principal
import { ToastProvider } from "@/libs/sonner";

function App() {
  return (
    <>
      <ToastProvider />
      {/* resto de la app */}
    </>
  );
}
```

## Uso Basico

```tsx
import { useToast } from "@/libs/sonner";

function Componente() {
  const { success, error, info, warning, promise } = useToast();

  const handleClick = () => {
    success("Operacion exitosa");
    error("Algo salio mal");
    info("Informacion importante");
    warning("Advertencia");
  };

  // Con promesas
  const handleSave = async () => {
    promise(saveData(), {
      loading: "Guardando...",
      success: "Guardado correctamente",
      error: "Error al guardar",
    });
  };

  return <button onClick={handleClick}>Mostrar Toast</button>;
}
```

## Con Acciones

```tsx
success("Archivo eliminado", {
  action: {
    label: "Deshacer",
    onClick: () => restoreFile(),
  },
});
```

## Funciones Disponibles

| Funcion | Descripcion |
|---------|-------------|
| `success` | Toast de exito (verde) |
| `error` | Toast de error (rojo) |
| `info` | Toast informativo (azul) |
| `warning` | Toast de advertencia (amarillo) |
| `promise` | Toast con estado de promesa |
| `dismiss` | Cierra un toast especifico |
| `dismissAll` | Cierra todos los toasts |
