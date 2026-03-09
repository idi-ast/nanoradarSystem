// ============================================
// Estado de la conexion Socket.IO
// ============================================

export type SocketConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

// ============================================
// Opciones para el hook useSocket
// ============================================

export interface UseSocketOptions {
  /** Conectar automaticamente al montar el componente */
  autoConnect?: boolean;
  /** Callback llamado cuando la conexion se establece */
  onConnect?: () => void;
  /** Callback llamado cuando la conexion se pierde */
  onDisconnect?: (reason: string) => void;
  /** Callback llamado cuando ocurre un error de conexion */
  onError?: (error: Error) => void;
  /** Callback llamado cuando el socket intenta reconectarse */
  onReconnect?: (attempt: number) => void;
}

// ============================================
// Opciones para el hook useSocketEvent
// ============================================

export interface UseSocketEventOptions<T> {
  /** Nombre del evento a escuchar */
  event: string;
  /** Callback ejecutado cuando llega el evento */
  handler: (data: T) => void;
  /** Si es false, el listener no se registra */
  enabled?: boolean;
}

// ============================================
// Opciones para el hook useSocketEmit
// ============================================

export interface UseSocketEmitOptions {
  /** Evento a emitir */
  event: string;
}

export interface EmitResult {
  success: boolean;
  error?: string;
}

// ============================================
// Estado retornado por useSocket
// ============================================

export interface SocketState {
  status: SocketConnectionStatus;
  isConnected: boolean;
  socketId: string | undefined;
  connect: () => void;
  disconnect: () => void;
}
