export function AnalysisLoadingOverlay() {
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm">
      <div role="status" aria-live="polite" aria-atomic="true" className="w-full max-w-md rounded-2xl border border-border bg-bg-100 p-8 text-center text-text-100 shadow-2xl">
        <p className="text-lg font-semibold">Generando reporte</p>
        <p className="mt-2 text-sm text-text-200">Espere porfavor.</p>
        <p className="mt-2 text-sm text-text-200">Esto puede tardar unos minutos.</p>
      </div>
    </div>
  );
}
