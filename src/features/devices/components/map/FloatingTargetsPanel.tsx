import { memo, useMemo, useState } from "react";
import type { DeviceFilter } from "../../types";
import {
  useRadarContext,
  useRadarStableTargets,
} from "../../context/useRadarContext";
import { DEVICE_LABEL, getActiveDeviceTypes } from "./devicesConfig";
import { useConfigDevices } from "@/features/config-devices/hooks/useConfigDevices";
import { isPointInPolygon } from "./utils/geoHelpers";
import { TargetCard } from "../panel/TargetCard";

type TabFilter = DeviceFilter;

interface Props {
  deviceFilter: DeviceFilter;
  onDeviceFilterChange: (f: DeviceFilter) => void;
  onSelectTrack?: (id: string | null) => void;
}

export const FloatingTargetsPanel = memo(function FloatingTargetsPanel({
  deviceFilter,
  onDeviceFilterChange,
  onSelectTrack,
}: Props) {
  const { stableTargets } = useRadarStableTargets();
  const { zones } = useRadarContext();
  const { data: configData } = useConfigDevices();
  const [searchTrackId] = useState<string>("");

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

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 p-3">
      <div className="shrink-0 flex">
        {TABS.map(({ key, label }) => {
          const count = counts[key] ?? 0;
          const isActive = deviceFilter === key;
          return (
            <button
              key={key}
              onClick={() => onDeviceFilterChange(key)}
              className={`flex-1 rounded-full  py-1 text-[12px] font-semibold uppercase tracking-wider transition-colors  ${
                isActive
                  ? "bg-bg-400/20 backdrop-blur  text-bg-400"
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
