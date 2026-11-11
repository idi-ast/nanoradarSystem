import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useUserStore } from '@/libs/zustand/stores/userStore';
import type { RadarTarget } from '../types';

const MAX_WATCHED = 20;
const MAX_POINTS = 1500;
export function useSurveillanceScope(instanceId: string) {
  const userId = useUserStore(state => state.user?.id ?? null);
  return JSON.stringify([userId, instanceId]);
}
interface Entry { scope: string; target: RadarTarget; excluded?: boolean }
interface State {
  entries: Record<string, Entry>;
  watch: (scope: string, target: RadarTarget) => void;
  release: (scope: string, id: string) => void;
  exclude: (scope: string, ids: string[]) => void;
  observe: (scope: string, targets: RadarTarget[], force?: boolean) => void;
}
const key = (scope: string, id: string) => JSON.stringify([scope, id]);
const snapshot = (target: RadarTarget): RadarTarget => ({ ...target, underSurveillance: true, history: target.history.slice(-MAX_POINTS) });
const valid = (target: RadarTarget) => target?.deviceType === 'magosradar' && typeof target.id === 'string' &&
  Number.isFinite(target.lat) && Math.abs(target.lat) <= 90 && Number.isFinite(target.lon) && Math.abs(target.lon) <= 180 &&
  Number.isFinite(target.lastUpdate) && Array.isArray(target.history) && target.history.length > 0 &&
  target.history.every(p => Array.isArray(p) && p.length === 3 && p.every(Number.isFinite));

/** Saved observations only: never refresh timestamps or generate detections. */
export const useTrackSurveillanceStore = create<State>()(persist((set, get) => ({
  entries: {},
  watch: (scope, target) => {
    if (!valid(target)) throw Error('El track no tiene una posición válida para vigilar.');
    const id = key(scope, target.id);
    if (!get().entries[id] && Object.keys(get().entries).length >= MAX_WATCHED) throw Error('Puedes mantener hasta 20 tracks bajo vigilancia. Retira uno para agregar otro.');
    set(state => ({ entries: { ...state.entries, [id]: { scope, target: snapshot(target) } } }));
  },
  release: (scope, id) => set(state => {
    const entries = { ...state.entries }; delete entries[key(scope, id)]; return { entries };
  }),
  exclude: (scope, ids) => {
    let entries: State['entries'] | undefined;
    for (const targetId of ids) {
      const id = key(scope, targetId), previous = get().entries[id];
      if (!previous || previous.excluded) continue;
      entries ??= { ...get().entries };
      entries[id] = { ...previous, excluded: true };
    }
    if (entries) set({ entries });
  },
  observe: (scope, targets, force = false) => {
    let entries: State['entries'] | undefined;
    for (const target of targets) {
      if (!valid(target)) continue;
      const id = key(scope, target.id);
      const aliases = (target.mergedTrackIds ?? []).map(alias => key(scope, `magosradar_${alias}`))
        .filter(alias => alias !== id && (entries ?? get().entries)[alias]);
      if (aliases.length) {
        entries ??= { ...get().entries };
        const watched = Boolean(entries[id]) || aliases.some(alias => !entries![alias].excluded);
        for (const alias of aliases) delete entries[alias];
        if (watched) entries[id] = { scope, target: snapshot(target) };
      }
      const previous = (entries ?? get().entries)[id];
      if (!previous || (force && previous.excluded) || !valid(target) || target.lastUpdate <= previous.target.lastUpdate ||
          (!force && !previous.excluded && target.lastUpdate - previous.target.lastUpdate < 5000)) continue;
      entries ??= { ...get().entries };
      entries[id] = { scope, target: snapshot(target) };
    }
    if (entries) set({ entries });
  },
}), {
  name: 'radar-track-surveillance', version: 1,
  // Restore only bounded, valid snapshots from this browser.
  merge: (persisted, current) => {
    const raw = (persisted as Partial<State> | undefined)?.entries ?? {};
    const entries = Object.fromEntries(Object.entries(raw).filter(([, entry]) => entry && typeof entry.scope === 'string' && valid(entry.target))
      .slice(0, MAX_WATCHED).map(([id, entry]) => [id, { ...entry, target: snapshot(entry.target) }]));
    return { ...current, entries };
  },
}));

export function mergeSurveillanceTargets(live: RadarTarget[], entries: State['entries'], scope: string) {
  const saved = Object.values(entries).filter(entry => entry.scope === scope && !entry.excluded);
  if (!saved.length) return live;
  const watched = new Map(saved.map(entry => [entry.target.id, entry.target]));
  const merged = live.map(target => watched.has(target.id) || target.mergedTrackIds?.some(id => watched.has(`magosradar_${id}`))
    ? { ...target, underSurveillance: true } : target);
  const liveIds = new Set(live.flatMap(target => [target.id, ...(target.mergedTrackIds ?? []).map(id => `magosradar_${id}`)]));
  for (const [id, target] of watched) if (!liveIds.has(id)) merged.push(target);
  return merged;
}
