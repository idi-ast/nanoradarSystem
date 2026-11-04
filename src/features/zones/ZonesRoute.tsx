import { Component, lazy, Suspense, type ReactNode } from 'react';
const ZonesPage = lazy(() => import('./ZonesPage'));
class ZonesBoundary extends Component<{children: ReactNode}, {failed:boolean}> {
  state = {failed:false};
  static getDerivedStateFromError() {return {failed:true};}
  render() {return this.state.failed ? <div role="alert" className="m-6 rounded-xl border border-border bg-bg-100 p-6 text-text-100"><h1 className="text-lg font-semibold">No se pudo abrir la página de zonas</h1><button type="button" onClick={() => window.location.reload()} className="mt-4 rounded-lg border border-border px-4 py-2 text-sm">Recargar página</button></div> : this.props.children;}
}
export default function ZonesRoute() {
  return <ZonesBoundary><Suspense fallback={<p role="status" className="p-6 text-sm text-text-200">Cargando zonas…</p>}><ZonesPage /></Suspense></ZonesBoundary>;
}
