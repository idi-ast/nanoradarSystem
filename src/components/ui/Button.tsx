import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { IconLoader2 } from "@tabler/icons-react";

export type ButtonVariant =
  | "solid"
  | "outline"
  | "ghost"
  | "link"
  | "danger"
  | "success";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  loadingText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  solid:
    "bg-bg-400 text-text-400 hover:opacity-80 focus:ring-blue-500 border-transparent shadow-sm",
  outline:
    "bg-transparent border-border text-text-100 hover:bg-bg-200 focus:ring-blue-500",
  ghost:
    "bg-transparent text-text-100 hover:bg-bg-200 focus:ring-blue-500 border-transparent",
  link: "bg-transparent text-blue-600 hover:text-blue-500 dark:text-blue-400 focus:ring-blue-500 border-transparent underline-offset-4 hover:underline p-0",
  danger:
    "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 border-transparent shadow-sm",
  success:
    "bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 border-transparent shadow-sm",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "py-1.5 px-3 text-xs",
  md: "py-2.5 px-4 text-sm",
  lg: "py-3 px-6 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = "",
      variant = "solid",
      size = "md",
      isLoading = false,
      loadingText,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      children,
      type = "button",
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex justify-center items-center font-medium rounded-lg border focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition";

    const widthStyles = fullWidth ? "w-full" : "";

    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyles} ${className}`}
        {...props}
      >
        {isLoading ? (
          <>
            <IconLoader2 className="h-5 w-5 mr-2 animate-spin" />
            {loadingText || children}
          </>
        ) : (
          <>
            {leftIcon && <span className="mr-2">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="ml-2">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
