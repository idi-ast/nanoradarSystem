import type { ComponentType } from "react";
import {
  IconUser,
  IconCar,
  IconSailboat,
  IconPaw,
  IconDrone,
  IconLifebuoy,
  IconRipple,
} from "@tabler/icons-react";
import { IconTargetNeutral } from "../components/icons/IconTargetNeutral";

export { IconTargetNeutral };

export type TrackCategory =
  | "HUMAN"
  | "VEHICLE"
  | "BOAT"
  | "ANIMAL"
  | "DRONE"
  | "BUOY"
  | "UNKNOWN"
  | "OTHER";

export interface TrackCategoryItem {
  id: TrackCategory;
  label: string;
  icon: ComponentType<{ size?: number; stroke?: number; className?: string; color?: string }>;
  color: string;
}

export const TRACK_CATEGORIES_CONFIG: TrackCategoryItem[] = [
  { id: "HUMAN",   label: "Persona",        icon: IconUser,          color: "#a78bfa" },
  { id: "VEHICLE", label: "Vehículo",       icon: IconCar,           color: "#e879f9" },
  { id: "BOAT",    label: "Embarcación",    icon: IconSailboat,      color: "#38bdf8" },
  { id: "ANIMAL",  label: "Animal",         icon: IconPaw,           color: "#a3e635" },
  { id: "DRONE",   label: "Dron",           icon: IconDrone,         color: "#f43f5e" },
  { id: "BUOY",    label: "Boya",           icon: IconLifebuoy,      color: "#f97316" },
  { id: "UNKNOWN", label: "Sin clasificar", icon: IconTargetNeutral, color: "#94a3b8" },
  { id: "OTHER",   label: "Otro",           icon: IconRipple,        color: "#5eead4" },
];

export const ALL_TRACK_CATEGORIES: TrackCategory[] = TRACK_CATEGORIES_CONFIG.map(
  (c) => c.id,
);

/**
 * Normaliza cualquier clasificación recibida desde el radar o backend a TrackCategory canónica.
 */
export function normalizeTrackCategory(
  raw?: string | null,
): TrackCategory {
  if (!raw) return "UNKNOWN";
  const val = raw.toString().trim().toLowerCase();

  if (["human", "persona", "person", "walk", "peaton", "peatón"].includes(val)) {
    return "HUMAN";
  }
  if (
    [
      "vehicle", "vehiculo", "vehículo", "car", "auto", "camion", "camión",
      "truck", "motorcycle", "moto", "bus", "bicycle", "bici",
    ].includes(val)
  ) {
    return "VEHICLE";
  }
  if (
    [
      "boat", "barco", "lancha", "ship", "vessel", "speedboat", "bote",
      "embarcacion", "embarcación",
    ].includes(val)
  ) {
    return "BOAT";
  }
  if (["animal", "pajaro", "pájaro", "bird", "paw", "perro", "dog"].includes(val)) {
    return "ANIMAL";
  }
  if (["drone", "dron", "uav"].includes(val)) {
    return "DRONE";
  }
  if (["buoy", "boya", "bolla"].includes(val)) {
    return "BUOY";
  }
  if (["unknown", "desconocido", "sin_clasificar", "none", ""].includes(val)) {
    return "UNKNOWN";
  }

  const upper = raw.toString().toUpperCase() as TrackCategory;
  if (ALL_TRACK_CATEGORIES.includes(upper)) {
    return upper;
  }

  return "OTHER";
}

/**
 * Verifica si una categoría de track está permitida en la lista allowed_categories de una zona.
 */
export function isTrackCategoryAllowed(
  category?: string | null,
  allowedCategories?: TrackCategory[] | string[] | null,
): boolean {
  if (!allowedCategories || allowedCategories.length === 0) {
    // Si no está definido (zonas preexistentes), por defecto se consideran todas permitidas
    return true;
  }
  const normTarget = normalizeTrackCategory(category);
  const normalizedSet = new Set(
    allowedCategories.map((c) => normalizeTrackCategory(c)),
  );
  return normalizedSet.has(normTarget);
}
