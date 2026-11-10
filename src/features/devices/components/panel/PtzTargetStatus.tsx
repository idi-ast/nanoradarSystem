import { IconCamera } from '@tabler/icons-react';
import { useRadarTargets } from '../../context/useRadarContext';
import { useBehaviorVisibilityStore } from '../../stores/behaviorVisibilityStore';
import { isBehaviorVisible, targetBehaviorKey } from '../../config/behaviorCategories';
import { isPtzPositionRetained } from '../../utils/ptzTracking';

export function PtzTargetStatus({ targetId }: { targetId: string }) {
  const { targets, trackingNow } = useRadarTargets();
  const visibility = useBehaviorVisibilityStore(s => s.visibility);
  const target = targets.find(t => t.id === targetId);
  if (!target?.ptzTracking?.length) return null;
  const retained = isPtzPositionRetained(target, trackingNow);
  return <span className={`mt-1 block text-[10px] ${retained ? 'text-amber-400' : 'text-cyan-400'}`}>
    <span className="flex items-center gap-1"><IconCamera size={12} />PTZ {target.ptzTracking.map(s => `#${s.ptzId}`).join(', ')} · {retained ? 'Última posición conocida' : 'Detección reciente'}</span>
    {retained && <span className="block">Sin señal hace {Math.max(1, Math.floor((trackingNow - target.lastUpdate) / 1000))} s</span>}
    {!isBehaviorVisible(targetBehaviorKey(target), visibility) && <span className="block text-text-200">Categoría oculta · visible por PTZ</span>}
  </span>;
}
