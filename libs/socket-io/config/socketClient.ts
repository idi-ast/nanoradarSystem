import { io, Socket } from "socket.io-client";

// ============================================
// URL base del servidor Socket.IO
// Configurable via variable de entorno
// ============================================
const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ?? "http://localhost:3000";

/**
 * Opciones de configuración del cliente Socket.IO
 */
const socketOptions = {
  // No conectar automáticamente al importar — se conecta con socketClient.connect()
  autoConnect: false,

  // Reintentar conexión indefinidamente
  reconnection: true,

  // Número de intentos de reconexión (Infinity = siempre)
  reconnectionAttempts: Infinity,

  // Tiempo entre intentos (ms)
  reconnectionDelay: 1000,

  // Aumento exponencial del delay (ms máximo: 5s)
  reconnectionDelayMax: 5000,

  // Timeout de conexión inicial (ms)
  timeout: 10000,

  // Protocolo de transporte preferido
  transports: ["websocket", "polling"] as string[],
};

/**
 * Instancia singleton del cliente Socket.IO.
 * No se conecta hasta llamar a `socketClient.connect()`.
 */
export const socketClient: Socket = io(SOCKET_URL, socketOptions);

/**
 * Conecta el socket si no está ya conectado.
 */
export function connectSocket(): void {
  if (!socketClient.connected) {
    socketClient.connect();
  }
}

/**
 * Desconecta el socket si está conectado.
 */
export function disconnectSocket(): void {
  if (socketClient.connected) {
    socketClient.disconnect();
  }
}
