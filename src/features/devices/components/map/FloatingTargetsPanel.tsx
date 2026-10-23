import { memo, useMemo, useState } from "react";
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react";
import type { DeviceFilter, RadarTarget } from "../../types";
import {
  useRadarContext,
  useRadarStableTargets,
} from "../../context/useRadarContext";
import { DEVICE_LABEL, getActiveDeviceTypes } from "./devicesConfig";
import { useConfigDevices } from "@/features/config-devices/hooks/useConfigDevices";
import { isPointInPolygon } from "./utils/geoHelpers";
import { TargetCard } from "../panel/TargetCard";
import {
  resolveBehaviorCategory,
  BEHAVIOR_CATEGORIES,
  ZONE_DETECTION_CATEGORIES,
} from "../../config";
import {
  normalizeTrackCategory,
  TRACK_CATEGORIES_CONFIG,
  IconTargetNeutral,
} from "../../config/categories";

type TabFilter = DeviceFilter;

interface Props {
  deviceFilter: DeviceFilter;
  onDeviceFilterChange: (f: DeviceFilter) => void;
  onSelectTrack?: (id: string | null) => void;
  isCollapsed?: boolean;
  onToggleCollapsed?: () => void;
}

function getTargetCategoryInfo(target: RadarTarget, zones: any[]) {
  if (target.behaviorClass) {
    const bCat = resolveBehaviorCategory(
      target.behaviorClass,
      target.behaviorConfidence ?? 1,
    );
    if (bCat && bCat !== BEHAVIOR_CATEGORIES.sin_clasificar) {
      return bCat;
    }
    const norm = normalizeTrackCategory(target.behaviorClass);
    const item = TRACK_CATEGORIES_CONFIG.find((c) => c.id === norm);
    if (item && item.id !== "UNKNOWN") {
      return item;
    }
  }

  if (zones && zones.length > 0) {
    for (const zone of zones) {
      const rawVertices = Array.isArray(zone.poligono.vertices)
        ? zone.poligono.vertices
        : Object.values(zone.poligono.vertices);
      if (
        isPointInPolygon(
          target.lat,
          target.lon,
          rawVertices as [number, number][],
        )
      ) {
        const zCat = ZONE_DETECTION_CATEGORIES.find(
          (c) => c.id === zone.categoriaDeteccion,
        );
        if (zCat && zCat.id !== 0) {
          return {
            label: zCat.label,
            icon: zCat.icon,
            color: zone.poligono?.color || "#38bdf8",
          };
        }
      }
    }
  }

  return {
    label: "Sin clasificar",
    icon: IconTargetNeutral,
    color: "#94a3b8",
  };
}

export const FloatingTargetsPanel = memo(function FloatingTargetsPanel({
  deviceFilter,
  onDeviceFilterChange,
  onSelectTrack,
  isCollapsed: controlledCollapsed,
  onToggleCollapsed,
}: Props) {
  const { stableTargets } = useRadarStableTargets();
  const { zones } = useRadarContext();
  const { data: configData } = useConfigDevices();
  const [searchTrackId] = useState<string>("");
  const [internalCollapsed, setInternalCollapsed] = useState(false);

  const isCollapsed = controlledCollapsed ?? internalCollapsed;
  const handleToggle = onToggleCollapsed ?? (() => setInternalCollapsed((prev) => !prev));

  const filteredTargets = useMemo(() => {
    if (!searchTrackId) return stableTargets;
    const lower = searchTrackId.toLowerCase();
    return stableTargets.filter((t) => t.id.toLowerCase().includes(lower));
  }, [stableTargets, searchTrackId]);

  const activeTypes = useMemo(
    () => getActiveDeviceTypes(configData?.data),
    [configData],
  );

  const targetZoneColorMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const target of stableTargets) {
      for (const zone of zones) {
        const rawVertices = Array.isArray(zone.poligono.vertices)
          ? zone.poligono.vertices
          : Object.values(zone.poligono.vertices);
        if (
          isPointInPolygon(
            target.lat,
            target.lon,
            rawVertices as [number, number][],
          )
        ) {
          if (!map.has(target.id)) {
            map.set(target.id, zone.poligono.color);
          }
        }
      }
    }
    return map;
  }, [stableTargets, zones]);

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
    const nextCounts: Record<string, number> = { all: filteredTargets.length };
    for (const dt of activeTypes) nextCounts[dt] = 0;
    for (const t of filteredTargets) {
      if (activeTypeSet.has(t.deviceType)) {
        nextCounts[t.deviceType] = (nextCounts[t.deviceType] ?? 0) + 1;
      }
    }
    const nextFiltered =
      deviceFilter === "all"
        ? filteredTargets
        : filteredTargets.filter((t) => t.deviceType === deviceFilter);
    const nextSorted = [...nextFiltered].sort((a, b) => {
      const aInZone = targetZoneColorMap?.has(a.id) ?? false;
      const bInZone = targetZoneColorMap?.has(b.id) ?? false;
      if (aInZone && !bInZone) return -1;
      if (!aInZone && bInZone) return 1;
      return 0;
    });
    return { counts: nextCounts, sorted: nextSorted };
  }, [
    filteredTargets,
    deviceFilter,
    activeTypes,
    activeTypeSet,
    targetZoneColorMap,
  ]);

  // ─── MODO CONTRAÍDO: Solo muestra el icono de detección y el nivel de alerta ───
  if (isCollapsed) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-1.5 p-2 bg-bg-200/90 backdrop-blur-md border border-border/80 shadow-2xl rounded-xl overflow-hidden transition-all duration-200">
        <div className="shrink-0 flex items-center justify-between px-1 pb-1 border-b border-border-200/50">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-100 truncate">
              Tracks ({sorted.length})
            </span>
          </div>
          <button
            type="button"
            onClick={handleToggle}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold text-text-300 hover:text-text-100 hover:bg-bg-300 transition-colors cursor-pointer shrink-0"
            title="Volver a mostrar actividades completas"
          >
            <span>Expandir</span>
            <IconChevronUp size={15} stroke={2} />
          </button>
        </div>

        <div
          className="flex-1 min-h-0 max-h-80 overflow-y-auto space-y-1 pr-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {sorted.length === 0 ? (
            <p className="text-text-100/40 text-[10px] italic py-3 text-center">
              Sin objetivos
            </p>
          ) : (
            sorted.map((t) => {
              const cat = getTargetCategoryInfo(t, zones);
              const Icon = cat.icon;
              const isCritical = t.nivel === 4;
              const inZone = targetZoneColorMap?.has(t.id);
              const zoneColor = targetZoneColorMap?.get(t.id);
              const rawId = t.id.replace(/^(nanoRadar|magosradar|spotter)_/, "");

              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onSelectTrack?.(t.id)}
                  title={`ID: ${rawId} · ${cat.label} · Nivel ${t.nivel}`}
                  className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg border transition-all text-left cursor-pointer hover:bg-bg-300/80 bg-bg-100 ${
                    isCritical
                      ? "border-brand-100/80 shadow-sm shadow-brand-100/20"
                      : inZone
                      ? "border-sky-500/40"
                      : "border-white/10"
                  }`}
                  style={{
                    borderColor: inZone && !isCritical ? `${zoneColor}80` : undefined,
                    backgroundColor: inZone && !isCritical ? `${zoneColor}15` : undefined,
                  }}
                >
                  {/* Icono de detección */}
                  <div
                    className="p-1 rounded-md flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: `${cat.color}25`,
                      color: cat.color,
                    }}
                  >
                    <Icon size={18} stroke={1.8} />
                  </div>

                  {/* Nivel de alerta */}
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      isCritical
                        ? "border border-brand-100 bg-brand-100/20 text-red-300 animate-pulse"
                        : t.nivel === 3
                        ? "border border-amber-500/50 bg-amber-500/20 text-amber-300"
                        : t.nivel === 2
                        ? "border border-yellow-500/50 bg-yellow-500/20 text-yellow-300"
                        : t.nivel === 1
                        ? "border border-sky-500/50 bg-sky-500/20 text-sky-300"
                        : "border border-border-200 bg-bg-200 text-text-300"
                    }`}
                  >
                    Nivel {t.nivel}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // ─── MODO EXPANDIDO: Muestra actividades completas (pestañas, cards con SNR, tracks, etc.) ───
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 p-2.5 bg-bg-200/90 backdrop-blur-md border border-border/80 shadow-2xl rounded-xl overflow-hidden transition-all duration-200">
      {/* Cabecera con botón para contraer */}
      <div className="shrink-0 flex items-center justify-between px-1 pb-1">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider text-text-100">
            Tracks en vivo
          </span>
          <span className="text-[11px] text-text-300 font-semibold">
            ({sorted.length})
          </span>
        </div>
        <button
          type="button"
          onClick={handleToggle}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold text-text-300 hover:text-text-100 hover:bg-bg-300 transition-colors cursor-pointer"
          title="Contraer panel (solo iconos y alerta)"
        >
          <span>Contraer</span>
          <IconChevronDown size={15} stroke={2} />
        </button>
      </div>

      {/* Selector de pestañas por dispositivo */}
      <div className="shrink-0 flex">
        {TABS.map(({ key, label }) => {
          const count = counts[key] ?? 0;
          const isActive = deviceFilter === key;
          return (
            <button
              key={key}
              onClick={() => onDeviceFilterChange(key)}
              className={`flex-1 rounded-full py-1 text-[12px] font-semibold uppercase tracking-wider transition-colors ${
                isActive
                  ? "bg-bg-400/20 backdrop-blur text-bg-400"
                  : "text-text-100/70 hover:text-text-100/70"
              }`}
            >
              {label}
              <span
                className={`ml-1 px-1 rounded-full text-[12px] ${
                  isActive ? "bg-bg-400 text-text-400" : "bg-bg-300"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Lista detallada de actividades como está actualmente */}
      <div
        className="flex-1 min-h-0 max-h-100 overflow-y-auto space-y-1.5 pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {sorted.length === 0 ? (
          <p className="text-text-100/40 text-[10px] italic py-4 text-center">
            No hay objetivos en el área...
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
    </div>
  );
});
