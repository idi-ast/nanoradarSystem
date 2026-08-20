import { useState, useCallback, useMemo, memo } from "react";
import { IconArrowNarrowLeft, IconX } from "@tabler/icons-react";
import BottomBar from "@/components/bars/BottomBar";
import { useBreakpoint } from "@/hooks/useBreakpoints";
import { RadarProvider } from "../context";
import { useRadarContext } from "../context/useRadarContext";
import { useRadarTargets } from "../context/useRadarContext";
import { useRadarStableTargets } from "../context/useRadarContext";
import { RadarMap } from "../components/map/RadarMap";
import { TargetCard } from "../components/panel/TargetCard";
import { ZoneCard } from "../components/panel/ZoneCard";
import { TrackHistoryPanel } from "../components/panel/TrackHistoryPanel";
import { HistoryRangeBar, type HistoryRange } from "../components";
import { useGeofenceDetection } from "../hooks/useGeofenceDetection";
import { useZoneAlertSound } from "../hooks/useZoneAlertSound";
import { useTrackHistory } from "../hooks/useTrackHistory";
import { RADAR_INSTANCES } from "../config";
import type { DeviceFilter, TrackHistoryPoint } from "../types";
import type { DeviceVisibility } from "../components/map/DevicesOverlay";
import { ALL_VISIBLE, getActiveDeviceTypes, DEVICE_LABEL } from "../components/map/devicesConfig";
import { useConfigDevices } from "@/features/config-devices/hooks/useConfigDevices";
import Camera from "../components/map/cameras/Camera";
import { useCameraActivityStore } from "../stores/cameraActivityStore";
import { isPointInPolygon } from "../components/map/utils/geoHelpers";
import PtzCameraOverlay from "./PtzCameraOverlay";

function NanoPages() {
  const { isMobile } = useBreakpoint();
  return (
    <RadarProvider instance={RADAR_INSTANCES[0]}>
      <NanoPagesContent isMobile={isMobile} />
    </RadarProvider>
  );
}

function NanoPagesContent({ isMobile }: { isMobile: boolean }) {
  const [isOpenRightBar, setOpenRightBar] = useState(false);
  const [deviceFilter, setDeviceFilter] = useState<DeviceFilter>("all");
  const [historyRange, setHistoryRange] = useState<HistoryRange>({
    start: 0,
    end: 100,
  });
  const [deviceVisibility, setDeviceVisibility] =
    useState<DeviceVisibility>(ALL_VISIBLE);
  // ─── Historial de track ───
  const [selectedHistoryTrackId, setSelectedHistoryTrackId] = useState<string | null>(null);
  const [historyTrackRange, setHistoryTrackRange] = useState<HistoryRange>({
    start: 0,
    end: 100,
  });
  const handleHideCamera = useCallback(
    (id: number) =>
      setDeviceVisibility((prev) => ({
        ...prev,
        hiddenCamaras: new Set([...prev.hiddenCamaras, id]),
      })),
    [],
  );
  const handleHidePtz = useCallback(
    (id: number) =>
      setDeviceVisibility((prev) => ({
        ...prev,
        hiddenPtz: new Set([...prev.hiddenPtz, id]),
      })),
    [],
  );
  const handleRangeChange = useCallback(
    (range: HistoryRange) => setHistoryRange(range),
    [],
  );
  const handleHistoryTrackRangeChange = useCallback(
    (range: HistoryRange) => setHistoryTrackRange(range),
    [],
  );

  // Encontrar el target seleccionado
  const { targets } = useRadarTargets();
  const selectedTarget = useMemo(
    () => targets.find((t) => t.id === selectedHistoryTrackId) ?? null,
    [targets, selectedHistoryTrackId],
  );

  // Obtener historial del backend para el track seleccionado
  const rawTrackId = selectedHistoryTrackId?.replace(/^(nanoRadar|magosradar|spotter)_/, "") ?? null;
  const tipoRadar = selectedTarget?.deviceType === "magosradar" ? "magos" : selectedTarget?.deviceType === "nanoRadar" ? "nano" : undefined;
  const { data: backendHistory } = useTrackHistory({
    trackId: rawTrackId,
    tipoRadar,
    sessionRef: selectedTarget?.lastUpdate ?? null,
    enabled: !!rawTrackId,
  });

  // Virtual target para tracks que solo existen en la BD (no están en vivo)
  const virtualTarget = useMemo(() => {
    if (selectedTarget || !backendHistory || !rawTrackId) return null;
    const firstPoint = backendHistory.points?.[0];
    return {
      id: rawTrackId,
      lat: firstPoint?.lat ?? 0,
      lon: firstPoint?.lon ?? 0,
      nivel: 0,
      zona: firstPoint?.zona ?? "",
      lastUpdate: firstPoint ? new Date(firstPoint.fecha).getTime() : Date.now(),
      deviceType: (backendHistory.tipo_radar === "magos" ? "magosradar"
        : backendHistory.tipo_radar === "nano" ? "nanoRadar"
        : "spotter") as "magosradar" | "nanoRadar" | "spotter",
      history: [] as [number, number, number][],
    };
  }, [selectedTarget, backendHistory, rawTrackId]);

  const effectiveTarget = selectedTarget ?? virtualTarget;

  // Merge in-memory + backend history, deduplicado
  const mergedHistoryPoints = useMemo(() => {
    const inMemoryPoints: TrackHistoryPoint[] = (selectedTarget?.history ?? []).map(([lat, lon, ts]) => ({
      fecha: new Date(ts).toISOString(),
      lat,
      lon,
      speed: null,
      heading: null,
      snr: null,
      nivel: null,
      track_state: null,
      confidence: null,
      zona: null,
    }));

    const backendPoints = backendHistory?.points ?? [];
    if (inMemoryPoints.length === 0 && backendPoints.length === 0) return [];

    const seen = new Map<string, TrackHistoryPoint>();
    for (const p of backendPoints) {
      const key = `${Math.round(new Date(p.fecha).getTime() / 1000)}`;
      seen.set(key, p);
    }
    for (const p of inMemoryPoints) {
      const key = `${Math.round(new Date(p.fecha).getTime() / 1000)}`;
      if (!seen.has(key)) seen.set(key, p);
    }
    return Array.from(seen.values()).sort(
      (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime(),
    );
  }, [selectedTarget, backendHistory]);

  const handleSelectHistoryTrack = useCallback((id: string | null) => {
    setSelectedHistoryTrackId(id);
    setHistoryTrackRange({ start: 0, end: 100 });
  }, []);

  return (
    <div
      className={`w-full h-full ${isMobile ? "flex flex-row" : "grid grid-cols-12 overflow-hidden"}`}
    >
      <div className="col-span-10 h-full flex flex-col w-full">
        <div className="flex-1 min-h-0 w-full relative">
          <GeofenceFlash />
          <RadarMap
            historyRange={historyRange}
            deviceFilter={deviceFilter}
            visibility={deviceVisibility}
            onVisibilityChange={setDeviceVisibility}
            selectedTargetId={selectedHistoryTrackId}
            onSelectTarget={handleSelectHistoryTrack}
            historyTrackPoints={mergedHistoryPoints}
            historyTrackRange={historyTrackRange}
          />
        </div>
        <HistoryRangeBar onChange={handleRangeChange} />
        <BottomBar title="Estado del Radar">
          <RadarStatusBar />
        </BottomBar>
      </div>

      {!isMobile ? (
        effectiveTarget ? (
          <TrackHistoryPanel
            target={effectiveTarget}
            historyRange={historyTrackRange}
            onHistoryRangeChange={handleHistoryTrackRangeChange}
            onClose={() => setSelectedHistoryTrackId(null)}
          />
        ) : (
          <RightBarNano
            deviceFilter={deviceFilter}
            onDeviceFilterChange={setDeviceFilter}
            hiddenCamaras={deviceVisibility.hiddenCamaras}
            onHideCamera={handleHideCamera}
            hiddenPtz={deviceVisibility.hiddenPtz}
            onHidePtz={handleHidePtz}
            onSelectTrack={handleSelectHistoryTrack}
          />
        )
      ) : isOpenRightBar ? (
        effectiveTarget ? (
          <TrackHistoryPanel
            target={effectiveTarget}
            historyRange={historyTrackRange}
            onHistoryRangeChange={handleHistoryTrackRangeChange}
            onClose={() => setSelectedHistoryTrackId(null)}
          />
        ) : (
          <RightBarNano
            setOpenRightBar={setOpenRightBar}
            deviceFilter={deviceFilter}
            onDeviceFilterChange={setDeviceFilter}
            hiddenCamaras={deviceVisibility.hiddenCamaras}
            onHideCamera={handleHideCamera}
            hiddenPtz={deviceVisibility.hiddenPtz}
            onHidePtz={handleHidePtz}
            onSelectTrack={handleSelectHistoryTrack}
          />
        )
      ) : (
        <button
          className="absolute right-0 z-50 top-[50%] rounded-s-sm bg-brand-100"
          onClick={() => setOpenRightBar(true)}
        >
          <IconArrowNarrowLeft size={24} stroke={1.5} />
        </button>
      )}
    </div>
  );
}

const RadarStatusBar = memo(() => {
  const { zones } = useRadarContext();
  const { targets } = useRadarTargets();
  const criticalCount = targets.filter((t) => t.nivel === 4).length;

  return (
    <div className="flex items-start gap-10 px-4 h-full">
      <div className="flex flex-col">
        <span className="text-[10px] text-text-100/50 uppercase tracking-widest">
          Zonas activas
        </span>
        <span className="text-emerald-400 font-bold text-xl leading-tight">
          {zones.length}
        </span>
      </div>

      <div className="flex flex-col">
        <span className="text-[10px] text-text-100/50 uppercase tracking-widest">
          Objetivos detectados
        </span>
        <span className="text-blue-400 font-bold text-xl leading-tight">
          {targets.length}
        </span>
      </div>

      <div className="flex flex-col">
        <span className="text-[10px] text-text-100/50 uppercase tracking-widest">
          Alertas críticas
        </span>
        <span
          className={`font-bold text-xl leading-tight ${criticalCount > 0
            ? "text-red-500 animate-pulse"
            : "text-text-100/30"
            }`}
        >
          {criticalCount}
        </span>
      </div>
    </div>
  );
});

const RightBarNano = memo(
  function RightBarNano({
    setOpenRightBar,
    deviceFilter,
    onDeviceFilterChange,
    hiddenCamaras,
    onHideCamera,
    hiddenPtz,
    onHidePtz,
    onSelectTrack,
  }: {
    setOpenRightBar?: (isOpen: boolean) => void;
    deviceFilter: DeviceFilter;
    onDeviceFilterChange: (f: DeviceFilter) => void;
    hiddenCamaras: Set<number>;
    onHideCamera?: (id: number) => void;
    hiddenPtz: Set<number>;
    onHidePtz?: (id: number) => void;
    onSelectTrack?: (id: string | null) => void;
  }) {
    const { zones, instanceConfig } = useRadarContext();
    const { targets } = useRadarTargets();
    const { activeZoneIds } = useGeofenceDetection(
      targets,
      zones,
      instanceConfig.geofence.ACTIVE_MS,
    );

    return (
      <div className="col-span-2 h-full flex flex-col bg-bg-100 text-text-100 border-s border-s-border overflow-hidden relative">
        <div className="shrink-0 p-5 bg-bg-100 rounded-xl m-1">
          <h3>Control Radar</h3>
          <h5>Zonas y Detecciones</h5>
          {setOpenRightBar && (
            <button
              onClick={() => setOpenRightBar(false)}
              className="absolute top-3 right-3 z-50"
            >
              <IconX size={20} stroke={1.5} />
            </button>
          )}
        </div>
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden p-3 gap-3">
          <div className="shrink-0 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-widest text-text-100/60 border-b border-border-200 pb-1">
              Zonas Activas ({zones.length > 0 ? zones.length : "0"})
            </h4>
            {zones.length === 0 ? (
              <p className="text-text-100/40 text-[10px] italic">
                Sin zonas configuradas
              </p>
            ) : (
              zones.map((zone) => (
                <ZoneCard
                  key={zone.id ?? zone.nombre}
                  zone={zone}
                  hasAlert={activeZoneIds.has(
                    zone.id?.toString() ?? zone.nombre,
                  )}
                />
              ))
            )}
          </div>

          <TargetsDynamicPanel
            deviceFilter={deviceFilter}
            onDeviceFilterChange={onDeviceFilterChange}
            onSelectTrack={onSelectTrack}
          />
          <CamerasOverlay hiddenCamaras={hiddenCamaras} onHideCamera={onHideCamera} />
          <PtzCameraOverlay hiddenPtz={hiddenPtz} onHidePtz={onHidePtz} />
        </div>
      </div>
    );
  },
  (prev, next) => {
    if (prev.setOpenRightBar !== next.setOpenRightBar) return false;
    if (prev.deviceFilter !== next.deviceFilter) return false;
    if (prev.onDeviceFilterChange !== next.onDeviceFilterChange) return false;
    if (prev.hiddenCamaras !== next.hiddenCamaras) return false;
    if (prev.onHideCamera !== next.onHideCamera) return false;
    if (prev.hiddenPtz !== next.hiddenPtz) return false;
    if (prev.onHidePtz !== next.onHidePtz) return false;
    if (prev.onSelectTrack !== next.onSelectTrack) return false;
    return true;
  },
);

export default NanoPages;

const TargetsDynamicPanel = memo(function TargetsDynamicPanel({
  deviceFilter,
  onDeviceFilterChange,
  onSelectTrack,
}: {
  deviceFilter: DeviceFilter;
  onDeviceFilterChange: (f: DeviceFilter) => void;
  onSelectTrack?: (id: string | null) => void;
}) {
  const { stableTargets } = useRadarStableTargets();
  const [searchTrackId, setSearchTrackId] = useState<string>("");
  const filteredTargets = useMemo(() => {
    if (!searchTrackId) return stableTargets;
    const lower = searchTrackId.toLowerCase();
    return stableTargets.filter((t) => t.id.toLowerCase().includes(lower));
  }, [stableTargets, searchTrackId]);

  const handleSearchTrackSelect = useCallback((id: string | null) => {
    if (!id || !onSelectTrack) return;
    const match = stableTargets.find((t) => t.id.toLowerCase().includes(id.toLowerCase()));
    onSelectTrack(match?.id ?? id);
  }, [onSelectTrack, stableTargets]);
  const { zones } = useRadarContext();
  const { data: configData } = useConfigDevices();
  const activeTypes = useMemo(
    () => getActiveDeviceTypes(configData?.data),
    [configData],
  );

  // Mapa targetId → color de zona para tracks dentro de zonas
  const targetZoneColorMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const target of stableTargets) {
      for (const zone of zones) {
        const rawVertices = Array.isArray(zone.poligono.vertices)
          ? zone.poligono.vertices
          : Object.values(zone.poligono.vertices);
        if (isPointInPolygon(target.lat, target.lon, rawVertices as [number, number][])) {
          // Si ya tiene zona asignada, no sobreescribir (prioridad primera zona encontrada)
          if (!map.has(target.id)) {
            map.set(target.id, zone.poligono.color);
          }
        }
      }
    }
    return map;
  }, [stableTargets, zones]);

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex justify-start items-center mb-2 text-[10px] text-text-100/50 uppercase tracking-widest
      ">
        <span>Buscar track </span>
        <input
          type="text"
          className="border w-full border-border-200 rounded-md py-2 px-4 focus:outline-none focus:ring-2 focus:ring-border"
          value={searchTrackId}
          onChange={(e) => setSearchTrackId(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSearchTrackSelect(searchTrackId || null);
            }
          }}
          placeholder="T23"
        />
      </div>
      <TargetsSection
        targets={filteredTargets}
        deviceFilter={deviceFilter}
        onDeviceFilterChange={onDeviceFilterChange}
        activeTypes={activeTypes}
        onSelectTrack={onSelectTrack}
        targetZoneColorMap={targetZoneColorMap}
      />
    </div>
  );
});

const GeofenceFlash = memo(function GeofenceFlash() {
  const { zones, instanceConfig } = useRadarContext();
  const { targets } = useRadarTargets();
  const { hasAlert, color, activeZoneIds } = useGeofenceDetection(
    targets,
    zones,
    instanceConfig.geofence.ACTIVE_MS,
  );

  // Aquí y no en RightBarNano: GeofenceFlash siempre está montado,
  // incluso en mobile cuando el sidebar está cerrado.
  useZoneAlertSound(zones, activeZoneIds);

  // Mostrar destello solo si al menos una zona activa tiene destello activado
  const shouldFlash =
    hasAlert &&
    zones.some(
      (z) =>
        activeZoneIds.has(z.id?.toString() ?? z.nombre) &&
        (z.destello ?? true),
    );

  if (!shouldFlash) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-9999 animate-[geofence-pulse_1.2s_ease-in-out_infinite]"
      style={{
        boxShadow: `inset 0 0 80px 28px ${color}`,
        border: `2px solid ${color}CC`,
      }}
    />
  );
});

type TabFilter = DeviceFilter;

const TargetsSection = memo(function TargetsSection({
  targets,
  deviceFilter,
  onDeviceFilterChange,
  activeTypes,
  onSelectTrack,
  targetZoneColorMap,
}: {
  targets: import("../types").RadarTarget[];
  deviceFilter: DeviceFilter;
  onDeviceFilterChange: (f: DeviceFilter) => void;
  activeTypes: string[];
  onSelectTrack?: (id: string | null) => void;
  targetZoneColorMap?: Map<string, string>;
}) {
  const TABS = useMemo(() => {
    const tabs: { key: TabFilter; label: string }[] = [
      { key: "all", label: "Todos" },
    ];
    for (const dt of activeTypes) {
      tabs.push({ key: dt as DeviceFilter, label: DEVICE_LABEL[dt] ?? dt });
    }
    return tabs;
  }, [activeTypes]);

  const activeTypeSet = useMemo(() => new Set(activeTypes), [activeTypes]);

  const { counts, sorted } = useMemo(() => {
    const nextCounts: Record<string, number> = { all: targets.length };
    for (const dt of activeTypes) nextCounts[dt] = 0;
    for (const t of targets) {
      if (activeTypeSet.has(t.deviceType)) {
        nextCounts[t.deviceType] = (nextCounts[t.deviceType] ?? 0) + 1;
      }
    }
    const nextFiltered =
      deviceFilter === "all"
        ? targets
        : targets.filter((t) => t.deviceType === deviceFilter);
    // Tracks en zona van arriba, el resto debajo
    const nextSorted = [...nextFiltered].sort((a, b) => {
      const aInZone = targetZoneColorMap?.has(a.id) ?? false;
      const bInZone = targetZoneColorMap?.has(b.id) ?? false;
      if (aInZone && !bInZone) return -1;
      if (!aInZone && bInZone) return 1;
      return 0;
    });
    return { counts: nextCounts, sorted: nextSorted };
  }, [targets, deviceFilter, activeTypes, activeTypeSet, targetZoneColorMap]);

  return (
    <>
      <div className="shrink-0 flex border-b border-border-200 mb-2">
        {TABS.map(({ key, label }) => {
          const count = counts[key] ?? 0;
          const isActive = deviceFilter === key;
          return (
            <button
              key={key}
              onClick={() => onDeviceFilterChange(key)}
              className={`flex-1 py-1 text-[12px] font-semibold uppercase tracking-wider transition-colors border-b-2 ${isActive
                ? "border-sky-400 text-sky-400"
                : "border-transparent text-text-100/40 hover:text-text-100/70"
                }`}
            >
              {label}
              <span
                className={`ml-1 px-1 rounded-full text-[12px] ${isActive ? "bg-sky-500/30" : "bg-bg-300"}`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
        {sorted.length === 0 ? (
          <p className="text-text-100/40 text-[10px] italic">
            {deviceFilter !== "all"
              ? `${DEVICE_LABEL[deviceFilter] ?? deviceFilter} sin detecciones...`
              : "No hay objetivos en el área..."}
          </p>
        ) : (
          sorted.map((t) => (
            <TargetCard
              key={t.id}
              target={t}
              onClick={(id) => onSelectTrack?.(id)}
              zoneColor={targetZoneColorMap?.get(t.id) ?? null}
            />
          ))
        )}
      </div>
    </>
  );
});

const CamerasOverlay = memo(function CamerasOverlay({
  hiddenCamaras,
  onHideCamera,
}: {
  hiddenCamaras: Set<number>;
  onHideCamera?: (id: number) => void;
}) {
  const { data } = useConfigDevices();
  const camaras = data?.data?.camaras;
  const { cameraActivities } = useRadarTargets();
  const { isEnabled } = useCameraActivityStore();
  const [maximizedIds, setMaximizedIds] = useState<number[]>([]);

  const handleMaximize = useCallback((id: number) => {
    setMaximizedIds((prev) => [...prev, id]);
  }, []);

  const handleMinimize = useCallback((id: number) => {
    setMaximizedIds((prev) => prev.filter((x) => x !== id));
  }, []);

  if (!camaras || camaras.length === 0)
    return (
      <div className="h-40 w-full flex justify-center items-center border border-border rounded-lg ">
        <div>
          <p className="text-text-200">
            No hay <span className="font-bold">cámaras</span> ingresadas
          </p>
        </div>
      </div>
    );
  return (
    <div className=" flex flex-col items-start w-full gap-2 z-100 border-t border-border pt-5">
      <h4 className="text-xs font-bold uppercase tracking-widest text-text-100/60 border-b border-border-200 pb-1 w-full">
        Cámaras({camaras.length > 0 ? camaras.length : "0"})
      </h4>
      {camaras.filter((cam) => !hiddenCamaras.has(cam.id)).map((cam) => {
        const stackIndex = maximizedIds.indexOf(cam.id);
        const activity = isEnabled(cam.id)
          ? cameraActivities.find((a) => a.ip === cam.direccionIp)
          : undefined;
        return (
          <Camera
            key={cam.id}
            camera={cam}
            stackIndex={stackIndex >= 0 ? stackIndex : 0}
            onBecomeMaximized={() => handleMaximize(cam.id)}
            onBecomeMinimized={() => handleMinimize(cam.id)}
            onClose={onHideCamera ? () => onHideCamera(cam.id) : undefined}
            activity={activity}
          />
        );
      })}
    </div>
  );
})
