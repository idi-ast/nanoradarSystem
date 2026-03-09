import { IconSettings } from "@tabler/icons-react";
import { useServicesPanel } from "../hooks";
import ServiceLogs from "./ServiceLogs";

export default function ServicesPanel() {
  const { services, servicesByCompany, loading, error, loadServices } =
    useServicesPanel();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-100">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
          <p className="mt-2 text-sm text-text-200">Cargando servicios...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 text-red-800 dark:text-red-400">
        <h3 className="font-semibold">Error</h3>
        <p className="text-sm">{error}</p>
        <button
          onClick={loadServices}
          className="mt-2 text-sm underline hover:no-underline"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Mis Servicios</h2>
        <p className="mt-1 text-sm text-text-200">
          Servicios a los que tienes acceso ({services.length})
        </p>
      </div>

      {services.length === 0 ? (
        <div className="rounded-lg bg-bg-200 p-8 text-center flex justify-center items-center flex-col ">
          <p className="text-4xl mb-4">
            <IconSettings size={25} />
          </p>
          <p className="text-text-200">No tienes servicios asignados</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(servicesByCompany).map(
            ([companyName, companyServices]) => (
              <div
                key={companyName}
                className="rounded-lg bg-bg-100 border border-border p-6"
              >
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{companyName}</h3>
                  <span className="rounded-full bg-200/10 text-200 px-3 py-1 text-sm font-semibold">
                    {companyServices.length} servicio
                    {companyServices.length !== 1 ? "s" : ""}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {companyServices.map((service) => (
                    <div
                      key={service.id}
                      className="rounded-lg border border-border p-4 hover:shadow-md transition-shadow bg-bg-200"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold">{service.name}</h4>
                          {service.code && (
                            <p className="text-xs text-text-200 mt-1">
                              {service.code}
                            </p>
                          )}
                        </div>
                        <span className="ml-2 shrink-0 rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-1 text-xs font-semibold text-green-800 dark:text-green-400">
                          Activo
                        </span>
                      </div>

                      {service.description && (
                        <p className="text-sm text-text-200 mt-2 line-clamp-2">
                          {service.description}
                        </p>
                      )}

                      <div className="mt-3 flex items-center justify-between text-xs text-text-200">
                        {service.db_name && (
                          <span className="rounded bg-bg-100 px-2 py-1">
                            DB: {service.db_name}
                          </span>
                        )}
                        {service.website && (
                          <a
                            href={service.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-200 hover:underline"
                          >
                            Web
                          </a>
                        )}
                      </div>

                      {service.assigned_at && (
                        <p className="mt-2 text-xs text-text-200">
                          Asignado:{" "}
                          {new Date(service.assigned_at).toLocaleDateString(
                            "es-ES",
                          )}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ),
          )}
        </div>
      )}

      {/* Sección de Logs */}
      <div className="mt-8">
        <ServiceLogs limit={15} />
      </div>
    </div>
  );
}
