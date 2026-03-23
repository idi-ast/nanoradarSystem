import { useState, useCallback } from "react";
import type { CreateZonePayload } from "../types";

const STOPPED_COLOR = "#ff0000";
const MOVING_COLOR = "#00bfff";

/**
 * Hook que encapsula todo el estado y la lógica
 * del modo de dibujo de nuevas zonas de alerta en el mapa.
 */
export function useZoneDrawing() {
  const [isDrawing, setIsDrawing] = useState(false);
  const [points, setPoints] = useState<[number, number][]>([]);
  const [name, setName] = useState("");
  const [color, setColor] = useState(STOPPED_COLOR);
  const [alertLevel, setAlertLevel] = useState<1 | 2 | 3 | 4>(1);
  const [zoneSound, setZoneSound] = useState<number | null>(null);

  const startDrawing = useCallback(() => {
    setIsDrawing(true);
    setPoints([]);
    setName("");
    setColor(STOPPED_COLOR);
    setAlertLevel(1);
    setZoneSound(null);
  }, []);

  const cancelDrawing = useCallback(() => {
    setIsDrawing(false);
    setPoints([]);
  }, []);

  const addPoint = useCallback((lat: number, lng: number) => {
    setPoints((prev) => [...prev, [lat, lng]]);
  }, []);

  const removeLastPoint = useCallback(() => {
    setPoints((prev) => prev.slice(0, -1));
  }, []);

  const setMovementStatus = useCallback((isMoving: boolean) => {
    setColor(isMoving ? MOVING_COLOR : STOPPED_COLOR);
  }, []);

  const buildPayload = useCallback((): CreateZonePayload => {
    return {
      nombre: name || "Nueva Zona",
      descripcion: `Zona con alerta nivel ${alertLevel}`,
      idTipoAlerta: alertLevel,
      sonido: zoneSound,
      poligono: {
        color,
        vertices: points,
      },
    };
  }, [name, color, alertLevel, zoneSound, points]);

  return {
    isDrawing,
    points,
    name,
    color,
    alertLevel,
    zoneSound,
    startDrawing,
    cancelDrawing,
    addPoint,
    removeLastPoint,
    setName,
    setColor,
    setMovementStatus,
    setAlertLevel,
    setZoneSound,
    buildPayload,
    canSave: points.length >= 3,
  };
}
