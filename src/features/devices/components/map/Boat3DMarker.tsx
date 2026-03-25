import { useEffect, useRef, useMemo } from "react";
import { registerBoat, updateBoat, unregisterBoat } from "./boatSingleRenderer";

// ─── Utilidades ───────────────────────────────────────────────────────────────

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

// ─── Componente ───────────────────────────────────────────────────────────────

interface Boat3DMarkerProps {
  /** ID único del target (usado para registrar en el renderer) */
  id: string;
  /** Historial de posiciones [lat, lon, ts] para calcular el rumbo */
  history: [number, number, number][];
  moving: boolean;
  isSelected: boolean;
  size?: number;
}

/**
 * Div transparente que actúa de hit-target para el marcador 3D.
 * La geometría 3D se pinta por BoatsSharedCanvas usando el singleton
 * boatSingleRenderer, que lee el BoundingClientRect de este div
 * para saber dónde dibujar sin necesitar un Canvas propio.
 */
export function Boat3DMarker({
  id,
  history,
  moving,
  isSelected,
  size = 64,
}: Boat3DMarkerProps) {
  const divRef = useRef<HTMLDivElement>(null);

  const bearingDeg = useMemo(() => {
    if (history.length < 2) return 0;
    const p1 = history[history.length - 2];
    const p2 = history[history.length - 1];
    return computeBearing([p1[0], p1[1]], [p2[0], p2[1]]);
  }, [history]);

  // Registrar en el renderer al montar, deregistrar al desmontar
  useEffect(() => {
    if (!divRef.current) return;
    registerBoat(id, divRef.current);
    return () => unregisterBoat(id);
  }, [id]);

  // Actualizar datos cuando cambian bearing/estado
  useEffect(() => {
    updateBoat(id, { bearingDeg, moving, isSelected });
  }, [id, bearingDeg, moving, isSelected]);

  const effectiveSize = isSelected ? Math.round(size * 1.2) : size;

  return (
    <div
      ref={divRef}
      style={{
        width: effectiveSize,
        height: effectiveSize,
        cursor: "pointer",
        // Sin fondo ni borde: el canvas overlay pinta aquí el barco 3D
      }}
    />
  );
}


