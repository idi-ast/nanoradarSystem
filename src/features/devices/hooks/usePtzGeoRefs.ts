import { useQuery } from "@tanstack/react-query";
import type { PtzGeoRef } from "@/features/config-devices/types/ConfigServices.type";
import { ptzGeoRefs } from "../components/map/cameras/ptz/service";

export const usePtzGeoRefs = () =>
  useQuery({
    queryKey: ["ptz-georef"],
    queryFn: ptzGeoRefs,
    refetchInterval: 3000,
    staleTime: 2500,
  });

export type { PtzGeoRef };