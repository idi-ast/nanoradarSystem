import React, { memo, useState, useCallback } from "react";
import {
  IconMapCog,
  IconRosetteDiscountCheck,
  IconMapMinus,
  Icon3dCubeSphere,
  IconCompass,
  IconRefresh,
  IconPlus,
  IconMinus,
} from "@tabler/icons-react";
import type { MapRef } from "react-map-gl";
import type { MapLayer, MapLayerConfig, MapCenter } from "../types";
import { Tooltip } from "@/components/ui";

interface MapControlsProps {
  mapRef: React.RefObject<MapRef | null>;
  selectedLayer: MapLayer;
  onLayerChange: (layer: MapLayer) => void;
  mapLayers: Record<MapLayer, MapLayerConfig>;
  initialCenter: MapCenter;
  initialZoom: number;
}

const BTN =
  "relative text-text-100 hover:text-text-400 hover:bg-bg-450 outline outline-transparent p-0.5 bg-bg-100 rounded h-10 w-10 flex justify-center items-center transition-all";

function MapBtn({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip text={title} side="bottom">
      <button onClick={onClick} className={BTN}>
        {children}
      </button>
    </Tooltip>
  );
}

const MapControls = memo(function MapControls({
  mapRef,
  selectedLayer,
  onLayerChange,
  mapLayers,
  initialCenter,
  initialZoom,
}: MapControlsProps) {
  const [showLayers, setShowLayers] = useState(false);

  const setTopView = useCallback(
    () => mapRef.current?.easeTo({ pitch: 0, bearing: 0, duration: 1000 }),
    [mapRef],
  );
  const set3DView = useCallback(
    () => mapRef.current?.easeTo({ pitch: 60, duration: 1000 }),
    [mapRef],
  );
  const resetNorth = useCallback(
    () => mapRef.current?.easeTo({ bearing: 0, duration: 800 }),
    [mapRef],
  );
  const resetView = useCallback(
    () =>
      mapRef.current?.flyTo({
        center: [initialCenter.longitude, initialCenter.latitude],
        zoom: initialZoom,
        pitch: 0,
        bearing: 0,
        duration: 1500,
      }),
    [mapRef, initialCenter, initialZoom],
  );
  const zoomIn = useCallback(() => mapRef.current?.zoomIn(), [mapRef]);
  const zoomOut = useCallback(() => mapRef.current?.zoomOut(), [mapRef]);

  return (
    <div className="flex absolute right-5 top-1 z-1 p-1 gap-1 radar-chip rounded-md">
      {/* Layer selector */}
      <div className="relative z-50">
        <Tooltip text="Capas del mapa" side="bottom">
          <button
            onClick={() => setShowLayers((v) => !v)}
            className={`${showLayers ? "bg-bg-100 text-text-100 z-100" : "bg-bg-450 text-text-400 "} relative hover:text-text-300 outline outline-transparent p-0.5  rounded h-10 w-10 flex justify-center items-center transition-all`}
          >
            <IconMapCog size={20} />
          </button>
        </Tooltip>

        {showLayers && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowLayers(false)}
            />
            <div className="absolute top-0 max-h-150 animate-fade-in-left animate-duration-100 overflow-y-scroll right-9 bg-bg-100 border border-border shadow-xl p-3 min-w-60 z-50">
              <div className="flex bg-bg-200 gap-2 font-medium mb-3 border border-border p-2 justify-center items-center text-text-200">
                {mapLayers[selectedLayer].icon}
                {mapLayers[selectedLayer].name}
                <IconRosetteDiscountCheck size={20} className="text-lime-300" />
              </div>
              {Object.entries(mapLayers).map(([key, layer]) => (
                <button
                  key={key}
                  onClick={() => {
                    onLayerChange(key as MapLayer);
                    setShowLayers(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors rounded mb-1 ${
                    selectedLayer === key
                      ? "bg-bg-200 text-text-100"
                      : "hover:bg-bg-200 text-text-200 hover:text-text-100"
                  }`}
                >
                  {layer.icon}
                  <span className="font-medium">{layer.name}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <MapBtn onClick={setTopView} title="Vista superior (2D)">
        <IconMapMinus size={20} />
      </MapBtn>
      <MapBtn onClick={set3DView} title="Vista 3D">
        <Icon3dCubeSphere size={20} />
      </MapBtn>
      <MapBtn onClick={resetNorth} title="Orientar al norte">
        <IconCompass size={20} />
      </MapBtn>
      <MapBtn onClick={resetView} title="Resetear vista">
        <IconRefresh size={20} />
      </MapBtn>

      <MapBtn onClick={zoomIn} title="Acercar">
        <IconPlus size={20} />
      </MapBtn>
      <MapBtn onClick={zoomOut} title="Alejar">
        <IconMinus size={20} />
      </MapBtn>
    </div>
  );
});

export default MapControls;
