import { getGeoPoint } from "../utils/geoHelpers";

/**
 * Dibuja un sector con degradado suave (angular + radial) en un canvas offscreen
 * y devuelve la data URL resultante, lista para usarse como ImageSource en Mapbox.
 *
 * - Degradado angular (cónico): opaco en el centro del beam, transparente en los bordes.
 * - Degradado radial (máscara): fade hacia el borde exterior del arco.
 *
 * @param azimut   Dirección central del beam (°, Norte-clockwise)
 * @param apertura Amplitud angular total del beam (°)
 * @param color    Color hex del beam (ej: "#a855f7")
 * @param size     Resolución del canvas en píxeles (defecto 512)
 */
export function buildBeamCanvas(
  azimut: number,
  apertura: number,
  color: string,
  size = 512,
): string {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2;

  // Geo: 0° = Norte, sentido horario
  // Canvas arc: 0° = Este (3 en punto), sentido horario
  // Conversión: canvasRad = (geo - 90) * π/180
  const geoToRad = (deg: number) => ((deg - 90) * Math.PI) / 180;

  const startA = geoToRad(azimut - apertura / 2);
  const endA = geoToRad(azimut + apertura / 2);
  const span = endA - startA; // radianes, siempre > 0

  // Paso 1: recortar al sector
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, r, startA, endA);
  ctx.closePath();
  ctx.clip();

  // Paso 2: degradado angular cónico — transparente en los bordes, opaco en el centro
  // createConicGradient(startAngle, cx, cy): stop 0 = startAngle, stop 1 = startAngle + 2π
  const fraction = span / (2 * Math.PI);
  const conic = ctx.createConicGradient(startA, cx, cy);
  conic.addColorStop(0, `${color}00`);
  conic.addColorStop(fraction * 0.5, `${color}b8`); // pico de opacidad en el eje central
  conic.addColorStop(fraction, `${color}00`);
  if (fraction < 0.999) conic.addColorStop(1, `${color}00`);

  ctx.fillStyle = conic;
  ctx.fillRect(0, 0, size, size);

  // Paso 3: máscara radial con destination-in — fade hacia el borde exterior
  const radial = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  radial.addColorStop(0,    "rgba(0,0,0,1)");
  radial.addColorStop(0.72, "rgba(0,0,0,0.95)");
  radial.addColorStop(1,    "rgba(0,0,0,0)");

  ctx.globalCompositeOperation = "destination-in";
  ctx.fillStyle = radial;
  ctx.fillRect(0, 0, size, size);

  ctx.restore();
  return canvas.toDataURL("image/png");
}

/**
 * Calcula las 4 esquinas geográficas del cuadrado delimitador centrado en (lat, lon)
 * con lado = 2*radio, en el formato requerido por Mapbox ImageSource.
 *
 * Devuelve: [NW, NE, SE, SW] como [lng, lat]
 */
export function buildBeamImageCoords(
  lat: number,
  lon: number,
  radio: number,
): [[number, number], [number, number], [number, number], [number, number]] {
  const north = getGeoPoint(lat, lon, 0,   radio)[1];
  const east  = getGeoPoint(lat, lon, 90,  radio)[0];
  const south = getGeoPoint(lat, lon, 180, radio)[1];
  const west  = getGeoPoint(lat, lon, 270, radio)[0];

  return [
    [west, north], // NW — top-left
    [east, north], // NE — top-right
    [east, south], // SE — bottom-right
    [west, south], // SW — bottom-left
  ];
}
