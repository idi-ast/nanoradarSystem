import type { z } from "zod";
import type {
  UseFormReturn,
  FieldValues,
  DefaultValues,
  Mode,
} from "react-hook-form";

export interface UseFormWithZodOptions<T extends FieldValues> {
  schema: z.ZodType<T>;
  defaultValues?: DefaultValues<T>;
  mode?: Mode;
  reValidateMode?: Exclude<Mode, "onTouched" | "all">;
}

export interface UseFormWithZodReturn<T extends FieldValues>
  extends UseFormReturn<T> {
  errors: UseFormReturn<T>["formState"]["errors"];
  isSubmitting: boolean;
  isValid: boolean;
  isDirty: boolean;
}

export interface FormFieldProps {
  name: string;
  label?: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export interface FormErrorProps {
  message?: string;
  className?: string;
}
