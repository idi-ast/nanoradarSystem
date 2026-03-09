import type { SocketConnectionStatus } from "../types";

// ============================================
// Helpers para el manejo del estado del socket
// ============================================

/**
 * Devuelve un label legible segun el estado de la conexion.
 */
export function getConnectionLabel(status: SocketConnectionStatus): string {
  const labels: Record<SocketConnectionStatus, string> = {
    connected: "Conectado",
    connecting: "Conectando...",
    disconnected: "Desconectado",
    error: "Error de conexion",
  };
  return labels[status];
}

/**
 * Devuelve un color CSS representativo del estado.
 * Util para indicadores visuales (badge, dot, etc.).
 */
export function getConnectionColor(status: SocketConnectionStatus): string {
  const colors: Record<SocketConnectionStatus, string> = {
    connected: "#22c55e",    // green-500
    connecting: "#f59e0b",   // amber-500
    disconnected: "#6b7280", // gray-500
    error: "#ef4444",        // red-500
  };
  return colors[status];
}

/**
 * Construye el nombre del namespace de un evento.
 * Convencion: "recurso:accion"
 *
 * @example
 * buildEventName("sensor", "update") → "sensor:update"
 */
export function buildEventName(resource: string, action: string): string {
  return `${resource}:${action}`;
}

/**
 * Logger simple para eventos Socket.IO en desarrollo.
 * No hace nada en produccion.
 */
export function socketLogger(event: string, data?: unknown): void {
  if (import.meta.env.DEV) {
    console.log(`[Socket] ${event}`, data ?? "");
  }
}
