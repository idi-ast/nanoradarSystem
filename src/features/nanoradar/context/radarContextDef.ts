import { createContext } from "react";
import type {
  RadarConfig,
  RadarTarget,
  RadarZone,
  CreateZonePayload,
} from "../types";

export interface RadarContextValue {
  // Datos del servidor
  config: RadarConfig | null;
  zones: RadarZone[];
  isLoading: boolean;
  error: string | null;
  refreshData: () => void;
  addZone: (payload: CreateZonePayload) => Promise<void>;

  // Objetivos en tiempo real (WebSocket)
  targets: RadarTarget[];
  clearTargets: () => void;

  // Estado del modo de dibujo de zona
  isDrawing: boolean;
  drawingPoints: [number, number][];
  zoneName: string;
  zoneColor: string;
  alertLevel: 1 | 2 | 3 | 4;
  canSave: boolean;
  startDrawing: () => void;
  cancelDrawing: () => void;
  addDrawingPoint: (lat: number, lng: number) => void;
  setZoneName: (name: string) => void;
  setZoneColor: (color: string) => void;
  setAlertLevel: (level: 1 | 2 | 3 | 4) => void;
  saveZone: () => Promise<void>;
}

export const RadarContext = createContext<RadarContextValue | null>(null);
