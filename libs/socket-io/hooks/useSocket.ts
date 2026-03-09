import { useEffect, useState, useCallback } from "react";
import { socketClient, connectSocket, disconnectSocket } from "../config";
import type {
  SocketConnectionStatus,
  UseSocketOptions,
  SocketState,
} from "../types";

/**
 * Hook principal para gestionar la conexion Socket.IO.
 *
 * Expone el estado de la conexion y los metodos connect/disconnect.
 * La instancia del socket es un singleton — multiples componentes
 * pueden usar este hook sin crear conexiones duplicadas.
 */
export function useSocket(options: UseSocketOptions = {}): SocketState {
  const {
    autoConnect = false,
    onConnect,
    onDisconnect,
    onError,
    onReconnect,
  } = options;

  const [status, setStatus] = useState<SocketConnectionStatus>(() =>
    socketClient.connected ? "connected" : "disconnected",
  );
  const [socketId, setSocketId] = useState<string | undefined>(socketClient.id);

  useEffect(() => {

    const handleConnect = () => {
      setStatus("connected");
      setSocketId(socketClient.id);
      onConnect?.();
    };

    const handleDisconnect = (reason: string) => {
      setStatus("disconnected");
      setSocketId(undefined);
      onDisconnect?.(reason);
    };

    const handleConnectError = (error: Error) => {
      setStatus("error");
      onError?.(error);
    };

    const handleReconnectAttempt = (attempt: number) => {
      setStatus("connecting");
      onReconnect?.(attempt);
    };

    socketClient.on("connect", handleConnect);
    socketClient.on("disconnect", handleDisconnect);
    socketClient.on("connect_error", handleConnectError);
    socketClient.io.on("reconnect_attempt", handleReconnectAttempt);

    // Conectar automaticamente si se solicita y aun no esta conectado
    if (autoConnect && !socketClient.connected) {
      setStatus("connecting");
      connectSocket();
    }

    return () => {
      socketClient.off("connect", handleConnect);
      socketClient.off("disconnect", handleDisconnect);
      socketClient.off("connect_error", handleConnectError);
      socketClient.io.off("reconnect_attempt", handleReconnectAttempt);
    };
  }, [autoConnect, onConnect, onDisconnect, onError, onReconnect]);

  const connect = useCallback(() => {
    if (!socketClient.connected) {
      setStatus("connecting");
      connectSocket();
    }
  }, []);

  const disconnect = useCallback(() => {
    disconnectSocket();
  }, []);

  return {
    status,
    isConnected: status === "connected",
    socketId,
    connect,
    disconnect,
  };
}
