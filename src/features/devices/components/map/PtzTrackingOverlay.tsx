import { IconCamera } from '@tabler/icons-react';
import { useRadarTargets } from '../../context/useRadarContext';
import { useBehaviorVisibilityStore } from '../../stores/behaviorVisibilityStore';
import { isBehaviorVisible } from '../../config/behaviorCategories';
import { ptzStateLabel } from '../../utils/ptzTracking';

export function PtzTrackingOverlay({ onSelectTarget }: { onSelectTarget: (id: string) => void }) {
  const { trackingSessions, trackingUnavailable } = useRadarTargets();
  const visibility = useBehaviorVisibilityStore(s => s.visibility);
  if (!trackingSessions.length && !trackingUnavailable) return null;
  return <aside aria-label="Estado de seguimiento de cámaras" className="absolute bottom-28 left-3 z-20 max-h-48 max-w-[calc(100%-5rem)] overflow-y-auto rounded-lg border border-white/15 bg-slate-950/90 p-2 text-xs text-slate-100 shadow-lg backdrop-blur">
    <div className="mb-1 flex items-center gap-1.5 font-semibold"><IconCamera size={15} />Seguimiento de cámaras</div>
    {trackingUnavailable ? <p className="text-amber-300" role="status">Estado PTZ sin actualizar</p> : trackingSessions.map(session => {
      const target = session.target;
      const retained = target && (target.signal_state === 'retained' || session.tracking_state === 'waiting');
      const hidden = target && !isBehaviorVisible(target.category ?? '', visibility);
      return <div key={`${session.radar_ip}:${session.ptz_id}`} className="border-t border-white/10 py-1.5 first:border-0">
        <p><span className="font-semibold">Cámara #{session.ptz_id}</span> · {ptzStateLabel(session)}</p>
        {target && <button type="button" onClick={() => onSelectTarget(`magosradar_${target.track_id}`)} className="mt-0.5 block cursor-pointer text-left text-cyan-200 hover:underline">
          {target.track_id} · {target.zone}
        </button>}
        {retained && <p className="mt-0.5 text-amber-300">Última posición conocida · sin señal hace {Math.max(1, Math.floor(target.age_seconds))} s</p>}
        {hidden && <p className="text-slate-400">Categoría oculta · objetivo visible por PTZ</p>}
      </div>;
    })}
  </aside>;
}
