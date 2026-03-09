import { useForm, type FieldValues } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { UseFormWithZodOptions, UseFormWithZodReturn } from "../types";

export function useFormWithZod<T extends FieldValues>(
  options: UseFormWithZodOptions<T>
): UseFormWithZodReturn<T> {
  const { schema, defaultValues, mode = "onBlur", reValidateMode = "onChange" } = options;

  const form = useForm<T>({
    resolver: zodResolver(schema),
    defaultValues,
    mode,
    reValidateMode,
  });

  return {
    ...form,
    errors: form.formState.errors,
    isSubmitting: form.formState.isSubmitting,
    isValid: form.formState.isValid,
    isDirty: form.formState.isDirty,
  };
}
