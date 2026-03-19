import { apiSystem } from "@/apis";
import type { ConfigServicesType } from "../types/ConfigServices.type";

export const configDevicesService = {
  getConfigDevices: async (): Promise<ConfigServicesType> => {
    const response = await apiSystem.get<ConfigServicesType>("/configuracion-general");
    return response.data;
  },
};
