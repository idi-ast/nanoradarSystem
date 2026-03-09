import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

type VariantConfig = Record<string, Record<string, string>>;
type VariantProps<T extends VariantConfig> = {
  [K in keyof T]?: keyof T[K];
};

interface VariantsConfig<T extends VariantConfig> {
  base?: string;
  variants: T;
  defaultVariants?: Partial<VariantProps<T>>;
}

export function createVariants<T extends VariantConfig>(
  config: VariantsConfig<T>
): (props?: Partial<VariantProps<T>> & { className?: string }) => string {
  const { base = "", variants, defaultVariants = {} } = config;

  return (props = {}) => {
    const { className, ...variantProps } = props as VariantProps<T> & { className?: string };

    const variantClasses = Object.keys(variants).map((key) => {
      const variantKey = key as keyof T;
      const values = variants[variantKey];
      const propValue = (variantProps as Record<string, unknown>)[key] as string | undefined;
      const defaultValue = (defaultVariants as Record<string, unknown>)[key] as string | undefined;
      const selectedValue = propValue ?? defaultValue;

      if (selectedValue && values[selectedValue]) {
        return values[selectedValue];
      }
      return "";
    });

    return cn(base, ...variantClasses, className);
  };
}

export function conditionalClass(
  condition: boolean,
  trueClass: string,
  falseClass?: string
): string {
  return condition ? trueClass : (falseClass ?? "");
}

export function mergeClasses(
  baseClasses: string,
  ...additionalClasses: (string | undefined | null | false)[]
): string {
  return cn(baseClasses, ...additionalClasses);
}
