import type { RadarTarget } from '../types';
import type { PtzTrackingSession, PtzTrackingSnapshot } from '../types/ptzTracking';

/** A polling failure must never pin an old PTZ selection indefinitely. */
export const PTZ_STATUS_MAX_AGE_MS = 4000;

export function mergePtzTargets(targets: RadarTarget[], snapshot: PtzTrackingSnapshot | undefined, now: number): RadarTarget[] {
  if (!snapshot || now - snapshot.receivedAt > PTZ_STATUS_MAX_AGE_MS) return targets;
  const merged = new Map(targets.map(target => [target.id, target]));
  for (const session of snapshot.sessions) {
    const target = session.target;
    if (!target || !['following', 'waiting'].includes(session.tracking_state)
      || !Number.isFinite(target.lat) || Math.abs(target.lat) > 90
      || !Number.isFinite(target.lon) || Math.abs(target.lon) > 180
      || !Number.isFinite(target.observed_at)) continue;
    const id = `magosradar_${target.track_id}`;
    // Convert server observation time to the browser clock. Polling isn't a new detection.
    const lastUpdate = snapshot.receivedAt - Math.max(0, snapshot.server_time - target.observed_at) * 1000;
    const existing = merged.get(id);
    const selected: RadarTarget = existing ?? {
      id, lat: target.lat, lon: target.lon, zona: target.zone, nivel: target.level,
      lastUpdate, deviceType: 'magosradar', history: [[target.lat, target.lon, lastUpdate]],
      behaviorClass: target.category,
    };
    merged.set(id, {
      ...selected,
      ptzTracking: [...(selected.ptzTracking ?? []), {
        ptzId: session.ptz_id, state: session.tracking_state,
        signalState: target.signal_state, graceSeconds: session.signal_grace_seconds,
      }],
    });
  }
  return [...merged.values()];
}

export function isPtzPositionRetained(target: RadarTarget, now: number): boolean {
  return Boolean(target.ptzTracking?.some(selection => selection.state === 'waiting'
    || selection.signalState === 'retained' || now - target.lastUpdate > selection.graceSeconds * 1000));
}

export function ptzStateLabel(session: PtzTrackingSession): string {
  switch (session.tracking_state) {
    case 'following': return session.target?.signal_state === 'retained'
      ? `Esperando nueva detección · ${session.target.track_id}` : `Siguiendo ${session.target?.track_id ?? 'objetivo'}`;
    case 'waiting': return 'Esperando nueva detección';
    case 'returning_home': return 'Regresando al inicio';
    case 'home': return 'En posición de inicio';
    case 'position_unconfirmed': return 'Posición sin confirmar';
    case 'paused': return 'Seguimiento pausado';
    case 'error': return 'No se pudo regresar al inicio';
    default: return 'Sin seguimiento activo';
  }
}
