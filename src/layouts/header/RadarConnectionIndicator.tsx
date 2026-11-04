import { useRadarConnectionStore } from '@/features/devices/stores/radarConnectionStore';

export function RadarConnectionIndicator() {
  const connected = useRadarConnectionStore(state => [...state.connections.values()].includes('connected'));
  const label = connected ? 'WebSocket de radares conectado' : 'WebSocket de radares sin conexión';
  return <span role="status" aria-label={label} title={label} className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${connected ? 'bg-emerald-500' : 'bg-gray-400'}`} />;
}
