import { useState, useRef, useCallback, useMemo, useEffect, memo } from "react";
import ReactMapGL, { Source, Layer } from "react-map-gl";
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
import { useRadarTargets } from "../../context/useRadarContext";
import type { HistoryRange } from "../controls/HistoryRangeBar";
import { RadarZonesLayer } from "./RadarZonesLayer";
import { RadarZonesPulseLayer } from "./RadarZonesPulseLayer";
import { RadarTargetsLayer } from "./RadarTargetsLayer";
import { DrawingPreviewLayer } from "./DrawingPreviewLayer";
import { RadarInfoOverlay } from "./RadarInfoOverlay";
import { DevicesOverlay } from "./DevicesOverlay";
import type { DeviceVisibility } from "./DevicesOverlay";
import { ALL_VISIBLE, DEVICES_BELOW_LAYER_ID } from "./devicesConfig";
import { DeviceSelector } from "./DeviceSelector";
import { DeviceEditPanel } from "./DeviceEditPanel";
import type { EditingDevice } from "./DeviceEditPanel";
// import ConfigZones from "./zones/ConfigZones";
import Camera from "./cameras/Camera";
import { useConfigDevices } from "@/features/config-devices/hooks/useConfigDevices";

import type { DeviceFilter } from "../../types";

interface RadarMapProps {
  historyRange?: HistoryRange;
  radarInstance?: RadarInstanceConfig;
  deviceFilter?: DeviceFilter;
}

const ALL_TARGET_LAYER_IDS = RADAR_INSTANCES.map(
  (inst) => `targets-circles-${inst.id}`,
);

function SecondaryRadarLayers({
  historyRange,
}: {
  historyRange: HistoryRange;
}) {
  const { zones } = useRadarContext();
  const { targets } = useRadarTargets();
  return (
    <>
      <RadarZonesLayer zones={zones} />
      <RadarZonesPulseLayer />
      <RadarTargetsLayer
        targets={targets}
        historyRange={historyRange}
        selectedTargetId={null}
        onSelectTarget={() => {}}
      />
    </>
  );
}

export const RadarMap = memo(function RadarMap({
  historyRange = { start: 0, end: 100 },
  deviceFilter = "all",
}: RadarMapProps) {
  const {
    config,
    zones,
    isDrawing,
    drawingPoints,
    zoneColor,
    addDrawingPoint,
    instanceConfig,
    flyToZoneFn,
  } = useRadarContext();
  const { targets } = useRadarTargets();
  const filteredTargets = useMemo(
    () =>
      deviceFilter === "all"
        ? targets
        : targets.filter((t) => t.deviceType === deviceFilter),
    [targets, deviceFilter],
  );

  const mapRef = useRef<MapRef>(null);

  useEffect(() => {
    flyToZoneFn.current = (lat: number, lon: number, zoom = 16) => {
      mapRef.current?.flyTo({
        center: [lon, lat],
        zoom,
        duration: 1500,
        essential: true,
      });
    };
    return () => {
      flyToZoneFn.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [selectedLayer, setSelectedLayer] = useState<MapLayer>("dark");
  const [deviceVisibility, setDeviceVisibility] =
    useState<DeviceVisibility>(ALL_VISIBLE);
  const [editingDevice, setEditingDevice] = useState<EditingDevice | null>(
    null,
  );

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

  const initialCenter = useMemo(
    () => ({
      longitude: parseFloat(config?.longitud ?? "0"),
      latitude: parseFloat(config?.latitud ?? "0"),
    }),
    [config?.longitud, config?.latitud],
  );

  const handleMapClick = useCallback(
    (e: MapLayerMouseEvent) => {
      if (isDrawing) {
        addDrawingPoint(e.lngLat.lat, e.lngLat.lng);
        return;
      }

      const feature = e.features?.[0];
      if (
        feature?.layer?.id &&
        ALL_TARGET_LAYER_IDS.includes(feature.layer.id)
      ) {
        setSelectedTargetId(String(feature.properties?.id ?? null));
      } else {
        setSelectedTargetId(null);
      }
    },
    [isDrawing, addDrawingPoint],
  );

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

  const defaultCenter = instanceConfig.map.fallbackCenter;

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
          <Source
            id="device-layers-upper-bound-src"
            type="geojson"
            data={{ type: "FeatureCollection", features: [] }}
          >
            <Layer
              id={DEVICES_BELOW_LAYER_ID}
              type="fill"
              paint={{ "fill-opacity": 0 }}
            />
          </Source>

          <DevicesOverlay
            visibility={deviceVisibility}
            deviceFilter={deviceFilter}
          />
          <div className="flex absolute right-2 top-2 z-10  p-1  gap-1 radar-chip rounded-md">
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
          <RadarZonesLayer zones={zones} />
          <RadarZonesPulseLayer />
          <DrawingPreviewLayer points={drawingPoints} color={zoneColor} />

          {RADAR_INSTANCES.slice(1).map((instance) => (
            <RadarProvider key={instance.id} instance={instance}>
              <SecondaryRadarLayers historyRange={historyRange} />
            </RadarProvider>
          ))}
          <RadarTargetsLayer
            targets={filteredTargets}
            historyRange={historyRange}
            selectedTargetId={selectedTargetId}
            onSelectTarget={setSelectedTargetId}
          />
        </ReactMapGL>

        <div className="radar-scanlines" />
        <div className="radar-vignette" />
        <RadarInfoOverlay config={config} />
        <CamerasOverlay />
      </div>
      <div className="relative h-full bg-bg-100/85 backdrop-blur-sm flex border-l border-emerald-500/20">
        <div className="flex flex-col gap-1 p-1.5">
          {/* <ConfigZones /> */}
          <DeviceSelector
            visibility={deviceVisibility}
            onChange={setDeviceVisibility}
            onEditNanoradar={(device) =>
              setEditingDevice({ kind: "nanoradar", device })
            }
            onEditSpotter={(device) =>
              setEditingDevice({ kind: "spotter", device })
            }
            onEditCamara={(device) =>
              setEditingDevice({ kind: "camara", device })
            }
          />
          <div className="flex justify-center items-center flex-1">
            <span className="[writing-mode:vertical-rl] truncate rotate-180 text-[11px] tracking-[0.3em] text-emerald-300/70 font-light uppercase">
              Configuración Mapa
            </span>
          </div>
        </div>
        <div className="absolute  bg-bg-100 top-30 right-66 rounded-2xl z-9999">
          {editingDevice && (
            <DeviceEditPanel
              editing={editingDevice}
              onClose={() => setEditingDevice(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
});

const CamerasOverlay = memo(function CamerasOverlay() {
  const { data } = useConfigDevices();
  const camaras = data?.data?.camaras;
  if (!camaras || camaras.length === 0) return null;
  return (
    <div className="absolute bottom-0 left-0 flex flex-row items-end gap-2 z-100">
      {camaras.map((cam) => (
        <Camera key={cam.id} camera={cam} />
      ))}
    </div>
  );
});
