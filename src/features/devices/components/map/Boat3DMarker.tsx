import { useEffect, useMemo } from "react";
import { registerBoat, updateBoat, unregisterBoat } from "./boatSingleRenderer";


function computeBearing(
  p1: [number, number],
  p2: [number, number],
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLon = toRad(p2[1] - p1[1]);
  const lat1 = toRad(p1[0]);
  const lat2 = toRad(p2[0]);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}


interface Boat3DMarkerProps {
  /** ID único del target */
  id: string;
  /** Posición actual del target en el mapa */
  lng: number;
  lat: number;
  /** Modelo GLB a renderizar (asignado según categoría de la zona) */
  modelPath: string;
  /** Historial de posiciones [lat, lon, ts] para calcular el rumbo */
  history: [number, number, number][];
  moving: boolean;
  isSelected: boolean;
  size?: number;
}


export function Boat3DMarker({
  id,
  lng,
  lat,
  modelPath,
  history,
  moving,
  isSelected,
  size = 64,
}: Boat3DMarkerProps) {
  const bearingDeg = useMemo(() => {
    if (history.length < 2) return 0;
    const p1 = history[history.length - 2];
    const p2 = history[history.length - 1];
    return computeBearing([p1[0], p1[1]], [p2[0], p2[1]]);
  }, [history]);

  // Registrar posición inicial en el renderer al montar
  useEffect(() => {
    registerBoat(id, lng, lat, modelPath);
    return () => unregisterBoat(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Actualizar posición, estado y modelo cuando cambian
  useEffect(() => {
    updateBoat(id, { lng, lat, bearingDeg, moving, isSelected, modelPath });
  }, [id, lng, lat, bearingDeg, moving, isSelected, modelPath]);

  const effectiveSize = isSelected ? Math.round(size * 1.2) : size;

  // Div transparente: sirve como área de click (el modelo 3D lo renderiza el layer del mapa)
  return (
    <div
      style={{
        width: effectiveSize,
        height: effectiveSize,
        cursor: "pointer",
      }}
    />
  );
}


