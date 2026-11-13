import { useEffect, useState } from 'react';
import { IconEye } from '@tabler/icons-react';
import { toast } from 'sonner';
import type { RadarTarget } from '../../types';
import { useRadarTargets } from "../../context/useRadarContext";
import { useRadarContext } from '../../context/useRadarContext';
import { useSurveillanceScope, useTrackSurveillanceStore } from '../../stores/trackSurveillanceStore';

export function SurveillanceStatus({ target: snapshot }: { target: RadarTarget }) {
  const { targets } = useRadarTargets();
  const target = targets.find(t => t.id === snapshot.id) ?? snapshot;
  const { instanceConfig } = useRadarContext();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const age = Math.max(0, Math.floor((now - target.lastUpdate) / 1000));
  const elapsed = age < 60 ? `${age} s` : age < 3600 ? `${Math.floor(age / 60)} min` : `${Math.floor(age / 3600)} h ${Math.floor(age % 3600 / 60)} min`;
  return <p className="mt-2 text-xs text-amber-400" role="status">Bajo vigilancia · {now - target.lastUpdate <= instanceConfig.timing.TRACKING_ACTIVE_MS ? 'Detección reciente' : `Sin señal hace ${elapsed} · Última posición conocida`}</p>;
}

export function TrackSurveillanceButton({ target }: { target: RadarTarget }) {
  const { instanceConfig } = useRadarContext();
  const scope = useSurveillanceScope(instanceConfig.id);
  const watching = useTrackSurveillanceStore(state => Object.values(state.entries).some(entry => entry.scope === scope && entry.target.id === target.id));
  const toggle = () => {
    try {
      const store = useTrackSurveillanceStore.getState();
      if (watching) store.release(scope, target.id);
      else store.watch(scope, target);
      toast.success(watching ? 'Track retirado de vigilancia' : 'Track bajo vigilancia. Se conservará su última posición aunque pierda señal.');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'No se pudo actualizar la vigilancia'); }
  };
  return <div className="mt-3">
    <button type="button" aria-pressed={watching} onClick={toggle} className={`flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs ${watching ? 'border-amber-400/50 bg-amber-400/10 text-amber-400' : 'border-border-200 text-text-100 hover:bg-bg-300'}`}><IconEye size={16} />{watching ? 'Retirar de vigilancia' : 'Mantener bajo vigilancia'}</button>
    {watching && <><SurveillanceStatus target={target} /><p className="mt-1 text-[10px] text-text-200">Conservado en este navegador para tu usuario hasta retirarlo. Un ID nuevo requiere revisión manual.</p></>}
  </div>;
}
