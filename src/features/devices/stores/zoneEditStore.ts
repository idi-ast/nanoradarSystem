import { create } from "zustand";
import type { RadarZone } from "../types";
import { extractZoneVertices } from "../components/map/utils/geoHelpers";

export interface ZoneEditState {
  /** ID o nombre único de la zona actualmente en edición */
  editingZoneId: number | string | null;
  /** Referencia a la zona original completa */
  editingZone: RadarZone | null;
  /** Vértices editables en tiempo real: array de [lat, lon] */
  vertices: [number, number][];
  /** Color de la zona en edición para la previsualización */
  color: string;
  /** Indica si se han movido o alterado los vértices originales */
  isDirty: boolean;

  /** Iniciar edición interactiva de una zona */
  startEditing: (zone: RadarZone) => void;
  /** Actualizar un vértice específico por índice (al arrastrar con el mouse) */
  updateVertex: (index: number, lat: number, lon: number) => void;
  /** Agregar un nuevo vértice en un índice o al final */
  addVertex: (lat: number, lon: number, atIndex?: number) => void;
  /** Eliminar un vértice por índice (solo si quedan al menos 3) */
  removeVertex: (index: number) => void;
  /** Reemplazar todos los vértices */
  setVertices: (vertices: [number, number][]) => void;
  /** Actualizar el color de previsualización */
  setColor: (color: string) => void;
  /** Restaurar vértices originales de la zona */
  resetVertices: () => void;
  /** Finalizar o cancelar la edición */
  stopEditing: () => void;
}

export const useZoneEditStore = create<ZoneEditState>((set, get) => ({
  editingZoneId: null,
  editingZone: null,
  vertices: [],
  color: "#ff0000",
  isDirty: false,

  startEditing: (zone: RadarZone) => {
    const rawVertices = extractZoneVertices(zone.poligono.vertices);
    set({
      editingZoneId: zone.id ?? zone.nombre,
      editingZone: zone,
      vertices: rawVertices,
      color: zone.poligono.color || "#ff0000",
      isDirty: false,
    });
  },

  updateVertex: (index: number, lat: number, lon: number) => {
    const { vertices } = get();
    if (index < 0 || index >= vertices.length) return;
    const next = [...vertices];
    next[index] = [lat, lon];
    set({ vertices: next, isDirty: true });
  },

  addVertex: (lat: number, lon: number, atIndex?: number) => {
    const { vertices } = get();
    const next = [...vertices];
    if (atIndex !== undefined && atIndex >= 0 && atIndex <= next.length) {
      next.splice(atIndex, 0, [lat, lon]);
    } else {
      next.push([lat, lon]);
    }
    set({ vertices: next, isDirty: true });
  },

  removeVertex: (index: number) => {
    const { vertices } = get();
    if (vertices.length <= 3) return; // Mínimo 3 vértices para formar un polígono
    if (index < 0 || index >= vertices.length) return;
    const next = vertices.filter((_, i) => i !== index);
    set({ vertices: next, isDirty: true });
  },

  setVertices: (vertices: [number, number][]) => {
    set({ vertices, isDirty: true });
  },

  setColor: (color: string) => {
    set({ color });
  },

  resetVertices: () => {
    const { editingZone } = get();
    if (!editingZone) return;
    const rawVertices = extractZoneVertices(editingZone.poligono.vertices);
    set({ vertices: rawVertices, isDirty: false });
  },

  stopEditing: () => {
    set({
      editingZoneId: null,
      editingZone: null,
      vertices: [],
      color: "#ff0000",
      isDirty: false,
    });
  },
}));
