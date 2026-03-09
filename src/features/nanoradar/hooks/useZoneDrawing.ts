import { useState, useCallback } from "react";
import type { CreateZonePayload } from "../types";

/**
 * Hook que encapsula todo el estado y la lógica
 * del modo de dibujo de nuevas zonas de alerta en el mapa.
 */
export function useZoneDrawing() {
  const [isDrawing, setIsDrawing] = useState(false);
  const [points, setPoints] = useState<[number, number][]>([]);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#ff0000");
  const [alertLevel, setAlertLevel] = useState<1 | 2 | 3 | 4>(1);

  const startDrawing = useCallback(() => {
    setIsDrawing(true);
    setPoints([]);
    setName("");
    setColor("#ff0000");
    setAlertLevel(1);
  }, []);

  const cancelDrawing = useCallback(() => {
    setIsDrawing(false);
    setPoints([]);
  }, []);

  const addPoint = useCallback((lat: number, lng: number) => {
    setPoints((prev) => [...prev, [lat, lng]]);
  }, []);

  const buildPayload = useCallback((): CreateZonePayload => {
    return {
      nombre: name || "Nueva Zona",
      descripcion: `Zona con alerta nivel ${alertLevel}`,
      idTipoAlerta: alertLevel,
      poligono: {
        color,
        vertices: points,
      },
    };
  }, [name, color, alertLevel, points]);

  return {
    isDrawing,
    points,
    name,
    color,
    alertLevel,
    startDrawing,
    cancelDrawing,
    addPoint,
    setName,
    setColor,
    setAlertLevel,
    buildPayload,
    canSave: points.length >= 3,
  };
}
