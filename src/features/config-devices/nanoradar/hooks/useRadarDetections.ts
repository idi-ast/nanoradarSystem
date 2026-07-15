import { useEffect, useRef, useState, useCallback } from 'react';
import { RadarWebSocketService } from '../service/radarWebSocket.service';
import type { RadarDetectionPayload, ProcessedDetection } from '../types/radar-detection.types';

interface UseRadarDetectionsOptions {
  /** IP del radar. Si es undefined o vacío, no se conecta. */
  ip?: string;
  /** Puerto del WebSocket (default: 3000) */
  port?: number;
  /** Si true, no se conecta automáticamente */
  manual?: boolean;
}

interface UseRadarDetectionsReturn {
  /** Último payload completo recibido */
  lastPayload: RadarDetectionPayload | null;
  /** Lista de detecciones del último mensaje */
  detections: ProcessedDetection[];
  /** Si el WebSocket está conectado */
  isConnected: boolean;
  /** Conecta manualmente (solo si manual=true) */
  connect: () => void;
  /** Desconecta manualmente */
  disconnect: () => void;
}

/**
 * Hook para recibir detecciones de radar en tiempo real vía WebSocket.
 *
 * @example
 * ```tsx
 * const { detections, isConnected } = useRadarDetections({ ip: '192.168.1.100' });
 * ```
 */
export function useRadarDetections(
  options: UseRadarDetectionsOptions = {}
): UseRadarDetectionsReturn {
  const { ip, port = 3000, manual = false } = options;

  const [lastPayload, setLastPayload] = useState<RadarDetectionPayload | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<RadarWebSocketService | null>(null);

  // Crear o actualizar la instancia del servicio cuando cambia la IP
  useEffect(() => {
    if (!ip) return;

    // Si ya existe y la IP no cambió, no hacer nada
    if (wsRef.current) {
      wsRef.current.updateIp(ip);
      return;
    }

    wsRef.current = new RadarWebSocketService(ip, port);

    return () => {
      wsRef.current?.disconnect();
      wsRef.current = null;
    };
  }, [ip, port]);

  // Conectar / desconectar según ip y manual
  useEffect(() => {
    const ws = wsRef.current;
    if (!ws || manual) return;

    if (ip) {
      ws.connect();
    }

    return () => {
      ws.disconnect();
    };
  }, [ip, manual]);

  // Suscribirse a detecciones y cambios de conexión
  useEffect(() => {
    const ws = wsRef.current;
    if (!ws) return;

    const unsubDetection = ws.onDetection((payload) => {
      setLastPayload(payload);
    });

    const unsubConnection = ws.onConnectionChange((connected) => {
      setIsConnected(connected);
    });

    return () => {
      unsubDetection();
      unsubConnection();
    };
  }, [ip]);

  const connect = useCallback(() => {
    wsRef.current?.connect();
  }, []);

  const disconnect = useCallback(() => {
    wsRef.current?.disconnect();
  }, []);

  return {
    lastPayload,
    detections: lastPayload?.detections ?? [],
    isConnected,
    connect,
    disconnect,
  };
}
