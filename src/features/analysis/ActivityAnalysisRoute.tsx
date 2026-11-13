import { Component, lazy, Suspense, type ReactNode } from 'react';
import { Link, Navigate } from 'react-router';
import { useRole } from '@/context/role';
import { AnalysisLoadingOverlay } from './components/AnalysisLoadingOverlay';

const ActivityAnalysisPage = lazy(() => import('./ActivityAnalysisPage'));

class AnalysisErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <div role="alert" className="m-6 rounded-xl border border-border bg-bg-100 p-8 text-text-100"><h1 className="text-xl font-semibold">No se pudo abrir el análisis</h1><p className="mt-3 text-sm text-text-200">Recarga la página para intentar nuevamente o vuelve al historial.</p><div className="mt-5 flex gap-3"><button type="button" onClick={() => window.location.reload()} className="rounded-lg border border-border px-4 py-2 text-sm">Recargar página</button><Link to="/historial" className="rounded-lg border border-border px-4 py-2 text-sm">Ir al historial</Link></div></div>;
    return this.props.children;
  }
}
export default function ActivityAnalysisRoute() {
  const { isAdmin, isSuperAdmin } = useRole();
  if (!isAdmin && !isSuperAdmin) return <Navigate to="/" replace />;
  return <AnalysisErrorBoundary><Suspense fallback={<AnalysisLoadingOverlay />}><ActivityAnalysisPage /></Suspense></AnalysisErrorBoundary>;
}
