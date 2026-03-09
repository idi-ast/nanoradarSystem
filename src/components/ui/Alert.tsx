import type { ReactNode } from "react";
import {
  IconX,
  IconAlertCircle,
  IconCheck,
  IconInfoCircle,
} from "@tabler/icons-react";

export type AlertVariant = "error" | "success" | "warning" | "info";

export interface AlertProps {
  variant?: AlertVariant;
  children: ReactNode;
  onClose?: () => void;
  className?: string;
}

const variantStyles: Record<
  AlertVariant,
  { container: string; icon: string; text: string }
> = {
  error: {
    container:
      "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
    icon: "text-red-400",
    text: "text-red-700 dark:text-red-400",
  },
  success: {
    container:
      "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
    icon: "text-green-400",
    text: "text-green-700 dark:text-green-400",
  },
  warning: {
    container:
      "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800",
    icon: "text-yellow-400",
    text: "text-yellow-700 dark:text-yellow-400",
  },
  info: {
    container:
      "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
    icon: "text-blue-400",
    text: "text-blue-700 dark:text-blue-400",
  },
};

const variantIcons: Record<AlertVariant, ReactNode> = {
  error: <IconAlertCircle className="h-5 w-5" />,
  success: <IconCheck className="h-5 w-5" />,
  warning: <IconAlertCircle className="h-5 w-5" />,
  info: <IconInfoCircle className="h-5 w-5" />,
};

export function Alert({
  variant = "info",
  children,
  onClose,
  className = "",
}: AlertProps) {
  const styles = variantStyles[variant];

  return (
    <div
      className={`border rounded-lg p-4 ${styles.container} ${className}`}
      role="alert"
    >
      <div className="flex">
        <div className={`shrink-0 ${styles.icon}`}>{variantIcons[variant]}</div>
        <div className="ml-3">
          <p className={`text-sm ${styles.text}`}>{children}</p>
        </div>
        {onClose && (
          <div className="relative ml-auto pl-3">
            <button
              type="button"
              onClick={onClose}
              className={`${styles.icon} hover:opacity-75 transition-opacity`}
            >
              <span className="sr-only">Cerrar</span>
              <IconX className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
