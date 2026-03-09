import { z } from "zod";

export const emailSchema = z
  .string()
  .min(1, "El email es requerido")
  .email("Email invalido");

export const passwordSchema = z
  .string()
  .min(8, "Minimo 8 caracteres")
  .regex(/[A-Z]/, "Debe contener al menos una mayuscula")
  .regex(/[a-z]/, "Debe contener al menos una minuscula")
  .regex(/[0-9]/, "Debe contener al menos un numero");

export const passwordSimpleSchema = z
  .string()
  .min(6, "Minimo 6 caracteres");

export const phoneSchema = z
  .string()
  .min(1, "El telefono es requerido")
  .regex(/^[+]?[\d\s-()]+$/, "Telefono invalido");

export const urlSchema = z
  .string()
  .url("URL invalida");

export const dateSchema = z
  .string()
  .refine((val) => !isNaN(Date.parse(val)), "Fecha invalida");

export const numberPositiveSchema = z
  .number()
  .positive("Debe ser un numero positivo");

export const stringRequiredSchema = z
  .string()
  .min(1, "Este campo es requerido");

export const booleanSchema = z.boolean();

export const uuidSchema = z
  .string()
  .uuid("UUID invalido");

// Esquemas compuestos comunes
export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSimpleSchema,
});

export const registerSchema = z.object({
  nombre: z.string().min(2, "Minimo 2 caracteres"),
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contrasenas no coinciden",
  path: ["confirmPassword"],
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contrasenas no coinciden",
  path: ["confirmPassword"],
});

// Tipos inferidos
export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
