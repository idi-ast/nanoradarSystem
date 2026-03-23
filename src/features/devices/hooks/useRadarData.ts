import { useState, useEffect, useCallback } from "react";
import { fetchRadarConfig, fetchRadarZones, createRadarZone, updateRadarZone, deleteRadarZone } from "../services";
import type { RadarConfig, RadarZone, CreateZonePayload, UpdateZonePayload } from "../types";

/**
 * Hook que centraliza la carga y sincronización de los datos
 * configurables del radar: configuración base y zonas de alerta.
 */
export function useRadarData() {
  const [config, setConfig] = useState<RadarConfig | null>(null);
  const [zones, setZones] = useState<RadarZone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [cfg, zns] = await Promise.all([
        fetchRadarConfig(),
        fetchRadarZones(),
      ]);
      setConfig(cfg);
      setZones(zns);
    } catch (err) {
      console.error("[useRadarData] Error cargando datos:", err);
      setError("Error al sincronizar datos con el servidor.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addZone = useCallback(async (payload: CreateZonePayload) => {
    await createRadarZone(payload);
    const updated = await fetchRadarZones();
    setZones(updated);
  }, []);

  const updateZone = useCallback(async (id: number, payload: UpdateZonePayload) => {
    await updateRadarZone(id, payload);
    const updated = await fetchRadarZones();
    setZones(updated);
  }, []);

  const deleteZone = useCallback(async (id: number) => {
    await deleteRadarZone(id);
    setZones((prev) => prev.filter((z) => z.id !== id));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    config,
    zones,
    isLoading,
    error,
    refreshData: loadData,
    addZone,
    updateZone,
    deleteZone,
  };
}
