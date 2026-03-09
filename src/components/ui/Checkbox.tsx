import { forwardRef } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: ReactNode;
  error?: boolean;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className = "", label, error = false, id, ...props }, ref) => {
    const baseStyles =
      "h-4 w-4 text-blue-600 focus:ring-blue-500 border-border rounded bg-bg-100";

    const errorStyles = error ? "border-red-500" : "";

    if (label) {
      return (
        <div className="flex items-center">
          <input
            ref={ref}
            type="checkbox"
            id={id}
            className={`${baseStyles} ${errorStyles} ${className}`}
            {...props}
          />
          <label
            htmlFor={id}
            className="ml-2 block text-sm text-text-100 cursor-pointer"
          >
            {label}
          </label>
        </div>
      );
    }

    return (
      <input
        ref={ref}
        type="checkbox"
        id={id}
        className={`${baseStyles} ${errorStyles} ${className}`}
        {...props}
      />
    );
  }
);

Checkbox.displayName = "Checkbox";
