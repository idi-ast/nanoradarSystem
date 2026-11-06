import type { RadarZone } from '@/features/devices/types';
import templates from './zoneExportTemplate.json';

export type ZoneExportProfile = keyof typeof templates;
export const ZONE_EXPORT_PROFILES: {value: ZoneExportProfile; label: string}[] = [{value:'exterior',label:'Exterior'}, {value:'interior',label:'Interior'}];

export type Coordinate = [number, number]; // Database order: latitude, longitude.
export interface DraftVertex { latitude: string; longitude: string }
export interface ExportVertex { latitude: number; longitude: number; altitude: 0 }
export function isCoordinate(lat: number, lon: number) {
  return Number.isFinite(lat) && Math.abs(lat) <= 90 && Number.isFinite(lon) && Math.abs(lon) <= 180;
}
function coordinate(value: unknown, index: number): Coordinate {
  let lat: unknown, lon: unknown;
  if (Array.isArray(value)) [lat, lon] = value;
  else if (value && typeof value === 'object') {
    const p = value as Record<string, unknown>;
    lat = p.latitude ?? p.lat ?? p[0]; lon = p.longitude ?? p.lon ?? p.lng ?? p[1];
  }
  const validNumber = (v: unknown) => (typeof v === 'number' || typeof v === 'string' && v.trim() !== '') && Number.isFinite(Number(v));
  if (!validNumber(lat) || !validNumber(lon) || !isCoordinate(Number(lat), Number(lon))) throw new Error(`El punto ${index + 1} tiene coordenadas inválidas. Revisa latitud (-90 a 90) y longitud (-180 a 180).`);
  return [Number(lat), Number(lon)];
}
/** Read every vertex in database order; never silently drop malformed points. */
export function readZoneCoordinates(raw: unknown): Coordinate[] {
  if (Array.isArray(raw)) return raw.map(coordinate);
  if (raw && typeof raw === 'object') {
    const values = raw as Record<string, unknown>;
    const keys = Object.keys(values).sort((a, b) => {
      const an = Number(a.replace(/\D/g, '')), bn = Number(b.replace(/\D/g, ''));
      return Number.isFinite(an) && Number.isFinite(bn) ? an - bn : 0;
    });
    return keys.map((key, index) => coordinate(values[key], index));
  }
  throw new Error('La zona no tiene una lista de vértices válida.');
}
export function closeZoneRing(points: Coordinate[]): Coordinate[] {
  if (new Set(points.map(p => JSON.stringify(p))).size < 3) throw new Error('La zona necesita al menos tres vértices distintos.');
  const first = points[0], last = points[points.length - 1];
  return first[0] === last[0] && first[1] === last[1] ? points.map(p => [...p]) : [...points.map(p => [...p] as Coordinate), [...first]];
}
export function draftCoordinates(points: DraftVertex[]): Coordinate[] {
  return points.map(coordinate);
}
/** Only vertices, the real DB ID and the saved name vary from the supplied format. */
export function buildZoneExport(zone: RadarZone, profile: ZoneExportProfile = 'exterior') {
  if (!Number.isSafeInteger(zone.id) || zone.id! < 1) throw new Error('Guarda la zona en la base de datos antes de copiar su JSON.');
  if (!zone.nombre?.trim()) throw new Error('La zona guardada no tiene nombre.');
  const template = templates[profile];
  if (!template) throw new Error('Selecciona una de las plantillas del archivo.');
  const vertices: ExportVertex[] = closeZoneRing(readZoneCoordinates(zone.poligono?.vertices)).map(([latitude, longitude]) => ({ latitude, longitude, altitude: 0 }));
  const id = `MG-${zone.id}`;
  return { [id]: { vertices, id, name: zone.nombre, ...structuredClone(template) } };
}
/** Match the complete supplied envelope for both single and batch exports. */
export function buildZonesExport(zones: readonly RadarZone[], profiles: Readonly<Record<string, ZoneExportProfile>> = {}) {
  if (!zones.length) throw new Error('Marca al menos una zona para copiar su JSON.');
  const alert: Record<string, ReturnType<typeof buildZoneExport>[string]> = {};
  for (const zone of zones) {
    const entry = buildZoneExport(zone, profiles[String(zone.id)] ?? 'exterior');
    const id = Object.keys(entry)[0];
    if (Object.hasOwn(alert, id)) throw new Error(`La zona ${id} está repetida en la selección.`);
    alert[id] = entry[id];
  }
  return { result: { alert } };
}
export const zonesExportJson = (zones: readonly RadarZone[], profiles: Readonly<Record<string, ZoneExportProfile>> = {}) => JSON.stringify(buildZonesExport(zones, profiles), null, 4);
export const zoneExportJson = (zone: RadarZone, profile: ZoneExportProfile = 'exterior') => zonesExportJson([zone], { [String(zone.id)]: profile });
