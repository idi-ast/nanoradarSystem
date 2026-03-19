import { useQuery } from "@tanstack/react-query";
import { configDevicesService } from "../services/ConfigDevices.service";

export const useConfigDevices = () => {
    return useQuery({
        queryKey: ["config-devices"],
        queryFn: () => configDevicesService.getConfigDevices(),
    });
};