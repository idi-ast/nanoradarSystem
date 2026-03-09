import { useAdminDashboard } from "./useAdminDashboard";
import {
  IconUsers,
  IconBuilding,
  IconSettings,
  IconLink,
} from "@tabler/icons-react";

export default function AdminDashboard() {
  const { stats, loading, error, loadStats } = useAdminDashboard();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-100">
        <div className="text-center">
          <div className="inline-block h-8 w-8 rounded-full border-4 border-solid border-current border-r-transparent animate-spin"></div>
          <p className="mt-2 text-sm text-text-200">Cargando estadísticas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-500 p-4 text-text-100">
        <h3 className="font-semibold">Error</h3>
        <p className="text-sm">{error}</p>
        <button
          onClick={loadStats}
          className="mt-2 text-sm underline hover:no-underline"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text-100">
          Panel Administrativo
        </h2>
        <p className="mt-1 text-sm text-text-200">
          Estadísticas generales del sistema
        </p>
      </div>

      {/* Estadísticas principales */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Usuarios"
          value={stats.total_users}
          icon={<IconUsers size={28} />}
          color="bg-blue-500"
        />
        <StatCard
          title="Total Compañías"
          value={stats.total_companies}
          icon={<IconBuilding size={28} />}
          color="bg-green-500"
        />
        <StatCard
          title="Total Servicios"
          value={stats.total_services}
          icon={<IconSettings size={28} />}
          color="bg-purple-500"
        />
        <StatCard
          title="Asignaciones Activas"
          value={stats.total_assignments}
          icon={<IconLink size={28} />}
          color="bg-orange-500"
        />
      </div>

      <div className="rounded-lg bg-bg-100 p-6 shadow">
        <h3 className="text-lg font-semibold text-text-100">
          Usuarios Recientes (últimos 7 días)
        </h3>
        <p className="mt-2 text-3xl font-bold text-blue-600">
          {stats.recent_users}
        </p>
      </div>

      <div className="rounded-lg bg-bg-100 p-6 shadow">
        <h3 className="mb-4 text-lg font-semibold text-text-100">
          Usuarios por Compañía (Top 10)
        </h3>
        <div className="space-y-3">
          {stats.users_by_company.map((item, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-bg-400 text-sm font-semibold text-text-400">
                  {index + 1}
                </span>
                <span className="font-medium text-text-100">
                  {item.company_name}
                </span>
              </div>
              <span className="rounded-full bg-bg-300 px-3 py-1 text-sm font-semibold text-text-100">
                {item.user_count} usuario{item.user_count !== 1 ? "s" : ""}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  return (
    <div className="overflow-hidden rounded-lg bg-bg-100 shadow text-text-100">
      <div className="p-5">
        <div className="flex items-center">
          <div className={`shrink-0 rounded-full ${color} p-3`}>{icon}</div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="truncate text-sm font-medium text-text-200">
                {title}
              </dt>
              <dd className="text-3xl font-semibold text-text-100">{value}</dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
