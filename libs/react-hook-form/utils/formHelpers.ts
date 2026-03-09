import type { FieldErrors, FieldValues } from "react-hook-form";

export function getErrorMessage<T extends FieldValues>(
  errors: FieldErrors<T>,
  name: keyof T
): string | undefined {
  const error = errors[name];
  return error?.message as string | undefined;
}

export function hasError<T extends FieldValues>(
  errors: FieldErrors<T>,
  name: keyof T
): boolean {
  return !!errors[name];
}

export function getFirstError<T extends FieldValues>(
  errors: FieldErrors<T>
): string | undefined {
  const firstKey = Object.keys(errors)[0] as keyof T;
  if (firstKey) {
    return getErrorMessage(errors, firstKey);
  }
  return undefined;
}

export function formatFormData<T extends Record<string, unknown>>(
  data: T,
  trimStrings = true
): T {
  const formatted = { ...data };

  Object.keys(formatted).forEach((key) => {
    const value = formatted[key];
    if (typeof value === "string" && trimStrings) {
      (formatted as Record<string, unknown>)[key] = value.trim();
    }
  });

  return formatted;
}
