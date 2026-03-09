# React Hook Form

Libreria de formularios con alto rendimiento y validacion.

## Caracteristicas

- Uncontrolled components (mejor rendimiento)
- Validacion con Zod integrada
- TypeScript nativo
- Minimo re-renders

## Uso Basico

```tsx
import { useForm, useFormWithZod } from "@/libs/react-hook-form";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Email invalido"),
  password: z.string().min(6, "Minimo 6 caracteres"),
});

function LoginForm() {
  const { register, handleSubmit, errors, isSubmitting } = useFormWithZod({
    schema: loginSchema,
  });

  const onSubmit = (data) => {
    console.log(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register("email")} placeholder="Email" />
      {errors.email && <span>{errors.email.message}</span>}

      <input {...register("password")} type="password" placeholder="Password" />
      {errors.password && <span>{errors.password.message}</span>}

      <button type="submit" disabled={isSubmitting}>
        Iniciar Sesion
      </button>
    </form>
  );
}
```

## Con Valores por Defecto

```tsx
const { register, handleSubmit } = useFormWithZod({
  schema: userSchema,
  defaultValues: {
    nombre: "Juan",
    email: "juan@email.com",
  },
});
```

## Hooks Disponibles

| Hook | Descripcion |
|------|-------------|
| `useFormWithZod` | Form con validacion Zod integrada |
| `useFieldArray` | Manejo de arrays de campos |
