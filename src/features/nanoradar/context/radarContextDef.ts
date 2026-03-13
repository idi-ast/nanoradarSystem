import { createContext } from "react";
import type {
  RadarConfig,
  RadarTarget,
  RadarZone,
  CreateZonePayload,
  UpdateZonePayload,
} from "../types";
import type { ResolvedRadarConfig } from "../config";

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

  targets: RadarTarget[];
  clearTargets: () => void;

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
}

export const RadarContext = createContext<RadarContextValue | null>(null);
