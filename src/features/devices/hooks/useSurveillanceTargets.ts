import { useEffect, useMemo, useRef } from 'react';
import type { RadarTarget } from '../types';
import { mergeSurveillanceTargets, useSurveillanceScope, useTrackSurveillanceStore } from '../stores/trackSurveillanceStore';

export function useSurveillanceTargets(live: RadarTarget[], instanceId: string) {
  const scope = useSurveillanceScope(instanceId);
  const entries = useTrackSurveillanceStore(state => state.entries);
  const previous = useRef({ scope, targets: live });
  useEffect(() => {
    const store = useTrackSurveillanceStore.getState();
    if (previous.current.scope === scope) {
      const ids = new Set(live.map(t => t.id));
      // Save the exact last observation when the live cache removes a target.
      store.observe(scope, previous.current.targets.filter(t => !ids.has(t.id)), true);
    }
    store.observe(scope, live);
    previous.current = { scope, targets: live };
  }, [live, scope]);
  return useMemo(() => mergeSurveillanceTargets(live, entries, scope), [live, entries, scope]);
}
