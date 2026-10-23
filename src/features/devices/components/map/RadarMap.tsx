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
  IconSun,
  IconMountain,
  IconNavigation,
  IconMoon,
  IconTrees,
  IconLayout,
  IconStack,
  IconCar,
  IconBolt,
  IconSquare,
  IconRoad,
  IconBrightnessUp,
  IconMoonStars,
  IconLeaf,
} from "@tabler/icons-react";
import { MAPBOX_TOKEN, THEME_MAP_LAYER } from "@/components/baseMap/libs";
import type { MapLayer, MapLayerConfig } from "@/components/baseMap/types";
import { useTheme } from "@/context/ThemeContext";
import MapControls from "@/components/baseMap/components/MapControls";
import ManualPtzButton from "./cameras/ptz/components/ManualPtzButton";
import { RADAR_INSTANCES } from "../../config";
import type { RadarInstanceConfig } from "../../config";
import { RadarProvider } from "../../context";
import { useRadarContext } from "../../context/useRadarContext";
import { RadarZonesLayer } from "./RadarZonesLayer";
import { RadarZonesPulseLayer } from "./RadarZonesPulseLayer";
import { RadarTargetsLayer } from "./RadarTargetsLayer";
import { DrawingPreviewLayer } from "./DrawingPreviewLayer";
import { ZoneEditLayer } from "./ZoneEditLayer";
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
import { IconCrosshair, IconArrowsHorizontal } from "@tabler/icons-react";
import { createSectorCoords, haversineDistanceM } from "./utils/geoHelpers";

import type { DeviceFilter } from "../../types";
import type { HistoryRange } from "../controls/HistoryRangeBar";
import { useTargetVisualStore } from "../../stores/targetVisualStore";
import { useCameraCalibrationStore } from "../../stores/cameraCalibrationStore";
import { useCameraCalibration } from "../../hooks/useCameraCalibration";
import { useRole } from "@/context/role";

interface RadarMapProps {
  historyRange?: HistoryRange;
  radarInstance?: RadarInstanceConfig;
  deviceFilter?: DeviceFilter;
  visibility?: DeviceVisibility;
  onVisibilityChange?: (v: DeviceVisibility) => void;
  selectedTargetId?: string | null;
  onSelectTarget?: (id: string | null) => void;
  showPopup?: boolean;
  historyTrackPoints?: import("../../types").TrackHistoryPoint[];
  historyTrackRange?: HistoryRange;
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
        historyTrackPoints={undefined}
        historyTrackRange={{ start: 0, end: 100 }}
      />
    </>
  );
}

function LiveDevicePreviewLayer({
  lat,
  lng,
  radio,
  apertura,
  grado,
  color,
}: {
  lat: number;
  lng: number;
  radio: number;
  apertura: number;
  grado: number;
  color: string;
}) {
  const startAngle = grado - apertura / 2;
  const endAngle = grado + apertura / 2;

  const data = useMemo(() => {
    return {
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          geometry: {
            type: "Polygon" as const,
            coordinates: [
              createSectorCoords(lat, lng, radio, startAngle, endAngle, 64),
            ],
          },
          properties: {},
        },
      ],
    };
  }, [lat, lng, radio, startAngle, endAngle]);

  return (
    <Source id="live-edit-preview-src" type="geojson" data={data}>
      <Layer
        id="live-edit-preview-fill"
        type="fill"
        beforeId={DEVICES_BELOW_LAYER_ID}
        paint={{ "fill-color": color, "fill-opacity": 0.25 }}
      />
      <Layer
        id="live-edit-preview-line"
        type="line"
        beforeId={DEVICES_BELOW_LAYER_ID}
        paint={{
          "line-color": color,
          "line-width": 2,
          "line-opacity": 0.8,
          "line-dasharray": [2, 2],
        }}
      />
    </Source>
  );
}

export const RadarMap = memo(function RadarMap({
  historyRange = { start: 0, end: 100 },
  deviceFilter = "all",
  visibility: controlledVisibility,
  onVisibilityChange,
  selectedTargetId: controlledSelectedTargetId,
  onSelectTarget: controlledOnSelectTarget,
  showPopup,
  historyTrackPoints,
  historyTrackRange,
}: RadarMapProps) {
  const {
    config,
    zones,
    isDrawing,
    drawingPoints,
    zoneColor,
    addDrawingPoint,
    updateDrawingPoint,
    removeDrawingPointAtIndex,
    instanceConfig,
    flyToZoneFn,
  } = useRadarContext();
  const mapRef = useRef<MapRef>(null);
  const shellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = shellRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      mapRef.current?.resize();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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
  const [internalSelectedTargetId, setInternalSelectedTargetId] = useState<
    string | null
  >(null);
  const selectedTargetId =
    controlledSelectedTargetId ?? internalSelectedTargetId;
  const setSelectedTargetId =
    controlledOnSelectTarget ?? setInternalSelectedTargetId;
  const [selectedLayer, setSelectedLayer] = useState<MapLayer>("satellite");
  const { theme } = useTheme();
  // En tema light el mapa se fija en "Navegacion Dia" y se descarta la
  // eleccion manual; al volver a dark se recupera la capa del usuario.
  const activeLayer: MapLayer =
    theme === "light" ? THEME_MAP_LAYER : selectedLayer;
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
  const [isPickingPosition, setIsPickingPosition] = useState(false);
  const [, setMapLoaded] = useState(false);

  const [mapCenter, setMapCenter] = useState(() => {
    const saved = useTargetVisualStore.getState().customMapCenter;
    if (
      saved &&
      typeof saved.latitude === "number" &&
      typeof saved.longitude === "number" &&
      !isNaN(saved.latitude) &&
      !isNaN(saved.longitude)
    ) {
      return { lat: saved.latitude, lng: saved.longitude };
    }
    const lat = parseFloat(config?.latitud ?? "0");
    const lng = parseFloat(config?.longitud ?? "0");
    if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
      return { lat, lng };
    }
    return {
      lat: instanceConfig.map.fallbackCenter?.latitude ?? -41.46281337025373,
      lng: instanceConfig.map.fallbackCenter?.longitude ?? -72.9883559747647,
    };
  });

  // ── Calibración de cámara ──
  const { calibrate, gotoGps } = useCameraCalibration();
  const calibratingCameraId = useCameraCalibrationStore(
    (s) => s.calibratingCameraId,
  );
  const calibratingIsPtz = useCameraCalibrationStore((s) => s.calibratingIsPtz);
  const calibrationMode = useCameraCalibrationStore((s) => s.mode);
  const isCalibrating = calibratingCameraId !== null;

  const setCurrentViewportCenter = useTargetVisualStore(
    (s) => s.setCurrentViewportCenter,
  );
  const setCurrentViewportZoom = useTargetVisualStore(
    (s) => s.setCurrentViewportZoom,
  );

  const [visibleWidthM, setVisibleWidthM] = useState<number | null>(null);
  const [scaleBar, setScaleBar] = useState<{ widthPx: number; label: string } | null>(null);

  const updateVisibleSpan = useCallback(() => {
    const map = mapRef.current?.getMap?.() ?? mapRef.current;
    if (!map) return;
    const canvas = typeof map.getCanvas === "function" ? map.getCanvas() : null;
    const w = canvas ? canvas.clientWidth || canvas.width : 0;
    const h = canvas ? canvas.clientHeight || canvas.height : 0;
    if (w <= 0 || h <= 0) return;

    try {
      const left = map.unproject([0, h / 2]);
      const right = map.unproject([w, h / 2]);
      if (left && right) {
        const dist = haversineDistanceM(left.lat, left.lng, right.lat, right.lng);
        if (Number.isFinite(dist) && dist > 0) {
          setVisibleWidthM(dist);

          const metersPerPx = dist / w;
          const maxMeters = 130 * metersPerPx;
          const candidateSteps = [
            1, 2, 5, 10, 20, 50, 100, 200, 500,
            1_000, 2_000, 5_000, 10_000, 20_000, 50_000,
            100_000, 200_000, 500_000, 1_000_000,
          ];
          let chosen = candidateSteps[0];
          for (const step of candidateSteps) {
            if (step <= maxMeters) chosen = step;
            else break;
          }
          const widthPx = Math.max(36, Math.round(chosen / metersPerPx));
          const label = chosen >= 1000 ? `${chosen / 1000} km` : `${chosen} m`;
          setScaleBar({ widthPx, label });
        }
      }
    } catch {
      // Ignorar si el mapa aún no inicializó proyección
    }
  }, []);

  const formatSpanDistance = (meters: number | null) => {
    if (meters == null || isNaN(meters)) return "--";
    if (meters < 1000) {
      return `~${Math.round(meters)} m`;
    }
    if (meters < 10000) {
      return `~${(meters / 1000).toFixed(1)} km`;
    }
    return `~${(meters / 1000).toFixed(0)} km`;
  };

  useEffect(() => {
    updateVisibleSpan();
    const interval = setInterval(() => {
      if (mapRef.current?.getMap?.() ?? mapRef.current) {
        updateVisibleSpan();
      }
    }, 500);
    window.addEventListener("resize", updateVisibleSpan);
    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", updateVisibleSpan);
    };
  }, [updateVisibleSpan]);

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
    updateVisibleSpan();
  }, [setCurrentViewportCenter, setCurrentViewportZoom, updateVisibleSpan]);

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
      const lat = Number(d.latitud);
      const lng = Number(d.longitud);
      setLiveEditPos(!isNaN(lat) && !isNaN(lng) ? { lat, lng } : null);
    } else if (ed.kind === "magosradar") {
      const d = ed.device;
      setLiveEdit({
        grado: d.grado ?? 0,
        apertura: d.apertura ?? 0,
        radio: d.radio ?? 0,
        color: d.color || "#f43f5e",
      });
      const lat = Number(d.latitud);
      const lng = Number(d.longitud);
      setLiveEditPos(!isNaN(lat) && !isNaN(lng) ? { lat, lng } : null);
    } else if (ed.kind === "spotter") {
      const d = ed.device;
      setLiveEdit({
        grado: d.grado ?? 0,
        apertura: d.apertura ?? 0,
        radio: d.radio ?? 0,
        color: d.color || "#38bdf8",
      });
      const lat = Number(d.latitude);
      const lng = Number(d.longitude);
      setLiveEditPos(!isNaN(lat) && !isNaN(lng) ? { lat, lng } : null);
    } else if (ed.kind === "camara") {
      const d = ed.device;
      setLiveEdit({
        grado: d.grado ?? 0,
        apertura: d.apertura ?? 0,
        radio: d.radio ?? 0,
        color: d.color || "#f59e0b",
      });
      const lat = Number(d.ubicacion?.lat);
      const lng = Number(d.ubicacion?.lng);
      setLiveEditPos(!isNaN(lat) && !isNaN(lng) ? { lat, lng } : null);
    } else if (ed.kind === "ptz") {
      const d = ed.device;
      setLiveEdit({
        grado: d.grado ?? 0,
        apertura: d.apertura ?? 0,
        radio: d.radio ?? 0,
        color: d.color || "#8207d5",
      });
      const lat = Number(d.ubicacion?.lat);
      const lng = Number(d.ubicacion?.lng);
      setLiveEditPos(!isNaN(lat) && !isNaN(lng) ? { lat, lng } : null);
    }
  }

  function closeEdit() {
    setEditingDevice(null);
    setLiveEdit(null);
    setLiveEditPos(null);
    setIsPickingPosition(false);
  }

  const mapLayers = useMemo<Record<MapLayer, MapLayerConfig>>(
    () => ({
      street: {
        name: "Mapa de Calles",
        icon: <IconMap size={20} />,
        style: "mapbox://styles/mapbox/streets-v12",
      },
      dark: {
        name: "Mapa Oscuro",
        icon: <IconWorld size={20} />,
        style: "mapbox://styles/mapbox/dark-v11",
      },
      satellite: {
        name: "Satelital Clásico",
        icon: <IconSatellite size={20} />,
        style: "mapbox://styles/mapbox/satellite-streets-v12",
      },
      smooth: {
        name: "Satelital Clear",
        icon: <IconMapPin size={20} />,
        style: "mapbox://styles/mapbox/satellite-v9",
      },
      light: {
        name: "Mapa Claro",
        icon: <IconSun size={20} />,
        style: "mapbox://styles/mapbox/light-v11",
      },
      outdoors: {
        name: "Aventuras / Outdoor",
        icon: <IconMountain size={20} />,
        style: "mapbox://styles/mapbox/outdoors-v12",
      },
      navigation_day: {
        name: "Navegación Día",
        icon: <IconNavigation size={20} />,
        style: "mapbox://styles/mapbox/navigation-day-v1",
      },
      navigation_night: {
        name: "Navegación Noche",
        icon: <IconMoon size={20} />,
        style: "mapbox://styles/mapbox/navigation-night-v1",
      },
      terrain: {
        name: "Relieve / Terreno",
        icon: <IconTrees size={20} />,
        style: "mapbox://styles/mapbox/outdoors-v12",
      },
      blueprint: {
        name: "Planos / Blueprint",
        icon: <IconLayout size={20} />,
        style: "mapbox://styles/mapbox/cj7qzzm1u20ia2rp6v7ndznb2",
      },
      standard: {
        name: "Mapbox Standard",
        icon: <IconStack size={20} />,
        style: "mapbox://styles/mapbox/standard",
      },
      traffic_day: {
        name: "Tráfico en Vivo",
        icon: <IconCar size={20} />,
        style: "mapbox://styles/mapbox/traffic-day-v2",
      },
      traffic_night: {
        name: "Tráfico Nocturno",
        icon: <IconBolt size={20} />,
        style: "mapbox://styles/mapbox/traffic-night-v2",
      },
      blank: {
        name: "Lienzo Vacío",
        icon: <IconSquare size={20} />,
        style: "mapbox://styles/mapbox/empty-v9",
      },

      // --- 15 NUEVAS CAPAS ADICIONALES ---
      streets_v11: {
        name: "Calles Clásico",
        icon: <IconRoad size={20} />,
        style: "mapbox://styles/mapbox/streets-v11",
      },
      light_v10: {
        name: "Claro Minimal",
        icon: <IconBrightnessUp size={20} />,
        style: "mapbox://styles/mapbox/light-v10",
      },
      dark_v10: {
        name: "Oscuro Profundo",
        icon: <IconMoonStars size={20} />,
        style: "mapbox://styles/mapbox/dark-v10",
      },
      emerald: {
        name: "Estilo Esmeralda",
        icon: <IconLeaf size={20} />,
        style: "mapbox://styles/mapbox/emerald-v8",
      },
    }),
    [],
  );

  const handleLayerChange = useCallback((layer: MapLayer) => {
    setSelectedLayer(layer);
  }, []);

  const handleMapClick = useCallback(
    (e: MapLayerMouseEvent) => {
      // ── Modo calibración: prioridad máxima ──
      if (isCalibrating && calibratingCameraId !== null) {
        if (!calibratingIsPtz) {
          // Cámaras fijas: solo vista previa (no pueden girar)
          calibrate(calibratingCameraId, false, e.lngLat.lat, e.lngLat.lng);
          return;
        }

        if (calibrationMode === "save") {
          // Modo "save": solo MARCA el punto de referencia en el mapa.
          // El guardado (única escritura de calibración) se confirma desde
          // el panel de calibración con "Guardar referencia".
          useCameraCalibrationStore
            .getState()
            .setClickPoint({ lat: e.lngLat.lat, lon: e.lngLat.lng });
        } else {
          // Giro: la cámara apunta físicamente al punto clickeado (sin guardar)
          gotoGps(calibratingCameraId, e.lngLat.lat, e.lngLat.lng);
        }
        return;
      }

      if (isDrawing) {
        addDrawingPoint(e.lngLat.lat, e.lngLat.lng);
        return;
      }

      if (isPickingPosition) {
        setLiveEditPos({ lat: e.lngLat.lat, lng: e.lngLat.lng });
        setIsPickingPosition(false);
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
    [
      isCalibrating,
      calibratingCameraId,
      calibratingIsPtz,
      calibrationMode,
      calibrate,
      gotoGps,
      isDrawing,
      addDrawingPoint,
      isPickingPosition,
    ],
  );

  const defaultCenter = instanceConfig.map.fallbackCenter;
  const customMapCenter = useTargetVisualStore((s) => s.customMapCenter);
  const customMapZoom = useTargetVisualStore((s) => s.customMapZoom);
  const { isSuperAdmin, isAdmin } = useRole();

  const effectiveInitialCenter = useMemo(() => {
    if (
      customMapCenter &&
      typeof customMapCenter.latitude === "number" &&
      typeof customMapCenter.longitude === "number" &&
      !isNaN(customMapCenter.latitude) &&
      !isNaN(customMapCenter.longitude)
    ) {
      return {
        latitude: customMapCenter.latitude,
        longitude: customMapCenter.longitude,
      };
    }
    const latCfg = parseFloat(config?.latitud ?? "0");
    const lonCfg = parseFloat(config?.longitud ?? "0");
    if (!isNaN(latCfg) && !isNaN(lonCfg) && latCfg !== 0 && lonCfg !== 0) {
      return { latitude: latCfg, longitude: lonCfg };
    }
    return {
      latitude: defaultCenter?.latitude || -41.46281337025373,
      longitude: defaultCenter?.longitude || -72.9883559747647,
    };
  }, [customMapCenter, config?.latitud, config?.longitud, defaultCenter]);

  const effectiveInitialZoom = useMemo(() => {
    if (
      typeof customMapZoom === "number" &&
      !isNaN(customMapZoom) &&
      customMapZoom > 0
    ) {
      return customMapZoom;
    }
    return instanceConfig.map.zoom ?? 15;
  }, [customMapZoom, instanceConfig.map.zoom]);

  // if (!config) {
  //   return (
  //     <div className="grow h-full flex flex-col gap-5 items-center justify-center bg-bg-100 border-r border-emerald-500/20 ">
  //       <div className="w-10 h-10 rounded-full border-4 border-bg-400 border-l-transparent animate-spin "></div>
  //       <small className="text-bg-400 font-mono  animate-pulse">
  //         Cargando configuración del radar...
  //       </small>
  //     </div>
  //   );
  // }

  return (
    <div ref={shellRef} className="radar-shell grow h-full flex ">
      <div className="relative flex-1 h-full">
        {/* {!mapLoaded && <PageLoader />} */}
        <ReactMapGL
          ref={mapRef}
          initialViewState={{
            latitude: effectiveInitialCenter.latitude,
            longitude: effectiveInitialCenter.longitude,
            zoom: effectiveInitialZoom,
            pitch: instanceConfig.map.pitch,
            bearing: instanceConfig.map.bearing,
          }}
          //  -41.46239837025373, -72.9882059747647
          mapboxAccessToken={MAPBOX_TOKEN}
          mapStyle={mapLayers[activeLayer].style}
          style={{ width: "100%", height: "100%" }}
          attributionControl={false}
          reuseMaps
          interactiveLayerIds={editingDevice ? [] : ALL_TARGET_LAYER_IDS}
          onClick={handleMapClick}
          onMove={updateVisibleSpan}
          onMoveEnd={handleMoveEnd}
          onLoad={() => {
            setMapLoaded(true);
            updateVisibleSpan();
          }}
          cursor={
            isCalibrating
              ? "crosshair"
              : isDrawing
                ? "crosshair"
                : isPickingPosition
                  ? "crosshair"
                  : editingDevice
                    ? "default"
                    : undefined
          }
          scrollZoom={!editingDevice || isPickingPosition}
          dragPan={!editingDevice || isPickingPosition}
          dragRotate={!editingDevice && !isPickingPosition}
          touchPitch={!editingDevice && !isPickingPosition}
          doubleClickZoom={!editingDevice && !isPickingPosition}
          keyboard={!editingDevice && !isPickingPosition}
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
            selectedLayer={activeLayer}
            onLayerChange={handleLayerChange}
            mapLayers={mapLayers}
            initialCenter={effectiveInitialCenter}
            initialZoom={effectiveInitialZoom}
            extraButtons={<ManualPtzButton />}
          />
          <RadarZonesLayer zones={zones} />
          <RadarZonesPulseLayer />
          <DrawingPreviewLayer
            points={drawingPoints}
            color={zoneColor}
            onUpdatePoint={updateDrawingPoint}
            onRemovePoint={removeDrawingPointAtIndex}
          />
          <ZoneEditLayer />

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
            showPopup={showPopup}
            historyTrackPoints={historyTrackPoints}
            historyTrackRange={historyTrackRange}
          />
          <CameraActivityOverlay
            mapRef={mapRef}
            defaultCenter={{
              longitude: effectiveInitialCenter.longitude,
              latitude: effectiveInitialCenter.latitude,
            }}
            defaultZoom={effectiveInitialZoom}
          />
          {liveEdit && liveEditPos && !isNaN(liveEditPos.lat) && !isNaN(liveEditPos.lng) && (
            <>
              <LiveDevicePreviewLayer
                lat={liveEditPos.lat}
                lng={liveEditPos.lng}
                radio={liveEdit.radio}
                apertura={liveEdit.apertura}
                grado={liveEdit.grado}
                color={liveEdit.color}
              />
              <Marker
                latitude={liveEditPos.lat}
                longitude={liveEditPos.lng}
                anchor="center"
                style={{ zIndex: 9999 }}
                draggable={!isPickingPosition}
                onDrag={(e) => {
                  const { lat, lng } = e.lngLat;
                  setLiveEditPos({ lat, lng });
                }}
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
            </>
          )}

          {/* Overlay hint when picking position */}
          {isPickingPosition && (
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                pointerEvents: "none",
                zIndex: 10000,
              }}
            >
              <div className="flex flex-col items-center gap-2 animate-pulse">
                <div
                  className="p-3 rounded-full"
                  style={{
                    background: "rgba(16,185,129,0.15)",
                    border: "1.5px solid rgba(16,185,129,0.7)",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  <IconCrosshair size={28} color="#10b981" />
                </div>
                <span
                  className="text-xs font-semibold px-3 py-1 rounded-full"
                  style={{
                    background: "rgba(0,0,0,0.75)",
                    color: "#10b981",
                    border: "1px solid rgba(16,185,129,0.4)",
                    backdropFilter: "blur(8px)",
                    letterSpacing: "0.06em",
                  }}
                >
                  Haz clic en el mapa para mover el dispositivo
                </span>
              </div>
            </div>
          )}

        </ReactMapGL>

        {visibleWidthM != null && (
          <div className="absolute bottom-[42px] left-[12px] z-10 pointer-events-none flex flex-col gap-1 items-start">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#040a14]/90 border border-emerald-500/50 text-[10px] font-mono text-emerald-400 shadow-lg shadow-black/60 backdrop-blur-md">
              <IconArrowsHorizontal size={13} className="text-emerald-400 shrink-0" />
              <span className="tracking-wide">
                Ancho visible:{" "}
                <strong className="font-semibold text-text-100">
                  {formatSpanDistance(visibleWidthM)}
                </strong>
              </span>
            </div>

            {scaleBar && (
              <div
                style={{ width: `${scaleBar.widthPx}px` }}
                className="h-[18px] border-x-[1.5px] border-b-[1.5px] border-emerald-400 bg-[#040a14]/90 backdrop-blur-md rounded-b-[3px] shadow-lg shadow-black/60 flex items-center justify-center text-[10px] font-mono font-semibold text-emerald-400 tracking-wider select-none leading-none"
              >
                {scaleBar.label}
              </div>
            )}
          </div>
        )}

        <div className="radar-scanlines" />
        <div className="radar-vignette" />
        <RadarInfoOverlay mapCenter={mapCenter} />
      </div>

      <div className="relative h-full bg-bg-200 ">
        <MapPanelProvider>
          <div className="flex flex-col gap-1 p-2 ">
            {(isSuperAdmin || isAdmin) && (
              <DeviceSelector
                visibility={effectiveVisibility}
                onChange={handleVisibilityChange}
                onEditNanoradar={(device) =>
                  openEdit({ kind: "nanoradar", device })
                }
                onEditMagosradar={(device) =>
                  openEdit({ kind: "magosradar", device })
                }
                onEditSpotter={(device) =>
                  openEdit({ kind: "spotter", device })
                }
                onEditCamara={(device) => openEdit({ kind: "camara", device })}
                onEditPtz={(device) => openEdit({ kind: "ptz", device })}
                editingDevice={editingDevice}
                liveEdit={liveEdit}
                onLiveEditChange={setLiveEdit}
                onEditClose={closeEdit}
                liveEditPos={liveEditPos}
                onLiveEditPosChange={setLiveEditPos}
                isPickingPosition={isPickingPosition}
                onPickPosition={() => setIsPickingPosition(true)}
                onCancelPickPosition={() => setIsPickingPosition(false)}
              />
            )}
            <ZonesPanel />

            {/* <div className="flex justify-center items-center flex-1">
              <span className="[writing-mode:vertical-rl] truncate rotate-180 text-[11px] tracking-[0.3em] text-text-200 font-light uppercase">
                Configuraciones de dispositivos
              </span>
            </div> */}
          </div>
        </MapPanelProvider>
      </div>
    </div>
  );
});
