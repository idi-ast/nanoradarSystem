# CLSX

Utilidad para construir strings de clases CSS condicionalmente.

## Caracteristicas

- Ligera (< 1KB)
- Composicion de clases
- Soporte para condicionales
- Combina con Tailwind

## Uso Basico

```tsx
import { cn, clsx } from "@/libs/clsx";

// Clases condicionales
<div className={cn(
  "base-class",
  isActive && "active",
  isDisabled && "disabled"
)} />

// Con objetos
<div className={cn({
  "bg-100": isPrimary,
  "bg-200": !isPrimary,
  "text-white": true,
})} />

// Combinar multiples
<div className={cn(
  "px-4 py-2",
  variant === "primary" && "bg-blue-500",
  variant === "secondary" && "bg-gray-500",
  className // props externas
)} />
```

## Con Variantes

```tsx
import { createVariants } from "@/libs/clsx";

const buttonVariants = createVariants({
  base: "px-4 py-2 rounded font-medium",
  variants: {
    color: {
      primary: "bg-blue-500 text-white",
      secondary: "bg-gray-500 text-white",
      danger: "bg-red-500 text-white",
    },
    size: {
      sm: "text-sm",
      md: "text-base",
      lg: "text-lg",
    },
  },
  defaultVariants: {
    color: "primary",
    size: "md",
  },
});

// Uso
<button className={buttonVariants({ color: "primary", size: "lg" })}>
  Click
</button>
```

## Funciones Disponibles

| Funcion | Descripcion |
|---------|-------------|
| `cn` | Combina clases con condicionales |
| `clsx` | Re-export de clsx original |
| `createVariants` | Crea sistema de variantes |
