/**
 * ID del contenedor que recibe los paneles abiertos desde la barra de
 * botones del mapa. Vive dentro del espacio del rightbar: cuando un panel
 * está abierto se renderiza por encima del contenido del rightbar.
 */
export const MAP_PANELS_HOST_ID = "wiradar-map-panels-host";

export function getMapPanelsHost(): Element | null {
  if (typeof document === "undefined") return null;
  return document.getElementById(MAP_PANELS_HOST_ID);
}