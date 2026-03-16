import { useState, useRef, useCallback, useMemo } from "react";
import ReactMapGL from "react-map-gl";
import type { MapRef, MapLayerMouseEvent } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import "./radar-effects.css";
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
import { RADAR_INSTANCES } from "../../config";
import type { RadarInstanceConfig } from "../../config";
import { RadarProvider } from "../../context";
import { useRadarContext } from "../../context/useRadarContext";
import type { HistoryRange } from "../controls/HistoryRangeBar";
import { RadarZonesLayer } from "./RadarZonesLayer";
import { RadarTargetsLayer } from "./RadarTargetsLayer";
import { DrawingPreviewLayer } from "./DrawingPreviewLayer";
import { RadarInfoOverlay } from "./RadarInfoOverlay";
import { DevicesOverlay } from "./DevicesOverlay";
import type { DeviceVisibility } from "./DevicesOverlay";
import { ALL_VISIBLE } from "./devicesConfig";
import { DeviceSelector } from "./DeviceSelector";
import Camera from "./cameras/Camera";
import ConfigZones from "./zones/ConfigZones";

interface RadarMapProps {
  historyRange?: HistoryRange;
  radarInstance?: RadarInstanceConfig;
}

const ALL_TARGET_LAYER_IDS = RADAR_INSTANCES.map(
  (inst) => `targets-circles-${inst.id}`,
);

/** Renderiza zonas y targets de un radar secundario (beam/rings vienen de DevicesOverlay). */
function SecondaryRadarLayers({ historyRange }: { historyRange: HistoryRange }) {
  const { targets, zones } = useRadarContext();
  return (
    <>
      <RadarZonesLayer zones={zones} />
      <RadarTargetsLayer
        targets={targets}
        historyRange={historyRange}
        selectedTargetId={null}
        onSelectTarget={() => { }}
      />
    </>
  );
}

export function RadarMap({ historyRange = { start: 0, end: 100 } }: RadarMapProps) {
  const {
    config,
    targets,
    zones,
    isDrawing,
    drawingPoints,
    zoneColor,
    addDrawingPoint,
    instanceConfig,
  } = useRadarContext();

  const mapRef = useRef<MapRef>(null);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [selectedLayer, setSelectedLayer] = useState<MapLayer>("dark");
  const [deviceVisibility, setDeviceVisibility] = useState<DeviceVisibility>(ALL_VISIBLE);

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

  const defaultCenter = instanceConfig.map.fallbackCenter;

  const handleMapClick = (e: MapLayerMouseEvent) => {
    if (isDrawing) {
      addDrawingPoint(e.lngLat.lat, e.lngLat.lng);
      return;
    }

    const feature = e.features?.[0];
    if (feature?.layer?.id && ALL_TARGET_LAYER_IDS.includes(feature.layer.id)) {
      setSelectedTargetId(String(feature.properties?.id ?? null));
    } else {
      setSelectedTargetId(null);
    }
  };

  return (
    <div className="radar-shell grow h-full flex border-r border-emerald-500/20">
      <div className="relative flex-1 h-full">
        <ReactMapGL
          ref={mapRef}
          initialViewState={{
            latitude: defaultCenter.latitude || initialCenter.latitude,
            longitude: defaultCenter.longitude || initialCenter.longitude,
            zoom: instanceConfig.map.zoom,
            pitch: instanceConfig.map.pitch,
            bearing: instanceConfig.map.bearing,
          }}
          //  -41.46239837025373, -72.9882059747647
          mapboxAccessToken={MAPBOX_TOKEN}
          mapStyle={mapLayers[selectedLayer].style}
          style={{ width: "100%", height: "100%" }}
          attributionControl={false}
          reuseMaps
          interactiveLayerIds={ALL_TARGET_LAYER_IDS}
          onClick={handleMapClick}
          cursor={isDrawing ? "crosshair" : undefined}
        >
          <DevicesOverlay visibility={deviceVisibility} />
          <RadarZonesLayer zones={zones} />
          <DrawingPreviewLayer points={drawingPoints} color={zoneColor} />
          
          {RADAR_INSTANCES.slice(1).map((instance) => (
            <RadarProvider key={instance.id} instance={instance}>
              <SecondaryRadarLayers historyRange={historyRange} />
            </RadarProvider>
          ))}
          <RadarTargetsLayer
            targets={targets}
            historyRange={historyRange}
            selectedTargetId={selectedTargetId}
            onSelectTarget={setSelectedTargetId}
          />
        </ReactMapGL>

        <div className="radar-scanlines" />
        <div className="radar-vignette" />
        <RadarInfoOverlay config={config} />
      </div>
      <Camera />
      <div className="relative h-full bg-bg-100/85 backdrop-blur-sm flex flex-col gap-1 p-1.5 border-l border-emerald-500/20">
        <div className="flex flex-col p-1 gap-1 radar-chip rounded-md">
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
          <ConfigZones />
          <DeviceSelector
            visibility={deviceVisibility}
            onChange={setDeviceVisibility}
          />
        </div>
        <div className="flex justify-center items-center h-full">
          <span className="[writing-mode:vertical-rl] truncate rotate-180 text-[11px] tracking-[0.3em] text-emerald-300/70 font-light uppercase">
            Configuración Mapa
          </span>
        </div>
      </div>
    </div>
  );
}
