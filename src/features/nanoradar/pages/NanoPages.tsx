import { useState, useCallback, useMemo } from "react";
import { IconArrowNarrowLeft, IconX } from "@tabler/icons-react";
import BottomBar from "@/components/bars/BottomBar";
import { useBreakpoint } from "@/hooks/useBreakpoints";
import { RadarProvider } from "../context";
import { useRadarContext } from "../context/useRadarContext";
import { RadarMap } from "../components/map/RadarMap";
import { TargetCard } from "../components/panel/TargetCard";
import { ZoneCard } from "../components/panel/ZoneCard";
import { ZoneDrawingPanel } from "../components/panel/ZoneDrawingPanel";
import { HistoryRangeBar, type HistoryRange } from "../components";
import { useGeofenceDetection } from "../hooks/useGeofenceDetection";

function NanoPages() {
  const { isMobile } = useBreakpoint();
  const [isOpenRightBar, setOpenRightBar] = useState(false);
  const [historyRange, setHistoryRange] = useState<HistoryRange>({
    start: 0,
    end: 100,
  });
  const handleRangeChange = useCallback(
    (range: HistoryRange) => setHistoryRange(range),
    [],
  );

  return (
    <RadarProvider>
      <GeofenceFlash />
      <div
        className={`w-full h-full ${isMobile ? "flex flex-row" : "grid grid-cols-12 overflow-hidden"}`}
      >
        <div className="col-span-10 h-full flex flex-col w-full">
          <div className="flex-1 min-h-0 w-full">
            <RadarMap historyRange={historyRange} />
          </div>
          <HistoryRangeBar onChange={handleRangeChange} />
          <BottomBar title="Estado del Radar">
            <RadarStatusBar />
          </BottomBar>
        </div>

        {!isMobile ? (
          <RightBarNano />
        ) : isOpenRightBar ? (
          <RightBarNano setOpenRightBar={setOpenRightBar} />
        ) : (
          <button
            className="absolute right-0 z-50 top-[50%] rounded-s-sm bg-brand-100"
            onClick={() => setOpenRightBar(true)}
          >
            <IconArrowNarrowLeft size={24} stroke={1.5} />
          </button>
        )}
      </div>
    </RadarProvider>
  );
}

const RadarStatusBar = () => {
  const { targets, zones } = useRadarContext();
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

      <div className="ml-auto flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-[10px] text-emerald-500 uppercase tracking-widest font-mono">
          Sistema activo
        </span>
      </div>
    </div>
  );
};

const RightBarNano = ({
  setOpenRightBar,
}: {
  setOpenRightBar?: (isOpen: boolean) => void;
}) => {
  const {
    zones,
    targets,
    isDrawing,
    clearTargets,
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
        <button
          onClick={clearTargets}
          className="flex-1 px-2 py-1 text-[10px] rounded border border-red-500/50 bg-red-950/50 text-text-100 hover:bg-red-500/20 transition-colors"
        >
          BORRAR CACHÉ
        </button>
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
            zones.map((zone, i) => <ZoneCard key={i} zone={zone} />)
          )}
        </div>

        <div className="flex-1 min-h-0 flex flex-col">
          <TargetsSection targets={targets} />
        </div>
      </div>
    </div>
  );
};

export default NanoPages;

/**
 * Overlay de destello en el borde de la pantalla cuando un objetivo activo
 * entra a una geocerca de nivel CRÍTICO (4).
 */
function GeofenceFlash() {
  const { targets, zones } = useRadarContext();
  const { maxLevel } = useGeofenceDetection(targets, zones);

  if (maxLevel < 4) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-9999 animate-[geofence-pulse_1.2s_ease-in-out_infinite]"
      style={{
        boxShadow: "inset 0 0 80px 28px #ef4444",
        border: "2px solid rgba(239,68,68,0.85)",
      }}
    />
  );
}

type TabFilter = "all" | "nanoRadar" | "spotter";

const TABS: { key: TabFilter; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "nanoRadar", label: "NanoRadar" },
  { key: "spotter", label: "Spotter" },
];

function TargetsSection({
  targets,
}: {
  targets: import("../types").RadarTarget[];
}) {
  const [tab, setTab] = useState<TabFilter>("all");

  const filtered = useMemo(
    () =>
      tab === "all" ? targets : targets.filter((t) => t.deviceType === tab),
    [targets, tab],
  );

  return (
    <>
      <div className="shrink-0 flex border-b border-border-200 mb-2">
        {TABS.map(({ key, label }) => {
          const count =
            key === "all"
              ? targets.length
              : targets.filter((t) => t.deviceType === key).length;
          const isActive = tab === key;
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 py-1 text-[12px] font-semibold uppercase tracking-wider transition-colors border-b-2 ${isActive
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
            {tab === "spotter"
              ? "Spotter desconectado..."
              : "No hay objetivos en el área..."}
          </p>
        ) : (
          filtered.map((t) => <TargetCard key={t.id} target={t} />)
        )}
      </div>
    </>
  );
}
