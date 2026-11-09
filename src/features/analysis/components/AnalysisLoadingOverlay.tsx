export function AnalysisLoadingOverlay({ stage = 'summary' }: { stage?: 'summary' | 'spatial' }) {
  return (
    <div className="flex min-h-28 items-center justify-center rounded-xl border border-border bg-bg-100 p-5">
      <div role="status" aria-live="polite" aria-atomic="true" className="w-full text-center text-text-100">
        <p className="text-lg font-semibold">{stage === 'summary' ? 'Cargando resúmenes del análisis' : 'Cargando trayectorias del análisis'}</p>
        <p className="mt-2 text-sm text-text-200">Puedes cambiar el período o continuar usando los controles.</p>
      </div>
    </div>
  );
}
