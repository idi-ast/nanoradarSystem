import { useState, useRef, useCallback, useMemo, useEffect, memo } from "react";
import ReactMapGL, { Source, Layer, Marker } from "react-map-gl";
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
import MapControls from "@/components/baseMap/components/MapControls";
import { RADAR_INSTANCES } from "../../config";
import type { RadarInstanceConfig } from "../../config";
import { RadarProvider } from "../../context";
import { useRadarContext } from "../../context/useRadarContext";
import { RadarZonesLayer } from "./RadarZonesLayer";
import { RadarZonesPulseLayer } from "./RadarZonesPulseLayer";
import { RadarTargetsLayer } from "./RadarTargetsLayer";
import { DrawingPreviewLayer } from "./DrawingPreviewLayer";
import { RadarInfoOverlay } from "./RadarInfoOverlay";
import { DevicesOverlay } from "./DevicesOverlay";
import type { DeviceVisibility } from "./DevicesOverlay";
import { ALL_VISIBLE, DEVICES_BELOW_LAYER_ID } from "./devicesConfig";
import { DeviceSelector } from "./DeviceSelector";
import type { EditingDevice, LiveEditValues } from "./DeviceEditPanel";
import { RadarKnob } from "./RadarKnob";
import { ZonesPanel } from "./zones/ZonesPanel";
import { CameraActivityOverlay } from "./CameraActivityOverlay";
import { MapPanelProvider } from "./MapPanelContext";

import type { DeviceFilter } from "../../types";
import type { HistoryRange } from "../controls/HistoryRangeBar";
import { PageLoader } from "@/components/ui";
import { useTargetVisualStore } from "../../stores/targetVisualStore";

interface RadarMapProps {
  historyRange?: HistoryRange;
  radarInstance?: RadarInstanceConfig;
  deviceFilter?: DeviceFilter;
  visibility?: DeviceVisibility;
  onVisibilityChange?: (v: DeviceVisibility) => void;
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
  return (
    <>
      <RadarZonesLayer zones={zones} />
      <RadarZonesPulseLayer />
      <RadarTargetsLayer
        historyRange={historyRange}
        selectedTargetId={null}
        onSelectTarget={() => { }}
      />
    </>
  );
}

export const RadarMap = memo(function RadarMap({
  historyRange = { start: 0, end: 100 },
  deviceFilter = "all",
  visibility: controlledVisibility,
  onVisibilityChange,
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
  const effectiveVisibility = controlledVisibility ?? deviceVisibility;
  const handleVisibilityChange = useCallback(
    (v: DeviceVisibility) => {
      setDeviceVisibility(v);
      onVisibilityChange?.(v);
    },
    [onVisibilityChange],
  );
  const [editingDevice, setEditingDevice] = useState<EditingDevice | null>(
    null,
  );
  const [liveEdit, setLiveEdit] = useState<LiveEditValues | null>(null);
  const [liveEditPos, setLiveEditPos] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapCenter, setMapCenter] = useState(() => ({
    lat: parseFloat(config?.latitud ?? "0"),
    lng: parseFloat(config?.longitud ?? "0"),
  }));

  const setCurrentViewportCenter = useTargetVisualStore((s) => s.setCurrentViewportCenter);
  const setCurrentViewportZoom = useTargetVisualStore((s) => s.setCurrentViewportZoom);

  const handleMoveEnd = useCallback(() => {
    const center = mapRef.current?.getCenter();
    const zoom = mapRef.current?.getZoom();
    if (center) {
      setMapCenter({ lat: center.lat, lng: center.lng });
      setCurrentViewportCenter({ latitude: center.lat, longitude: center.lng });
    }
    if (zoom !== undefined) {
      setCurrentViewportZoom(zoom);
    }
  }, [setCurrentViewportCenter, setCurrentViewportZoom]);

  function openEdit(ed: EditingDevice) {
    setEditingDevice(ed);
    if (ed.kind === "nanoradar") {
      const d = ed.device;
      setLiveEdit({
        grado: d.grado ?? 0,
        apertura: d.apertura ?? 0,
        radio: d.radio ?? 0,
        color: d.color || "#22c55e",
      });
      setLiveEditPos({ lat: Number(d.latitud), lng: Number(d.longitud) });
    } else if (ed.kind === "spotter") {
      const d = ed.device;
      setLiveEdit({
        grado: d.grado ?? 0,
        apertura: d.apertura ?? 0,
        radio: d.radio ?? 0,
        color: d.color || "#38bdf8",
      });
      setLiveEditPos({ lat: Number(d.latitude), lng: Number(d.longitude) });
    } else if (ed.kind === "camara") {
      const d = ed.device;
      setLiveEdit({
        grado: d.grado ?? 0,
        apertura: d.apertura ?? 0,
        radio: d.radio ?? 0,
        color: d.color || "#f59e0b",
      });
      setLiveEditPos({
        lat: Number(d.ubicacion.lat),
        lng: Number(d.ubicacion.lng),
      });
    }
  }

  function closeEdit() {
    setEditingDevice(null);
    setLiveEdit(null);
    setLiveEditPos(null);
  }

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


  const defaultCenter = instanceConfig.map.fallbackCenter;
  const customMapCenter = useTargetVisualStore((s) => s.customMapCenter);
  const customMapZoom = useTargetVisualStore((s) => s.customMapZoom);

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

  return (
    <div className="radar-shell grow h-full flex border-r border-emerald-500/20">
      <div className="relative flex-1 h-full">
        {!mapLoaded && <PageLoader />}
        <ReactMapGL
          ref={mapRef}
          initialViewState={{
            latitude: customMapCenter?.latitude ?? (defaultCenter.latitude || initialCenter.latitude),
            longitude: customMapCenter?.longitude ?? (defaultCenter.longitude || initialCenter.longitude),
            zoom: customMapZoom ?? instanceConfig.map.zoom,
            pitch: instanceConfig.map.pitch,
            bearing: instanceConfig.map.bearing,
          }}
          //  -41.46239837025373, -72.9882059747647
          mapboxAccessToken={MAPBOX_TOKEN}
          mapStyle={mapLayers[selectedLayer].style}
          style={{ width: "100%", height: "100%" }}
          attributionControl={false}
          reuseMaps
          interactiveLayerIds={editingDevice ? [] : ALL_TARGET_LAYER_IDS}
          onClick={handleMapClick}
          onMoveEnd={handleMoveEnd}
          onLoad={() => setMapLoaded(true)}
          cursor={
            isDrawing ? "crosshair" : editingDevice ? "default" : undefined
          }
          scrollZoom={!editingDevice}
          dragPan={!editingDevice}
          dragRotate={!editingDevice}
          touchPitch={!editingDevice}
          doubleClickZoom={!editingDevice}
          keyboard={!editingDevice}
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
            visibility={effectiveVisibility}
            deviceFilter={deviceFilter}
          />
          <MapControls
            mapRef={mapRef}
            selectedLayer={selectedLayer}
            onLayerChange={handleLayerChange}
            mapLayers={mapLayers}
            initialCenter={initialCenter}
            initialZoom={15}
          />
          <RadarZonesLayer zones={zones} />
          <RadarZonesPulseLayer />
          <DrawingPreviewLayer points={drawingPoints} color={zoneColor} />

          {RADAR_INSTANCES.slice(1).map((instance) => (
            <RadarProvider key={instance.id} instance={instance}>
              <SecondaryRadarLayers historyRange={historyRange} />
            </RadarProvider>
          ))}
          <RadarTargetsLayer
            deviceFilter={deviceFilter}
            historyRange={historyRange}
            selectedTargetId={selectedTargetId}
            onSelectTarget={setSelectedTargetId}
          />
          <CameraActivityOverlay
            mapRef={mapRef}
            defaultCenter={{
              longitude: defaultCenter.longitude || initialCenter.longitude,
              latitude: defaultCenter.latitude || initialCenter.latitude,
            }}
            defaultZoom={instanceConfig.map.zoom}
          />
          {liveEdit && liveEditPos && (
            <Marker
              latitude={liveEditPos.lat}
              longitude={liveEditPos.lng}
              anchor="center"
              style={{ zIndex: 9999 }}
            >
              <div
                onPointerDown={(e) => e.stopPropagation()}
                onPointerMove={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                <RadarKnob
                  grado={liveEdit.grado}
                  apertura={liveEdit.apertura}
                  radio={liveEdit.radio}
                  maxRadio={10000}
                  accentColor={liveEdit.color}
                  onGradoChange={(v) =>
                    setLiveEdit((p: LiveEditValues | null) =>
                      p ? { ...p, grado: v } : null,
                    )
                  }
                />
              </div>
            </Marker>
          )}
        </ReactMapGL>

        <div className="radar-scanlines" />
        <div className="radar-vignette" />
        <RadarInfoOverlay mapCenter={mapCenter} />
      </div>

      <div className="relative h-full bg-bg-100 backdrop-blur-sm flex ">
        <MapPanelProvider>
          <div className="flex flex-col gap-1 p-2 ">
            <ZonesPanel />
            <DeviceSelector
              visibility={effectiveVisibility}
              onChange={handleVisibilityChange}
              onEditNanoradar={(device) =>
                openEdit({ kind: "nanoradar", device })
              }
              onEditSpotter={(device) => openEdit({ kind: "spotter", device })}
              onEditCamara={(device) => openEdit({ kind: "camara", device })}
              editingDevice={editingDevice}
              liveEdit={liveEdit}
              onLiveEditChange={setLiveEdit}
              onEditClose={closeEdit}
            />
            <div className="flex justify-center items-center flex-1">
              <span className="[writing-mode:vertical-rl] truncate rotate-180 text-[11px] tracking-[0.3em] text-emerald-300/70 font-light uppercase">
                Configuraciones de dispositivos
              </span>
            </div>
          </div>
        </MapPanelProvider>
      </div>
    </div>
  );
});
