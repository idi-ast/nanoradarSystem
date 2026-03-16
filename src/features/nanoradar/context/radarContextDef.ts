import { createContext } from "react";
import type {
  RadarConfig,
  RadarTarget,
  RadarZone,
  CreateZonePayload,
  UpdateZonePayload,
} from "../types";
import type { ResolvedRadarConfig } from "../config";

/**
 * Datos estáticos / semi-estáticos: configuración, zonas, estado de dibujo.
 * Cambia raramente — no incluye targets del WebSocket.
 */
export interface RadarContextValue {
  /** Configuración resuelta de la instancia (visual, timing, mapa, etc.) */
  instanceConfig: ResolvedRadarConfig;
  // Datos del servidor
  config: RadarConfig | null;
  zones: RadarZone[];
  isLoading: boolean;
  error: string | null;
  refreshData: () => void;
  addZone: (payload: CreateZonePayload) => Promise<void>;
  updateZone: (id: number, payload: UpdateZonePayload) => Promise<void>;
  deleteZone: (id: number) => Promise<void>;

  isDrawing: boolean;
  drawingPoints: [number, number][];
  zoneName: string;
  zoneColor: string;
  alertLevel: 1 | 2 | 3 | 4;
  canSave: boolean;
  startDrawing: () => void;
  cancelDrawing: () => void;
  addDrawingPoint: (lat: number, lng: number) => void;
  removeLastDrawingPoint: () => void;
  setZoneName: (name: string) => void;
  setZoneColor: (color: string) => void;
  setAlertLevel: (level: 1 | 2 | 3 | 4) => void;
  saveZone: () => Promise<void>;
  /** Estable (useCallback sin deps) — vive en contexto estático para no arrastrar re-renders desde WS. */
  clearTargets: () => void;
}

/**
 * Datos de alta frecuencia: objetivos detectados por el radar (WebSocket).
 * Se actualiza con cada mensaje WS — aislado para evitar re-renders en
 * componentes que no necesitan los targets.
 */
export interface RadarTargetsContextValue {
  targets: RadarTarget[];
}

/**
 * Datos de baja frecuencia derivados del WebSocket:
 * el array de targets cuya referencia SOLO cambia cuando el conjunto de IDs
 * cambia (nueva detección o target perdido).
 * Movimiento de coordenadas NO actualiza este contexto.
 * Úsalo en componentes que solo necesitan saber QUÉ targets existen (sidebar, lista).
 */
export interface RadarStableTargetsContextValue {
  stableTargets: RadarTarget[];
}

export const RadarContext = createContext<RadarContextValue | null>(null);
export const RadarTargetsContext = createContext<RadarTargetsContextValue | null>(null);
export const RadarStableTargetsContext = createContext<RadarStableTargetsContextValue | null>(null);
