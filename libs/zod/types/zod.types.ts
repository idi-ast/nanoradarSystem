import type { z } from "zod";

export type ZodSchema<T> = z.ZodType<T>;

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
}

export interface ValidationError {
  path: string;
  message: string;
}

export type InferSchema<T extends z.ZodType> = z.infer<T>;
