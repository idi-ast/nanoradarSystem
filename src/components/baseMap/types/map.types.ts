import type { MapRef } from "react-map-gl";

/**
 * Claves de capa compartidas por los registros de `mapLayers` de RadarMap y
 * BaseMap. `THEME_MAP_LAYER` debe formar parte de esta union para poder
 * forzarla desde el tema.
 */
export type MapLayer =
  | "street"
  | "dark"
  | "satellite"
  | "smooth"
  | "light"
  | "outdoors"
  | "navigation_day"
  | "navigation_night"
  | "terrain"
  | "blueprint"
  | "standard"
  | "traffic_day"
  | "traffic_night"
  | "blank"
  | "streets_v11"
  | "light_v10"
  | "dark_v10"
  | "emerald";

export interface MapLayerConfig {
  name: string;
  icon: React.ReactNode;
  style: string;
}

export interface MapCenter {
  longitude: number;
  latitude: number;
}

export interface BaseMapProps {
  children?: React.ReactNode;
  initialCenter?: MapCenter;
  initialZoom?: number;
  onMapRef?: (ref: MapRef | null) => void;
}

export interface CustomZoomControlProps {
  mapRef: React.RefObject<MapRef | null>;
}

export interface ViewControlsProps {
  mapRef: React.RefObject<MapRef | null>;
  initialCenter: MapCenter;
  initialZoom: number;
}

export interface LayerSelectorProps {
  selectedLayer: MapLayer;
  onLayerChange: (layer: MapLayer) => void;
  mapLayers: Record<MapLayer, MapLayerConfig>;
}
