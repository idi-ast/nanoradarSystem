import { useQuery } from "@tanstack/react-query";
import { fetchRadarZones } from "@/features/devices/services";
import type { RadarZone } from "@/features/devices/types";

export function useZones() {
  return useQuery({
    queryKey: ["history-zones"],
    queryFn: fetchRadarZones,
    refetchOnWindowFocus: false,
  });
}

export type { RadarZone };