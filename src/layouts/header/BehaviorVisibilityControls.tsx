import { useQuery } from '@tanstack/react-query';
import { IconFilter } from '@tabler/icons-react';
import { fetchBehaviorCategories } from '@/features/devices/services';
import { BEHAVIOR_ORDER, behaviorCriticality, behaviorLabel, isBehaviorVisible, orderedBehaviorKeys } from '@/features/devices/config/behaviorCategories';
import { useBehaviorVisibilityStore } from '@/features/devices/stores/behaviorVisibilityStore';

export function BehaviorVisibilityControls() {
  const { visibility, setVisible } = useBehaviorVisibilityStore();
  const categories = useQuery({ queryKey: ['report-behavior-categories'], queryFn: fetchBehaviorCategories, staleTime: 300000, retry: false, refetchOnWindowFocus: false });
  const keys = orderedBehaviorKeys([...BEHAVIOR_ORDER, ...(categories.data ?? [])]);
  return <details className="relative">
    <summary className="flex cursor-pointer list-none items-center gap-1 rounded px-1 py-1 text-xs text-text-100" title="Visibilidad de categorías"><IconFilter size={16} /><span className="hidden sm:inline">Categorías</span><span className="sr-only sm:hidden">Categorías</span></summary>
    <div className="absolute right-0 top-full z-100 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-bg-100 p-3 text-text-100 shadow-xl">
      <p className="mb-2 text-sm font-semibold">Mostrar categorías</p>
      <div className="max-h-[60vh] overflow-y-auto">{keys.map(key => {
        const enabled = isBehaviorVisible(key, visibility);
        const criticality = behaviorCriticality(key);
        return <label key={key} className="flex cursor-pointer items-center justify-between gap-2 py-1.5 text-xs">
          <span>{behaviorLabel(key)}{criticality && <span className={`ml-2 text-[10px] ${criticality === 'Alta' ? 'text-rose-400' : 'text-text-300'}`}>{criticality === 'Alta' ? 'Alta criticidad' : 'Menor criticidad'}</span>}</span>
          <span className="flex items-center gap-1"><span aria-hidden="true">{enabled ? 'On' : 'Off'}</span><input type="checkbox" role="switch" aria-label={`Mostrar ${behaviorLabel(key)}`} checked={enabled} onChange={e => setVisible(key, e.target.checked)} className="h-4 w-4 accent-emerald-500" /></span>
        </label>;
      })}</div>
      <p className="mt-2 border-t border-border pt-2 text-[10px] text-text-300">Se guarda en este navegador. Oculta tracks en mapa, historial, análisis e informes; conserva registros, aprendizaje y alertas.</p>
    </div>
  </details>;
}
