import { useEffect, useRef } from "react";
import { initBoatRenderer, destroyBoatRenderer, updateBoat3DConfig } from "./boatSingleRenderer";
import { useTargetVisualStore } from "../../stores/targetVisualStore";

/**
 * Canvas overlay fijo que aloja el único WebGLRenderer compartido.
 * Todos los <Boat3DMarker> registran su div y este canvas pinta
 * cada barco en la posición correcta usando setScissor/setViewport.
 */
export function BoatsSharedCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  const boat3DConfig = useTargetVisualStore((s) => s.boat3DConfig);

  useEffect(() => {
    if (!ref.current) return;
    initBoatRenderer(ref.current);
    // Aplicar la config persistida al inicializar
    updateBoat3DConfig(boat3DConfig);
    return () => destroyBoatRenderer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <canvas
      ref={ref}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 5,
      }}
    />
  );
}

