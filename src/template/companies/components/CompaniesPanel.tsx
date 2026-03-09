import { IconBuildingSkyscraper } from "@tabler/icons-react";
import { useCompaniesPanel } from "../hooks";

export default function CompaniesPanel() {
  const {
    companies,
    selectedCompany,
    companyUsers,
    loading,
    loadingUsers,
    error,
    loadCompanies,
    handleCompanyClick,
  } = useCompaniesPanel();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-100">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
          <p className="mt-2 text-sm text-text-200">Cargando compañías...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-red-800">
        <h3 className="font-semibold">Error</h3>
        <p className="text-sm">{error}</p>
        <button
          onClick={loadCompanies}
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
        <h2 className="text-2xl font-bold text-text-100">Compañías</h2>
        <p className="mt-1 text-sm text-text-200">
          Gestión y visualización de todas las compañías
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className=" p-6 ">
          <h3 className="mb-4 text-lg font-semibold text-text-100">
            Lista de Compañías ({companies.length})
          </h3>
          <div className="space-y-3 max-h-150 overflow-y-auto">
            {companies.map((company) => {
              return (
                <div
                  key={company.id}
                  onClick={() => handleCompanyClick(company)}
                  className={`cursor-pointer  rounded-lg border p-4 transition-colors ${
                    selectedCompany?.id === company.id
                      ? `border-bg-400/15 bg-bg-300`
                      : "border-border hover:bg-bg-100"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 flex flex-col">
                      <h3 className="font-semibold text-text-100">
                        {company.name}
                      </h3>
                      <p className="text-sm text-text-200">
                        RUT: {company.rut}
                      </p>
                      {company.email && (
                        <p className="text-sm text-text-200">{company.email}</p>
                      )}
                    </div>
                    <div className=" flex  items-center space-x-2">
                      <span className="rounded-full border border-border px-2 py-1 text-xs font-semibold text-text-200">
                        {company.total_users || 0} usuarios
                      </span>
                      <span className="rounded-full border border-border px-2 py-1 text-xs font-semibold text-text-200">
                        {company.total_services || 0} servicios
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-bg-300  p-6 ">
          {selectedCompany ? (
            <>
              <h3 className="mb-4 text-lg font-semibold text-text-100">
                Detalles de {selectedCompany.name}
              </h3>

              <div className="space-y-4">
                {/* Información básica */}
                <div className=" ">
                  <h4 className="font-semibold text-text-100 mb-2">
                    Información
                  </h4>
                  <div className="space-y-2 text-sm text-text-100">
                    <p>
                      <span className="font-medium">RUT:</span>{" "}
                      {selectedCompany.rut}
                    </p>
                    {selectedCompany.address && (
                      <p>
                        <span className="font-medium">Dirección:</span>{" "}
                        {selectedCompany.address}
                      </p>
                    )}
                    {selectedCompany.phone && (
                      <p>
                        <span className="font-medium">Teléfono:</span>{" "}
                        {selectedCompany.phone}
                      </p>
                    )}
                    {selectedCompany.email && (
                      <p>
                        <span className="font-medium">Email:</span>{" "}
                        {selectedCompany.email}
                      </p>
                    )}
                  </div>
                </div>

                {/* Usuarios */}
                <div>
                  <h4 className="font-semibold text-text-100 mb-2">
                    Usuarios ({companyUsers.length})
                  </h4>
                  {loadingUsers ? (
                    <p className="text-sm text-text-200">
                      Cargando usuarios...
                    </p>
                  ) : companyUsers.length > 0 ? (
                    <div className="space-y-2 max-h-75 overflow-y-auto">
                      {companyUsers.map((user) => (
                        <div
                          key={user.id}
                          className=" bg-bg-200 border border-border p-3"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-text-100">
                                {user.name}
                              </p>
                              <p className="text-sm text-text-200">
                                {user.email}
                              </p>
                            </div>
                            <div className="text-right">
                              <span
                                className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                                  user.is_active
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {user.is_active ? "Activo" : "Inactivo"}
                              </span>
                              {user.total_services && (
                                <p className="mt-1 text-xs text-text-200">
                                  {user.total_services} servicio
                                  {user.total_services !== 1 ? "s" : ""}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-text-200">
                      No hay usuarios asignados
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-2 h-full items-center justify-center text-text-200">
              <IconBuildingSkyscraper size={25} />
              <p>Selecciona una compañía para ver detalles</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
