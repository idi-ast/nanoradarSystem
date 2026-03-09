import { toast } from "sonner";
import type { ToastOptions, PromiseToastOptions, UseToastReturn } from "../types";

export function useToast(): UseToastReturn {
  const success = (message: string, options?: ToastOptions) => {
    toast.success(message, options);
  };

  const error = (message: string, options?: ToastOptions) => {
    toast.error(message, options);
  };

  const info = (message: string, options?: ToastOptions) => {
    toast.info(message, options);
  };

  const warning = (message: string, options?: ToastOptions) => {
    toast.warning(message, options);
  };

  const promiseToast = async <T,>(
    promiseValue: Promise<T>,
    options: PromiseToastOptions<T>
  ): Promise<T> => {
    toast.promise(promiseValue, options);
    return promiseValue;
  };

  const dismiss = (toastId?: string | number) => {
    toast.dismiss(toastId);
  };

  const dismissAll = () => {
    toast.dismiss();
  };

  return {
    success,
    error,
    info,
    warning,
    promise: promiseToast,
    dismiss,
    dismissAll,
  };
}
