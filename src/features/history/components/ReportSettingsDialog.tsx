import { orderedBehaviorKeys } from "@/features/devices/config/behaviorCategories";
import { buildReportFilters, type ReportPeriod } from "../filters";
import type { AnalysisZone } from "../analysis";
import { reportCategoryLabel, type ReportSettings } from "../reportAnalytics";
import { useQuery } from '@tanstack/react-query';
import { fetchBehaviorCategories } from '@/features/devices/services/behaviorService';
import { BEHAVIOR_CATEGORIES } from '@/features/devices/config';

interface Props {
  period: ReportPeriod;
  onPeriodChange: (period: ReportPeriod) => void;
  settings: ReportSettings;
  zones: AnalysisZone[];
  categories?: string[];
  onChange: (settings: ReportSettings) => void;
  onClose: () => void;
  onGenerate: () => void;
}
export function ReportSettingsDialog({ period, onPeriodChange, settings, zones, categories = [], onChange, onClose, onGenerate }: Props) {
  const categoryQuery = useQuery({ queryKey: ['report-behavior-categories'], queryFn: fetchBehaviorCategories, staleTime: 300000, gcTime: 60000, retry: false, refetchOnWindowFocus: false });
  const categoryOptions = orderedBehaviorKeys([...Object.keys(BEHAVIOR_CATEGORIES), ...(categoryQuery.data ?? []), ...categories, 'sin_clasificar', ...(settings.category ? [settings.category] : [])]);
  let periodError = '';
  try { buildReportFilters(period, settings.minTrackedMinutes, settings.category); }
  catch (error) { periodError = error instanceof Error ? error.message : 'Revisa las fechas del informe'; }
  const valid = !periodError && Number.isFinite(settings.minTrackedMinutes) && settings.minTrackedMinutes >= 0 && settings.minTrackedMinutes <= 525600 && settings.nightStart !== settings.nightEnd && Number.isFinite(settings.proximityM) && settings.proximityM >= 1 && settings.proximityM <= 5000 && Number.isInteger(settings.maxGapSeconds) && settings.maxGapSeconds >= 1 && settings.maxGapSeconds <= 3600 && Number.isSafeInteger(settings.minApproachPoints) && settings.minApproachPoints >= 1;
  return <div className="fixed inset-0 z-99999 flex items-center mx-auto justify-center bg-black/70 p-4">
    <div role="dialog" aria-modal="true" aria-labelledby="report-settings-title" className="relative w-full max-w-7xl max-h-[90vh] overflow-y-auto mx-auto rounded-xl border border-border bg-bg-100 p-6 text-text-100 shadow-xl">
      <h2 id="report-settings-title" className="text-lg font-semibold">Generar informe operativo</h2>
      <p className="mt-2 text-sm text-text-200">El informe usa sus propias fechas y categoría. Los filtros, favoritos y categorías ocultas del historial no afectan al PDF. Horario de Chile (America/Santiago).</p>
      <fieldset className="mt-5 rounded-lg border border-border p-4">
        <legend className="px-1 font-medium">Período del informe PDF</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm">Desde el día<input type="date" required className="block w-full rounded border border-border bg-bg-200 p-2" value={period.fromDate} max={period.toDate || undefined} onChange={e => onPeriodChange({ ...period, fromDate: e.target.value })} /></label>
          <label className="space-y-1 text-sm">Hasta el día (incluido)<input type="date" required className="block w-full rounded border border-border bg-bg-200 p-2" value={period.toDate} min={period.fromDate || undefined} onChange={e => onPeriodChange({ ...period, toDate: e.target.value })} /></label>
        </div>
        <p className="mt-3 text-xs text-text-200">Incluye los días completos. La actividad nocturna se calcula en la franja indicada abajo, incluso cuando cruza medianoche. Para analizar una noche completa, incluye también el día en que termina.</p>
        {periodError && <p role="alert" className="mt-2 text-sm text-red-400">{periodError}</p>}
      </fieldset>
      <fieldset className="mt-5 space-y-2"><legend className="mb-2 font-medium">Zonas críticas para analizar acercamientos</legend>
        {zones.length ? zones.map(z => <label key={z.nombre} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={settings.criticalZones.includes(z.nombre)} onChange={e => onChange({ ...settings, criticalZones: e.target.checked ? [...settings.criticalZones, z.nombre] : settings.criticalZones.filter(name => name !== z.nombre) })} />{z.nombre}</label>) : <p className="text-sm text-amber-500">No hay polígonos válidos disponibles. El informe indicará que no se pueden calcular acercamientos.</p>}
      </fieldset>
      <div className="mt-5 grid grid-cols-2 gap-4">
        <label className="space-y-1 text-sm">Orden del ranking de recorrido<select className="block w-full rounded border border-border bg-bg-200 p-2" value={settings.movementSort} onChange={e => onChange({ ...settings, movementSort: e.target.value as ReportSettings['movementSort'] })}><option value="distance">Mayor distancia recorrida</option><option value="duration">Mayor tiempo de seguimiento</option><option value="points">Más puntos registrados</option></select></label>
        <label className="col-span-2 space-y-1 text-sm">Detecciones de embarcaciones<select className="block w-full rounded border border-border bg-bg-200 p-2" value={settings.category} aria-describedby="report-category-help" onChange={e => onChange({ ...settings, category: e.target.value })}><option value="">Todas las categorías</option>{categoryOptions.map(category => <option key={category} value={category}>{BEHAVIOR_CATEGORIES[category]?.label ?? reportCategoryLabel(category)}</option>)}</select><span id="report-category-help" className="block text-xs text-text-200">Filtra todo el informe: indicadores, gráficos, mapas de calor y acercamientos. La categoría corresponde a la clasificación del track en el período.</span></label>
        <label className="space-y-1 text-sm">Inicio de noche<select className="block w-full rounded border border-border bg-bg-200 p-2" value={settings.nightStart} onChange={e => onChange({ ...settings, nightStart: Number(e.target.value) })}>{Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}</select></label>
        <label className="space-y-1 text-sm">Fin de noche<select className="block w-full rounded border border-border bg-bg-200 p-2" value={settings.nightEnd} onChange={e => onChange({ ...settings, nightEnd: Number(e.target.value) })}>{Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}</select></label>
        <label className="col-span-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={settings.showHeatmap} onChange={e => onChange({ ...settings, showHeatmap: e.target.checked })} />Incluir mapa de calor (distribución geográfica)</label>
      </div>
      <details className="mt-5"><summary className="cursor-pointer font-medium">Opciones avanzadas</summary>
      <div className="mt-3 grid grid-cols-2 gap-4">
        <label className="col-span-2 space-y-1 text-sm">Más de (minutos trackeados)<input className="block w-full rounded border border-border bg-bg-200 p-2" type="number" min={0} max={525600} step="0.1" value={Number.isFinite(settings.minTrackedMinutes) ? settings.minTrackedMinutes : ''} onChange={e => onChange({ ...settings, minTrackedMinutes: e.target.value === '' ? 0 : Number(e.target.value) })} /><span className="block text-xs text-text-200">0: sin mínimo. Por ejemplo, 4 incluye solo tracks con más de 4 minutos de seguimiento observado, sin sumar cortes de más de 120 s. Se aplica a todo el informe, independientemente del mínimo del historial.</span></label>
        <label className="space-y-1 text-sm">Proximidad al perímetro (m)<input className="block w-full rounded border border-border bg-bg-200 p-2" type="number" min={1} max={5000} value={Number.isFinite(settings.proximityM) ? settings.proximityM : ''} onChange={e => onChange({ ...settings, proximityM: e.target.value === '' ? NaN : Number(e.target.value) })} /></label>
        <label className="space-y-1 text-sm">Hueco máximo para sumar tiempo (s)<input className="block w-full rounded border border-border bg-bg-200 p-2" type="number" min={1} max={3600} value={settings.maxGapSeconds} onChange={e => onChange({ ...settings, maxGapSeconds: Number(e.target.value) })} /></label>
        <label className="col-span-2 space-y-1 text-sm">Mínimo de puntos por track para rankings<input className="block w-full rounded border border-border bg-bg-200 p-2" type="number" min={1} step={1} value={Number.isFinite(settings.minApproachPoints) ? settings.minApproachPoints : ''} aria-describedby="report-min-approach-points-help" onChange={e => onChange({ ...settings, minApproachPoints: e.target.value === '' ? NaN : Number(e.target.value) })} /><span id="report-min-approach-points-help" className="block text-xs text-text-200">Predeterminado: 100 puntos registrados dentro del período. Se aplica al listado de recorrido. Dentro de cada hora se ordena por el criterio seleccionado; los datos no disponibles se muestran como N/D.</span></label>
      </div>
      </details>
      <p className="mt-4 text-xs text-text-200">Las distancias y los tiempos se calculan sobre posiciones analizadas. El informe muestra su cobertura y muestreo; no identifica matrículas ni concluye que una actividad sea un robo.</p>
      {!settings.criticalZones.length && <p className="mt-3 text-sm text-amber-500">Sin zona crítica seleccionada: no se calculará proximidad nocturna a módulos.</p>}
      {!valid && <p role="alert" className="mt-3 text-sm text-red-400">Revisa los umbrales y selecciona horas distintas para inicio y fin.</p>}
      <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onClose} className="rounded border border-border px-4 py-2 text-sm">Cancelar</button><button type="button" disabled={!valid} onClick={onGenerate} className="rounded bg-brand-100 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">Generar PDF</button></div>
    </div>
  </div>
}
