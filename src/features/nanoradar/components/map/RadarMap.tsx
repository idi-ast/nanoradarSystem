import { useState, useRef, useCallback, useMemo } from "react";
import ReactMapGL from "react-map-gl";
import type { MapRef, MapLayerMouseEvent } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  IconMap,
  IconWorld,
  IconSatellite,
  IconMapPin,
} from "@tabler/icons-react";
import { MAPBOX_TOKEN, MAP_STYLES } from "@/components/baseMap/libs";
import type { MapLayer, MapLayerConfig } from "@/components/baseMap/types";
import CustomZoomControl from "@/components/baseMap/components/CustomZoomControl";
import ViewControls from "@/components/baseMap/components/ViewControls";
import LayerSelector from "@/components/baseMap/components/LayerSelector";
import { useRadarContext } from "../../context/useRadarContext";
import { RadarBeam } from "./RadarBeam";
import { RadarRings } from "./RadarRings";
import { RadarZonesLayer } from "./RadarZonesLayer";
import { RadarTargetsLayer } from "./RadarTargetsLayer";
import { DrawingPreviewLayer } from "./DrawingPreviewLayer";
import { RadarInfoOverlay } from "./RadarInfoOverlay";

export function RadarMap() {
  const {
    config,
    targets,
    zones,
    isDrawing,
    drawingPoints,
    zoneColor,
    addDrawingPoint,
  } = useRadarContext();

  const mapRef = useRef<MapRef>(null);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [selectedLayer, setSelectedLayer] = useState<MapLayer>("dark");

  const mapLayers = useMemo<Record<MapLayer, MapLayerConfig>>(
    () => ({
      street: {
        name: "Mapa de Calles",
        icon: <IconMap size={20} />,
        style: MAP_STYLES.street,
      },
      dark: {
        name: "Mapa Oscuro",
        icon: <IconWorld size={20} />,
        style: MAP_STYLES.dark,
      },
      satellite: {
        name: "Satelital Clásico",
        icon: <IconSatellite size={20} />,
        style: MAP_STYLES.satellite,
      },
      smooth: {
        name: "Satelital Clear",
        icon: <IconMapPin size={20} />,
        style: MAP_STYLES.smooth,
      },
    }),
    [],
  );

  const handleLayerChange = useCallback((layer: MapLayer) => {
    setSelectedLayer(layer);
  }, []);

  if (!config) {
    return (
      <div className="grow h-full flex flex-col gap-5 items-center justify-center bg-bg-100 border-r border-emerald-500/20 ">
        <div className="w-10 h-10 rounded-full border-4 border-bg-400 border-l-transparent animate-spin "></div>
        <small className="text-bg-400 font-mono  animate-pulse">
          Cargando configuración del radar...
        </small>
      </div>
    );
  }

  const initialCenter = {
    longitude: parseFloat(config.longitud),
    latitude: parseFloat(config.latitud),
  };

  const handleMapClick = (e: MapLayerMouseEvent) => {
    if (isDrawing) {
      addDrawingPoint(e.lngLat.lat, e.lngLat.lng);
      return;
    }

    setSelectedTargetId(null);
  };

  return (
    <div className="grow h-full flex border-r border-emerald-500/20">
      <div className="relative flex-1 h-full">
        <ReactMapGL
          ref={mapRef}
          initialViewState={{
            latitude: initialCenter.latitude,
            longitude: initialCenter.longitude,
            zoom: 15,
          }}
          mapboxAccessToken={MAPBOX_TOKEN}
          mapStyle={mapLayers[selectedLayer].style}
          style={{ width: "100%", height: "100%" }}
          attributionControl={false}
          reuseMaps
          onClick={handleMapClick}
          cursor={isDrawing ? "crosshair" : undefined}
        >
          {/* Capas del radar - orden importa: de fondo a frente */}
          <RadarBeam config={config} />
          <RadarRings config={config} />
          <RadarZonesLayer zones={zones} />
          <DrawingPreviewLayer points={drawingPoints} color={zoneColor} />
          <RadarTargetsLayer
            targets={targets}
            selectedTargetId={selectedTargetId}
            onSelectTarget={setSelectedTargetId}
            markerModelSrc="/3d/point.glb"
            markerSizeScale={0.2}
          />
        </ReactMapGL>

        {/* Overlay HTML con info del radar (posicionado sobre el mapa) */}
        <RadarInfoOverlay config={config} />
      </div>

      {/* Panel de configuración del mapa */}
      <div className="relative h-full z-50 bg-bg-100 flex flex-col gap-1 p-1">
        <div className="flex flex-col p-0.5 gap-1 border border-border rounded py-1">
          <LayerSelector
            selectedLayer={selectedLayer}
            onLayerChange={handleLayerChange}
            mapLayers={mapLayers}
          />
          <ViewControls
            mapRef={mapRef}
            initialCenter={initialCenter}
            initialZoom={15}
          />
          <CustomZoomControl mapRef={mapRef} />
        </div>

        <div className="flex justify-center items-center h-full">
          <span className="[writing-mode:vertical-rl] truncate rotate-180 text-base tracking-[0.3em] text-text-300 font-light">
            Configuración Mapa
          </span>
        </div>
      </div>
    </div>
  );
}
