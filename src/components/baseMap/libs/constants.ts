import type { MapCenter } from "../types";

export const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || "";

export const DEFAULT_CENTER: MapCenter = {
  longitude: -72.98785731735325,
  latitude: -41.462125652073404,
};

// -41.462125652073404, -72.98785731735325
export const MAP_ZOOM_LEVEL = 11;

export const MAP_STYLES = {
  street: "mapbox://styles/mapbox/streets-v12",
  dark: "mapbox://styles/mapbox/dark-v11",
  satellite: "mapbox://styles/mapbox/satellite-streets-v12",
  smooth: "mapbox://styles/mapbox/satellite-v9",
  navigation_day: "mapbox://styles/mapbox/navigation-day-v1",
  navigation_night: "mapbox://styles/mapbox/navigation-night-v1",
} as const;

/**
 * Capa que el tema "light" impone por encima de la eleccion manual del
 * usuario. Al volver a "dark" el mapa vuelve a la capa que el usuario habia
 * elegido.
 */
export const THEME_MAP_LAYER = "navigation_day" as const;
