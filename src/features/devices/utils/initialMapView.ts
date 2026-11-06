import type { Data } from "@/features/config-devices/types/ConfigServices.type";

export interface MapView {
  latitude: number;
  longitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
}

interface InitialMapViewOptions {
  savedCenter: { latitude: number; longitude: number } | null;
  savedZoom: number | null;
  savedPitch: number | null;
  savedBearing: number | null;
  devices?: Data;
  config: { latitud: string; longitud: string } | null;
  fallback: MapView;
}

function validCenter(latitude: number, longitude: number) {
  return Number.isFinite(latitude) && Math.abs(latitude) <= 90 &&
    Number.isFinite(longitude) && Math.abs(longitude) <= 180;
}

/** Vista guardada > primer radar con coordenadas válidas > configuración anterior. */
export function resolveInitialMapView(options: InitialMapViewOptions): MapView {
  const { savedCenter, savedZoom, savedPitch, savedBearing, devices, config, fallback } = options;
  let center = { latitude: fallback.latitude, longitude: fallback.longitude };
  const configLat = Number.parseFloat(config?.latitud ?? "");
  const configLon = Number.parseFloat(config?.longitud ?? "");
  if (validCenter(configLat, configLon) && configLat !== 0 && configLon !== 0) {
    center = { latitude: configLat, longitude: configLon };
  }
  const radars = [
    ...(devices?.nanoradares ?? []).map(r => [r.latitud, r.longitud]),
    ...(devices?.magosradares ?? []).map(r => [r.latitud, r.longitud]),
    ...(devices?.spotters ?? []).map(r => [r.latitude, r.longitude]),
  ];
  for (const [lat, lon] of radars) {
    if (lat == null || lon == null || String(lat).trim() === "" || String(lon).trim() === "") continue;
    const latitude = Number(lat), longitude = Number(lon);
    if (validCenter(latitude, longitude) && (latitude !== 0 || longitude !== 0)) {
      center = { latitude, longitude };
      break;
    }
  }
  if (savedCenter && validCenter(savedCenter.latitude, savedCenter.longitude)) {
    center = savedCenter;
  }
  return {
    ...center,
    zoom: savedZoom !== null && Number.isFinite(savedZoom) && savedZoom >= 0 && savedZoom <= 22 ? savedZoom : fallback.zoom,
    pitch: savedPitch !== null && Number.isFinite(savedPitch) && savedPitch >= 0 && savedPitch <= 85 ? savedPitch : fallback.pitch,
    bearing: savedBearing !== null && Number.isFinite(savedBearing) ? savedBearing : fallback.bearing,
  };
}
