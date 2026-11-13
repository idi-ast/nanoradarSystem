import { useEffect, useState } from 'react';
import { useUserStore } from '@/libs/zustand/stores/userStore';
import { useQuery } from '@tanstack/react-query';
import { apiSystem } from '@/apis/apiSystem';
import type { PtzTrackingSnapshot } from '../types/ptzTracking';
import { PTZ_STATUS_MAX_AGE_MS } from '../utils/ptzTracking';

export function usePtzTracking() {
  const userId = useUserStore(state => state.user?.id);
  const [now, setNow] = useState(Date.now);
  const query = useQuery({
    queryKey: ['ptz-tracking-status', userId],
    enabled: userId != null,
    queryFn: async ({ signal }): Promise<PtzTrackingSnapshot> => {
      const controller = new AbortController();
      const abort = () => controller.abort();
      signal.addEventListener('abort', abort, { once: true });
      if (signal.aborted) abort();
      const timeout = setTimeout(abort, 3000);
      try {
        const response = await apiSystem.get<Omit<PtzTrackingSnapshot, 'receivedAt'>>('/tracking/status', undefined, { signal: controller.signal });
        return { ...response.data, receivedAt: Date.now() };
      } finally {
        clearTimeout(timeout);
        signal.removeEventListener('abort', abort);
      }
    },
    refetchInterval: 1000,
    staleTime: 500,
    retry: false,
  });
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const unavailable = query.isError || Boolean(query.data && now - query.data.receivedAt > PTZ_STATUS_MAX_AGE_MS);
  return { snapshot: unavailable ? undefined : query.data, unavailable, now };
}
