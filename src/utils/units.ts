/**
 * Unidades de velocidad.
 *
 * El radar Magos NO mide velocidad: el backend la deriva del filtro de
 * Kalman sobre el plano local en METROS, por lo que `speed` siempre llega
 * en m/s. La UI la muestra convertida a km/h y nudos.
 */
export const MS_TO_KMH = 3.6;
export const MS_TO_KNOTS = 1.94384;

export function msToKmh(ms?: number | null): number | null {
  if (ms == null || !Number.isFinite(ms)) return null;
  return ms * MS_TO_KMH;
}

export function msToKnots(ms?: number | null): number | null {
  if (ms == null || !Number.isFinite(ms)) return null;
  return ms * MS_TO_KNOTS;
}

/** "18.0 km/h · 9.7 kn" — recibe m/s. */
export function formatSpeed(ms?: number | null): string {
  const kmh = msToKmh(ms);
  const kn = msToKnots(ms);
  if (kmh == null || kn == null) return "--";
  return `${kmh.toFixed(1)} km/h · ${kn.toFixed(1)} kn`;
}
