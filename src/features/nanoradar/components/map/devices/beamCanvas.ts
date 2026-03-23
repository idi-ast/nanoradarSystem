import { getGeoPoint } from "../utils/geoHelpers";

/**
 * Dibuja un sector con degradado suave (angular + radial) en un canvas offscreen
 * y devuelve la data URL resultante, lista para usarse como ImageSource en Mapbox.
 *
 * - Degradado angular (cónico): opaco en el centro del beam, transparente en los bordes.
 * - Degradado radial (máscara): fade hacia el borde exterior del arco.
 *
 * @param azimut              Dirección central del beam (°, Norte-clockwise)
 * @param apertura            Amplitud angular total del beam (°)
 * @param color               Color hex del beam (ej: "#a855f7")
 * @param size                Resolución del canvas en píxeles (defecto 512)
 * @param extraAperture       Grados extra de apertura para suavizar bordes del gradiente
 * @param peakOpacityPercent  Opacidad pico del centro en % (0-100)
 * @param radialFadeStart     % del radio donde empieza el desvanecimiento radial (0-100)
 * @param edgeFadeRatio       Fracción de cada lado angular (0-0.5) que se usa para el fade; el resto es techo plano (defecto 0.15)
 */
export function buildBeamCanvas(
  azimut: number,
  apertura: number,
  color: string,
  size = 512,
  extraAperture = 0,
  peakOpacityPercent = 40,
  radialFadeStart = 15,
  edgeFadeRatio = 0.15,
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

  // Apertura visual (más ancha) para el degradado con bordes suaves
  const visualApertura = apertura + extraAperture;
  const startAVisual = geoToRad(azimut - visualApertura / 2);
  const endAVisual = geoToRad(azimut + visualApertura / 2);
  const spanVisual = endAVisual - startAVisual;

  // 1. Dibuja el degradado cónico ANCHO en todo el canvas
  ctx.save();
  const fraction = spanVisual / (2 * Math.PI);
  const peakOpacityHex = Math.round((peakOpacityPercent / 100) * 255)
    .toString(16)
    .padStart(2, "0");

  // Perfil de "techo plano": los extremos (edgeFadeRatio) hacen fade in/out,
  // el centro mantiene la opacidad pico de forma uniforme.
  const clampedEdge = Math.min(Math.max(edgeFadeRatio, 0), 0.49);
  const edgeFrac = fraction * clampedEdge;
  const peakStart = edgeFrac;
  const peakEnd = fraction - edgeFrac;

  const conic = ctx.createConicGradient(startAVisual, cx, cy);
  conic.addColorStop(0, `${color}00`);
  conic.addColorStop(Math.min(peakStart, fraction * 0.49), `${color}${peakOpacityHex}`);
  conic.addColorStop(Math.max(peakEnd, fraction * 0.51), `${color}${peakOpacityHex}`);
  conic.addColorStop(fraction, `${color}00`);
  if (fraction < 0.999) conic.addColorStop(1, `${color}00`);

  ctx.fillStyle = conic;
  ctx.fillRect(0, 0, size, size);

  // 2. Aplica el degradado RADIAL para desvanecer hacia el borde exterior
  const radial = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  radial.addColorStop(0, "rgba(0,0,0,1)");
  radial.addColorStop(radialFadeStart / 100, "rgba(0,0,0,1)");
  radial.addColorStop(1, "rgba(0,0,0,0)");

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
  const north = getGeoPoint(lat, lon, 0, radio)[1];
  const east = getGeoPoint(lat, lon, 90, radio)[0];
  const south = getGeoPoint(lat, lon, 180, radio)[1];
  const west = getGeoPoint(lat, lon, 270, radio)[0];

  return [
    [west, north], // NW — top-left
    [east, north], // NE — top-right
    [east, south], // SE — bottom-right
    [west, south], // SW — bottom-left
  ];
}
