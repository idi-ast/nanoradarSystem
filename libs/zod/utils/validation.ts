import { z } from "zod";
import type { ValidationResult, ValidationError } from "../types";

export function validateData<T>(
  schema: z.ZodType<T>,
  data: unknown
): ValidationResult<T> {
  const result = schema.safeParse(data);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  const errors: ValidationError[] = result.error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));

  return {
    success: false,
    errors,
  };
}

export function validateDataOrThrow<T>(
  schema: z.ZodType<T>,
  data: unknown
): T {
  return schema.parse(data);
}

export function isValid<T>(
  schema: z.ZodType<T>,
  data: unknown
): data is T {
  return schema.safeParse(data).success;
}

export function getValidationErrors<T>(
  schema: z.ZodType<T>,
  data: unknown
): ValidationError[] {
  const result = schema.safeParse(data);

  if (result.success) {
    return [];
  }

  return result.error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

export function createSchema<T extends z.ZodRawShape>(
  shape: T
): z.ZodObject<T> {
  return z.object(shape);
}
