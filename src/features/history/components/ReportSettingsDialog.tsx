import type { AnalysisZone } from "../analysis";
import type { ReportSettings } from "../reportAnalytics";

interface Props {
  settings: ReportSettings;
  zones: AnalysisZone[];
  onChange: (settings: ReportSettings) => void;
  onClose: () => void;
  onGenerate: () => void;
}
export function ReportSettingsDialog({ settings, zones, onChange, onClose, onGenerate }: Props) {
  const valid = settings.nightStart !== settings.nightEnd && Number.isFinite(settings.proximityM) && settings.proximityM >= 1 && settings.proximityM <= 5000 && settings.maxGapSeconds >= 1 && settings.maxGapSeconds <= 3600;
  return <div className="fixed inset-0 z-99999 flex items-center justify-center bg-black/70 p-4">
    <section role="dialog" aria-modal="true" aria-labelledby="report-settings-title" className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl border border-border bg-bg-100 p-6 text-text-100 shadow-xl">
      <h2 id="report-settings-title" className="text-lg font-semibold">Informe operativo detallado</h2>
      <p className="mt-2 text-sm text-text-200">Analiza todo el período filtrado, la actividad nocturna y las aproximaciones a los polígonos seleccionados. Horario de Chile (America/Santiago).</p>
      <fieldset className="mt-5 space-y-2"><legend className="mb-2 font-medium">Zonas críticas para analizar acercamientos</legend>
        {zones.length ? zones.map(z => <label key={z.nombre} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={settings.criticalZones.includes(z.nombre)} onChange={e => onChange({ ...settings, criticalZones: e.target.checked ? [...settings.criticalZones, z.nombre] : settings.criticalZones.filter(name => name !== z.nombre) })} />{z.nombre}</label>) : <p className="text-sm text-amber-500">No hay polígonos válidos disponibles. El informe indicará que no se pueden calcular acercamientos.</p>}
      </fieldset>
      <div className="mt-5 grid grid-cols-2 gap-4">
        <label className="space-y-1 text-sm">Inicio de noche<select className="block w-full rounded border border-border bg-bg-200 p-2" value={settings.nightStart} onChange={e => onChange({ ...settings, nightStart: Number(e.target.value) })}>{Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}</select></label>
        <label className="space-y-1 text-sm">Fin de noche<select className="block w-full rounded border border-border bg-bg-200 p-2" value={settings.nightEnd} onChange={e => onChange({ ...settings, nightEnd: Number(e.target.value) })}>{Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}</select></label>
        <label className="space-y-1 text-sm">Proximidad al perímetro (m)<input className="block w-full rounded border border-border bg-bg-200 p-2" type="number" min={1} max={5000} value={Number.isFinite(settings.proximityM) ? settings.proximityM : ''} onChange={e => onChange({ ...settings, proximityM: e.target.value === '' ? NaN : Number(e.target.value) })} /></label>
        <label className="space-y-1 text-sm">Hueco máximo para sumar tiempo (s)<input className="block w-full rounded border border-border bg-bg-200 p-2" type="number" min={1} max={3600} value={settings.maxGapSeconds} onChange={e => onChange({ ...settings, maxGapSeconds: Number(e.target.value) })} /></label>
      </div>
      <p className="mt-4 text-xs text-text-200">Las distancias y los tiempos se calculan sobre posiciones analizadas. El informe muestra su cobertura y muestreo; no identifica matrículas ni concluye que una actividad sea un robo.</p>
      {!settings.criticalZones.length && <p className="mt-3 text-sm text-amber-500">Sin zona crítica seleccionada: no se generará un ranking de acercamientos a módulos.</p>}
      {!valid && <p role="alert" className="mt-3 text-sm text-red-400">Revisa los umbrales y selecciona horas distintas para inicio y fin.</p>}
      <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onClose} className="rounded border border-border px-4 py-2 text-sm">Cancelar</button><button type="button" disabled={!valid} onClick={onGenerate} className="rounded bg-brand-100 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">Generar PDF detallado</button></div>
    </section>
  </div>;
}
