import { useEffect } from "react";
import { useMap } from "react-map-gl";
import {
  createBoatLayer,
  destroyBoatLayer,
  updateBoat3DConfig,
  BOAT_LAYER_ID,
} from "./boatSingleRenderer";
import { useTargetVisualStore } from "../../stores/targetVisualStore";

/**
 * Añade el layer 3D de barcos directamente al mapa de Mapbox.
 * El renderer Three.js comparte el contexto WebGL del mapa, por lo que
 * los modelos se renderizan como objetos del mapa (igual que edificios 3D),
 * con profundidad y perspectiva correctas a cualquier pitch/bearing.
 */
export function BoatsSharedCanvas() {
  const boat3DConfig = useTargetVisualStore((s) => s.boat3DConfig);
  const { current: map } = useMap();

  // Añadir el layer al mapa una sola vez al montar
  useEffect(() => {
    if (!map) return;
    const mbMap = map.getMap();

    updateBoat3DConfig(boat3DConfig);
    const layer = createBoatLayer();

    const addLayer = () => {
      if (!mbMap.getLayer(BOAT_LAYER_ID)) {
        mbMap.addLayer(layer);
      }
    };

    if (mbMap.isStyleLoaded()) {
      addLayer();
    } else {
      mbMap.once("style.load", addLayer);
    }

    return () => {
      if (mbMap.getLayer(BOAT_LAYER_ID)) {
        mbMap.removeLayer(BOAT_LAYER_ID);
      }
      destroyBoatLayer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  // Propagar cambios de config (modelo, escala, luces…) al renderer
  useEffect(() => {
    updateBoat3DConfig(boat3DConfig);
  }, [boat3DConfig]);

  return null;
}

