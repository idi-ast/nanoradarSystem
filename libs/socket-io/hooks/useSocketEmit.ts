import { useCallback, useState } from "react";
import { socketClient } from "../config";
import type { UseSocketEmitOptions, EmitResult } from "../types";

/**
 * Hook para emitir eventos Socket.IO.
 *
 * Devuelve una funcion `emit` tipada para el payload y un estado
 * `isSending` que indica si el socket esta procesando el envio.
 *
 * @example
 * const { emit, isSending } = useSocketEmit({ event: "chat:message" });
 * emit({ text: "Hola mundo" });
 */
export function useSocketEmit<TPayload = unknown>({
  event,
}: UseSocketEmitOptions) {
  const [isSending, setIsSending] = useState(false);

  /**
   * Emite el evento con el payload indicado.
   * Si el socket no esta conectado, devuelve un error sin lanzar excepcion.
   */
  const emit = useCallback(
    (payload?: TPayload): EmitResult => {
      if (!socketClient.connected) {
        return {
          success: false,
          error: "Socket no conectado. Llama a connect() primero.",
        };
      }

      setIsSending(true);

      try {
        if (payload !== undefined) {
          socketClient.emit(event, payload);
        } else {
          socketClient.emit(event);
        }
        return { success: true };
      } catch (err) {
        return { success: false, error: (err as Error).message };
      } finally {
        setIsSending(false);
      }
    },
    [event]
  );

  /**
   * Emite el evento y espera un ACK del servidor (callback-based).
   * Util cuando el servidor confirma la recepcion del mensaje.
   */
  const emitWithAck = useCallback(
    async (payload?: TPayload): Promise<EmitResult> => {
      if (!socketClient.connected) {
        return {
          success: false,
          error: "Socket no conectado. Llama a connect() primero.",
        };
      }

      setIsSending(true);

      try {
        await socketClient.emitWithAck(
          event,
          ...(payload !== undefined ? [payload] : [])
        );
        return { success: true };
      } catch (err) {
        return { success: false, error: (err as Error).message };
      } finally {
        setIsSending(false);
      }
    },
    [event]
  );

  return { emit, emitWithAck, isSending };
}
