import { io, Socket } from 'socket.io-client';
import type { ProcessedRadarMessage, RadarDetectionPayload } from '../types/radar-detection.types';

type DetectionCallback = (payload: RadarDetectionPayload) => void;
type ConnectionCallback = (connected: boolean) => void;

/**
 * Servicio WebSocket para conectar con el radar vía Socket.IO.
 *
 * Uso:
 * ```ts
 * const ws = new RadarWebSocketService('192.168.1.100');
 * ws.onDetection((payload) => console.log(payload.detections));
 * ws.connect();
 * // luego: ws.disconnect();
 * ```
 */
export class RadarWebSocketService {
  private socket: Socket | null = null;
  private ip: string;
  private port: number;
  private namespace: string;
  private detectionCallbacks: Set<DetectionCallback> = new Set();
  private connectionCallbacks: Set<ConnectionCallback> = new Set();

  constructor(ip: string, port = 3000, namespace = '/radar') {
    this.ip = ip;
    this.port = port;
    this.namespace = namespace;
  }

  /** Construye la URL de conexión a partir de IP, puerto y namespace */
  private get url(): string {
    return `http://${this.ip}:${this.port}${this.namespace}`;
  }

  /** Conecta al WebSocket del radar */
  connect(): void {
    if (this.socket?.connected) return;

    this.socket = io(this.url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    this.socket.on('connect', () => {
      console.log(`[RadarWS] Conectado al radar ${this.ip}`);
      this.connectionCallbacks.forEach((cb) => cb(true));
    });

    this.socket.on('disconnect', (reason) => {
      console.log(`[RadarWS] Desconectado del radar ${this.ip}: ${reason}`);
      this.connectionCallbacks.forEach((cb) => cb(false));
    });

    this.socket.on('connect_error', (error) => {
      console.error(`[RadarWS] Error de conexión al radar ${this.ip}:`, error.message);
    });

    this.socket.on('radar:detection', (data: ProcessedRadarMessage) => {
      const payload = data[1].payload;
      this.detectionCallbacks.forEach((cb) => cb(payload));
    });
  }

  /** Desconecta del WebSocket y limpia los listeners */
  disconnect(): void {
    if (!this.socket) return;
    this.socket.removeAllListeners();
    this.socket.disconnect();
    this.socket = null;
  }

  /** Verifica si el socket está conectado */
  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /** Registra un callback para recibir detecciones */
  onDetection(cb: DetectionCallback): () => void {
    this.detectionCallbacks.add(cb);
    return () => this.detectionCallbacks.delete(cb);
  }

  /** Registra un callback para cambios en el estado de conexión */
  onConnectionChange(cb: ConnectionCallback): () => void {
    this.connectionCallbacks.add(cb);
    return () => this.connectionCallbacks.delete(cb);
  }

  /** Actualiza la IP y reconecta si es necesario */
  updateIp(newIp: string): void {
    if (this.ip === newIp) return;
    this.ip = newIp;
    if (this.socket) {
      this.disconnect();
      this.connect();
    }
  }
}
