import { useEffect, useMemo, useState } from 'react';
import { computeOperationalAnalysis, type OperationalAnalysis } from '@/features/history/reportAnalytics';

type Input = Parameters<typeof computeOperationalAnalysis>[0];
/** One worker per active calculation; obsolete work is terminated on filter changes. */
export function useOperationalAnalysis(input: Input | null) {
  const [result, setResult] = useState<{ input: Input; analysis: OperationalAnalysis } | null>(null);
  const [fallback, setFallback] = useState(false);
  const synchronous = typeof Worker === 'undefined' || fallback;
  const direct = useMemo(() => synchronous && input ? computeOperationalAnalysis(input) : null, [synchronous, input]);
  useEffect(() => {
    if (!input || synchronous) return;
    let cancelled = false;
    let worker: Worker | undefined;
    try {
      worker = new Worker(new URL('../operationalAnalysis.worker.ts', import.meta.url), { type: 'module' });
      worker.onmessage = event => {
        if (cancelled) return;
        if (event.data.error) { worker?.terminate(); setFallback(true); return; }
        setResult({ input, analysis: event.data.analysis });
      };
      worker.onerror = () => { if (!cancelled) { worker?.terminate(); setFallback(true); } };
      worker.postMessage(input);
    } catch { worker?.terminate(); queueMicrotask(() => { if (!cancelled) setFallback(true); }); }
    return () => { cancelled = true; worker?.terminate(); };
  }, [input, synchronous]);
  const analysis = synchronous ? direct : result?.input === input ? result.analysis : null;
  return { analysis, isComputing: Boolean(input && !analysis) };
}
