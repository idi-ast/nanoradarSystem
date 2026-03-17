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
import { ZoneDrawingPanel } from "../components/panel/ZoneDrawingPanel";
import { HistoryRangeBar, type HistoryRange } from "../components";
import { useGeofenceDetection } from "../hooks/useGeofenceDetection";
import { RADAR_INSTANCES } from "../config";
import type { DeviceFilter } from "../types";

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
  const handleRangeChange = useCallback(
    (range: HistoryRange) => setHistoryRange(range),
    [],
  );
  const { zones, instanceConfig } = useRadarContext();
  const { targets } = useRadarTargets();
  const geofence = useGeofenceDetection(
    targets,
    zones,
    instanceConfig.geofence.ACTIVE_MS,
  );

  return (
    <div
      className={`w-full h-full ${isMobile ? "flex flex-row" : "grid grid-cols-12 overflow-hidden"}`}
    >
      <div className="col-span-10 h-full flex flex-col w-full">
        <div className="flex-1 min-h-0 w-full relative">
          <GeofenceFlash hasAlert={geofence.hasAlert} color={geofence.color} />
          <RadarMap historyRange={historyRange} deviceFilter={deviceFilter} />
        </div>
        <HistoryRangeBar onChange={handleRangeChange} />
        <BottomBar title="Estado del Radar">
          <RadarStatusBar />
        </BottomBar>
      </div>

      {!isMobile ? (
        <RightBarNano activeZoneIds={geofence.activeZoneIds} deviceFilter={deviceFilter} onDeviceFilterChange={setDeviceFilter} />
      ) : isOpenRightBar ? (
        <RightBarNano
          setOpenRightBar={setOpenRightBar}
          activeZoneIds={geofence.activeZoneIds}
          deviceFilter={deviceFilter}
          onDeviceFilterChange={setDeviceFilter}
        />
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

const RightBarNano = memo(function RightBarNano({
  setOpenRightBar,
  activeZoneIds,
  deviceFilter,
  onDeviceFilterChange,
}: {
  setOpenRightBar?: (isOpen: boolean) => void;
  activeZoneIds: Set<string>;
  deviceFilter: DeviceFilter;
  onDeviceFilterChange: (f: DeviceFilter) => void;
}) {
  const {
    zones,
    isDrawing,
    startDrawing,
    cancelDrawing,
  } = useRadarContext();

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

      <div className="shrink-0 px-3 py-3 border-b border-border flex gap-2">
        <ClearTargetsButton />
        <button
          onClick={isDrawing ? cancelDrawing : startDrawing}
          className={`px-3 py-1 text-[10px] rounded border text-white ${isDrawing
            ? "bg-red-500 border-red-400"
            : "bg-emerald-600 border-emerald-400"
            }`}
        >
          {isDrawing ? "CANCELAR" : "+ NUEVA"}
        </button>
      </div>

      {isDrawing && (
        <div className="shrink-0">
          <ZoneDrawingPanel />
        </div>
      )}

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
                hasAlert={activeZoneIds.has(zone.id?.toString() ?? zone.nombre)}
              />
            ))
          )}
        </div>

        <TargetsDynamicPanel deviceFilter={deviceFilter} onDeviceFilterChange={onDeviceFilterChange} />
      </div>
    </div>
  );
}, (prev, next) => {
  if (prev.setOpenRightBar !== next.setOpenRightBar) return false;
  if (prev.deviceFilter !== next.deviceFilter) return false;
  if (prev.onDeviceFilterChange !== next.onDeviceFilterChange) return false;
  if (prev.activeZoneIds.size !== next.activeZoneIds.size) return false;
  for (const id of next.activeZoneIds) {
    if (!prev.activeZoneIds.has(id)) return false;
  }
  return true;
});

export default NanoPages;

const ClearTargetsButton = memo(function ClearTargetsButton() {
  const { clearTargets } = useRadarContext();
  return (
    <button
      onClick={clearTargets}
      className="flex-1 px-2 py-1 text-[10px] rounded border border-red-500/50 bg-red-950/50 text-text-100 hover:bg-red-500/20 transition-colors"
    >
      BORRAR CACHÉ
    </button>
  );
});


const TargetsDynamicPanel = memo(function TargetsDynamicPanel({
  deviceFilter,
  onDeviceFilterChange,
}: {
  deviceFilter: DeviceFilter;
  onDeviceFilterChange: (f: DeviceFilter) => void;
}) {
  const { stableTargets } = useRadarStableTargets();
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <TargetsSection targets={stableTargets} deviceFilter={deviceFilter} onDeviceFilterChange={onDeviceFilterChange} />
    </div>
  );
});

const GeofenceFlash = memo(function GeofenceFlash({
  hasAlert,
  color,
}: {
  hasAlert: boolean;
  color: string;
}) {
  if (!hasAlert) return null;

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

const TABS: { key: TabFilter; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "nanoRadar", label: "NanoRadar" },
  { key: "spotter", label: "Spotter" },
];


const TargetsSection = memo(function TargetsSection({
  targets,
  deviceFilter,
  onDeviceFilterChange,
}: {
  targets: import("../types").RadarTarget[];
  deviceFilter: DeviceFilter;
  onDeviceFilterChange: (f: DeviceFilter) => void;
}) {
  const { counts, filtered } = useMemo(() => {
    const nextCounts: Record<TabFilter, number> = {
      all: targets.length,
      nanoRadar: 0,
      spotter: 0,
    };
    for (const t of targets) {
      if (t.deviceType === "nanoRadar") nextCounts.nanoRadar += 1;
      if (t.deviceType === "spotter") nextCounts.spotter += 1;
    }
    const nextFiltered =
      deviceFilter === "all" ? targets : targets.filter((t) => t.deviceType === deviceFilter);
    return { counts: nextCounts, filtered: nextFiltered };
  }, [targets, deviceFilter]);

  return (
    <>
      <div className="shrink-0 flex border-b border-border-200 mb-2">
        {TABS.map(({ key, label }) => {
          const count = counts[key];
          const isActive = deviceFilter === key;
          return (
            <button
              key={key}
              onClick={() => onDeviceFilterChange(key)}
              className={`flex-1 py-1 text-[12px] font-semibold uppercase tracking-wider transition-colors border-b-2 ${
                isActive
                  ? "border-emerald-500 text-emerald-400"
                  : "border-transparent text-text-100/40 hover:text-text-100/70"
              }`}
            >
              {label}
              <span
                className={`ml-1 px-1 rounded-full text-[12px] ${isActive ? "bg-emerald-500/20" : "bg-bg-300"}`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
        {filtered.length === 0 ? (
          <p className="text-text-100/40 text-[10px] italic">
            {deviceFilter === "spotter"
              ? "Spotter desconectado..."
              : "No hay objetivos en el área..."}
          </p>
        ) : (
          filtered.map((t) => <TargetCard key={t.id} target={t} />)
        )}
      </div>
    </>
  );
});
