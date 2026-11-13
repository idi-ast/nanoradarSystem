import { computeOperationalAnalysis } from '@/features/history/reportAnalytics';

type Input = Parameters<typeof computeOperationalAnalysis>[0];
self.onmessage = (event: MessageEvent<Input>) => {
  try { self.postMessage({ analysis: computeOperationalAnalysis(event.data) }); }
  catch (error) { self.postMessage({ error: error instanceof Error ? error.message : 'No se pudo calcular el análisis' }); }
};
