import { getGeoPoint } from "../utils/geoHelpers";

/**
 * Construye las coordenadas de un polígono sectorial (cono).
 * El polígono cierra en el punto de origen (lat, lon).
 */
export function buildSectorPolygon(
  lat: number,
  lon: number,
  startAngle: number,
  endAngle: number,
  radius: number,
  step = 0.5,
): [number, number][] {
  const coords: [number, number][] = [[lon, lat]];
  for (let a = startAngle; a <= endAngle; a += step) {
    coords.push(getGeoPoint(lat, lon, a, radius));
  }
  coords.push([lon, lat]);
  return coords;
}

/**
 * Construye las coordenadas del arco exterior de un sector.
 */
export function buildArcCoords(
  lat: number,
  lon: number,
  startAngle: number,
  endAngle: number,
  radius: number,
  step = 1,
): [number, number][] {
  const coords: [number, number][] = [];
  for (let a = startAngle; a <= endAngle; a += step) {
    coords.push(getGeoPoint(lat, lon, a, radius));
  }
  return coords;
}
