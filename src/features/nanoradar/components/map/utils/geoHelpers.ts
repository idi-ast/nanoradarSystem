/**
 * Calcula un punto geográfico a partir de un centro, rumbo y distancia.
 * Devuelve coordenadas en formato GeoJSON: [longitud, latitud]
 */
export function getGeoPoint(
  centerLat: number,
  centerLon: number,
  bearingDeg: number,
  distanceM: number
): [number, number] {
  const R = 6_371_000;
  const lat1 = (centerLat * Math.PI) / 180;
  const lon1 = (centerLon * Math.PI) / 180;
  const brng = (bearingDeg * Math.PI) / 180;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(distanceM / R) +
      Math.cos(lat1) * Math.sin(distanceM / R) * Math.cos(brng)
  );

  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(distanceM / R) * Math.cos(lat1),
      Math.cos(distanceM / R) - Math.sin(lat1) * Math.sin(lat2)
    );

  // Retorna [longitud, latitud] para GeoJSON (Mapbox)
  return [(lon2 * 180) / Math.PI, (lat2 * 180) / Math.PI];
}

/**
 * Genera coordenadas que aproximan un círculo completo como polígono GeoJSON.
 * Retorna array de [longitud, latitud] listo para usar en GeoJSON.
 */
export function createCircleCoords(
  centerLat: number,
  centerLon: number,
  radiusM: number,
  steps = 64
): [number, number][] {
  const coords: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 360;
    coords.push(getGeoPoint(centerLat, centerLon, angle, radiusM));
  }
  return coords;
}

/**
 * Convierte un par [latitud, longitud] (formato interno del sistema)
 * a [longitud, latitud] (formato GeoJSON/Mapbox).
 */
export function toGeoCoord(latLon: [number, number, ...number[]]): [number, number] {
  return [latLon[1], latLon[0]];
}
