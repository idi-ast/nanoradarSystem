# Zod

Libreria de validacion de esquemas con inferencia de tipos.

## Caracteristicas

- Type-safe
- Inferencia automatica de TypeScript
- Esquemas reutilizables
- Mensajes de error personalizables

## Uso Basico

```tsx
import { z, createSchema, validateData } from "@/libs/zod";

// Crear esquema
const userSchema = z.object({
  nombre: z.string().min(2, "Minimo 2 caracteres"),
  email: z.string().email("Email invalido"),
  edad: z.number().min(18, "Debe ser mayor de edad"),
});

// Inferir tipo
type User = z.infer<typeof userSchema>;

// Validar datos
const result = validateData(userSchema, {
  nombre: "Juan",
  email: "juan@email.com",
  edad: 25,
});

if (result.success) {
  console.log(result.data);
} else {
  console.log(result.errors);
}
```

## Esquemas Predefinidos

```tsx
import { emailSchema, passwordSchema, phoneSchema } from "@/libs/zod";

const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});
```

## Esquemas Disponibles

| Esquema | Descripcion |
|---------|-------------|
| `emailSchema` | Validacion de email |
| `passwordSchema` | Password con requisitos |
| `phoneSchema` | Numero de telefono |
| `urlSchema` | URL valida |
| `dateSchema` | Fecha valida |
