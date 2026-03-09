import { useEffect, useRef } from "react";
import { socketClient } from "../config";
import type { UseSocketEventOptions } from "../types";

/**
 * Hook para suscribirse a un evento Socket.IO.
 *
 * Registra el listener al montar y lo elimina al desmontar o cuando
 * cambian `event` / `enabled`. El handler se mantiene actualizado
 * mediante una ref, por lo que no es necesario memorizarlo externamente.
 *
 * @example
 * useSocketEvent<SensorReading>({
 *   event: "sensor:update",
 *   handler: (data) => console.log(data),
 * });
 */
export function useSocketEvent<T = unknown>({
  event,
  handler,
  enabled = true,
}: UseSocketEventOptions<T>): void {
  // Ref para mantener siempre la version mas reciente del handler
  // sin necesidad de re-registrar el listener
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled) return;

    const listener = (data: T) => {
      handlerRef.current(data);
    };

    socketClient.on(event, listener);

    return () => {
      socketClient.off(event, listener);
    };
  }, [event, enabled]);
}
