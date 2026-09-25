import { useState } from "react";
import {
  IconBuildingSkyscraper,
  IconPlus,
  IconPencil,
  IconTrash,
  IconUser,
  IconDeviceDesktop,
  IconX,
} from "@tabler/icons-react";
import { useRole } from "@/context/role";
import { useCompaniesPanel, type CreateUserForEmpresaDto } from "../hooks";
import type { Empresa, UsuarioEmpresa, DispositivoEmpresa } from "../types";

const ROLE_LABELS: Record<number, string> = {
  1: "Super Admin",
  2: "Admin",
  3: "Cliente",
};

const ROLE_COLORS: Record<number, string> = {
  1: "bg-violet-500/20 text-violet-300 border border-violet-500/30",
  2: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
  3: "bg-green-500/20 text-green-300 border border-green-500/30",
};

export default function CompaniesPanel() {
  const { isSuperAdmin, idEmpresa, empresaEsPrincipal } = useRole();

  /** Solo el superadmin de la empresa principal puede marcar empresas como principal. */
  const puedeMarcarPrincipal = isSuperAdmin && empresaEsPrincipal;
  const {
    companies,
    selectedCompany,
    companyUsers,
    companyDevices,
    loading,
    loadingUsers,
    loadingDevices,
    error,
    loadCompanies,
    handleCompanyClick,
    handleCreateCompany,
    handleCreateUser,
    createCompanyMut,
    createUserMut,
    setSelectedCompanyId,
  } = useCompaniesPanel();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newCompany, setNewCompany] = useState({ nombre: "", rut: "", direccion: "", telefono: "", email: "", principal: false });
  const [newUser, setNewUser] = useState({ nombre: "", apellido: "", email: "", password: "", role_id: 3 as number });

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
        <p className="text-sm">{error.message}</p>
        <button onClick={loadCompanies} className="mt-2 text-sm underline hover:no-underline">
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text-100">Compañías</h2>
          <p className="mt-1 text-sm text-text-200">
            Gestión de empresas y dispositivos asociados
          </p>
        </div>
        {isSuperAdmin && (
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-4 py-2 bg-brand-100 text-text-100 rounded hover:bg-bg-300 transition-colors flex items-center gap-2"
          >
            <IconPlus size={16} stroke={1.5} />
            Crear Empresa
          </button>
        )}
      </div>

      {/* Formulario crear empresa */}
      {showCreateForm && isSuperAdmin && (
        <div className="bg-bg-100 border border-border rounded-xl p-6">
          <h3 className="text-lg font-semibold text-text-100 mb-4">Nueva Empresa</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-text-200 uppercase tracking-widest">Nombre</label>
              <input
                type="text"
                value={newCompany.nombre}
                onChange={(e) => setNewCompany({ ...newCompany, nombre: e.target.value })}
                placeholder="Ej: Mi Empresa S.A."
                className="h-8 px-3 border border-border bg-bg-200 text-text-100 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-text-200 uppercase tracking-widest">RUT</label>
              <input
                type="text"
                value={newCompany.rut}
                onChange={(e) => setNewCompany({ ...newCompany, rut: e.target.value })}
                placeholder="Ej: 12.345.678-9"
                className="h-8 px-3 border border-border bg-bg-200 text-text-100 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col gap-1 col-span-2">
              <label className="text-xs text-text-200 uppercase tracking-widest">Dirección</label>
              <input
                type="text"
                value={newCompany.direccion}
                onChange={(e) => setNewCompany({ ...newCompany, direccion: e.target.value })}
                placeholder="Dirección de la empresa"
                className="h-8 px-3 border border-border bg-bg-200 text-text-100 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-text-200 uppercase tracking-widest">Teléfono</label>
              <input
                type="text"
                value={newCompany.telefono}
                onChange={(e) => setNewCompany({ ...newCompany, telefono: e.target.value })}
                placeholder="+56 9 1234 5678"
                className="h-8 px-3 border border-border bg-bg-200 text-text-100 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-text-200 uppercase tracking-widest">Email</label>
              <input
                type="email"
                value={newCompany.email}
                onChange={(e) => setNewCompany({ ...newCompany, email: e.target.value })}
                placeholder="contacto@empresa.cl"
                className="h-8 px-3 border border-border bg-bg-200 text-text-100 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2 col-span-2 mt-1">
              <input
                id="empresa-principal"
                type="checkbox"
                checked={newCompany.principal}
                disabled={!puedeMarcarPrincipal}
                onChange={(e) => setNewCompany({ ...newCompany, principal: e.target.checked })}
                className="h-4 w-4 rounded border-border bg-bg-200 accent-amber-500 disabled:opacity-40"
              />
              <label
                htmlFor="empresa-principal"
                className={`text-sm text-text-100 ${!puedeMarcarPrincipal ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
              >
                Empresa principal (puede ver todos los dispositivos)
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => setShowCreateForm(false)}
              className="px-3 py-1.5 text-sm text-text-200 hover:text-text-100 transition"
            >
              Cancelar
            </button>
            <button
              onClick={async () => {
                await handleCreateCompany(newCompany);
                setNewCompany({ nombre: "", rut: "", direccion: "", telefono: "", email: "", principal: false });
                setShowCreateForm(false);
              }}
              disabled={createCompanyMut.isPending}
              className="px-4 py-1.5 text-sm bg-brand-100 text-text-100 rounded hover:bg-bg-300 transition disabled:opacity-50"
            >
              {createCompanyMut.isPending ? "Creando..." : "Crear Empresa"}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de empresas */}
        <div className="lg:col-span-1">
          <h3 className="mb-4 text-lg font-semibold text-text-100">
            Empresas ({companies.length})
          </h3>
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {companies.map((company) => (
              <div
                key={company.id}
                onClick={() => handleCompanyClick(company)}
                className={`cursor-pointer rounded-lg border p-4 transition-colors ${
                  selectedCompany?.id === company.id
                    ? "border-bg-400/15 bg-bg-300"
                    : "border-border hover:bg-bg-100"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-brand-200/20 flex items-center justify-center text-brand-200">
                    <IconBuildingSkyscraper size={20} stroke={1.5} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-text-100 text-sm flex items-center gap-2">
                      {company.nombre}
                      {company.principal && (
                        <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold border border-amber-500/40 bg-amber-500/20 text-amber-300">
                          PRINCIPAL
                        </span>
                      )}
                    </h4>
                    <p className="text-xs text-text-200">RUT: {company.rut}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detalle de empresa seleccionada */}
        <div className="lg:col-span-2 bg-bg-300 p-6 rounded-xl">
          {selectedCompany ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-text-100">
                  {selectedCompany.nombre}
                </h3>
                {isSuperAdmin && (
                  <button
                    onClick={() => setSelectedCompanyId(undefined as unknown as number)}
                    className="text-xs text-text-200 hover:text-text-100 transition"
                  >
                    ✕ Cerrar
                  </button>
                )}
              </div>

              {/* Info de empresa */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-text-200">RUT:</span>{" "}
                  <span className="text-text-100">{selectedCompany.rut}</span>
                </div>
                <div>
                  <span className="text-text-200">Email:</span>{" "}
                  <span className="text-text-100">{selectedCompany.email || "—"}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-text-200">Dirección:</span>{" "}
                  <span className="text-text-100">{selectedCompany.direccion || "—"}</span>
                </div>
                <div>
                  <span className="text-text-200">Teléfono:</span>{" "}
                  <span className="text-text-100">{selectedCompany.telefono || "—"}</span>
                </div>
              </div>

              {/* Usuarios de la empresa */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-text-100 flex items-center gap-2">
                    <IconUser size={16} stroke={1.5} />
                    Usuarios ({companyUsers.length})
                  </h4>
                  {isSuperAdmin && (
                    <button
                      onClick={() => setShowCreateUser(!showCreateUser)}
                      className="px-3 py-1 text-xs bg-blue-500/20 text-blue-300 rounded hover:bg-blue-500/30 transition flex items-center gap-1"
                    >
                      <IconPlus size={12} stroke={1.5} />
                      Agregar Usuario
                    </button>
                  )}
                </div>

                {showCreateUser && isSuperAdmin && (
                  <div className="bg-bg-200 border border-border rounded-lg p-4 mb-3 space-y-3">
                    <h5 className="text-sm font-medium text-text-100">Crear Usuario para {selectedCompany.nombre}</h5>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Nombre"
                        value={newUser.nombre}
                        onChange={(e) => setNewUser({ ...newUser, nombre: e.target.value })}
                        className="h-7 px-2 border border-border bg-bg-100 text-text-100 text-sm rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        placeholder="Apellido"
                        value={newUser.apellido}
                        onChange={(e) => setNewUser({ ...newUser, apellido: e.target.value })}
                        className="h-7 px-2 border border-border bg-bg-100 text-text-100 text-sm rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <input
                        type="email"
                        placeholder="Email"
                        value={newUser.email}
                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                        className="h-7 px-2 border border-border bg-bg-100 text-text-100 text-sm rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <input
                        type="password"
                        placeholder="Contraseña"
                        value={newUser.password}
                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                        className="h-7 px-2 border border-border bg-bg-100 text-text-100 text-sm rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <select
                        value={newUser.role_id}
                        onChange={(e) => setNewUser({ ...newUser, role_id: Number(e.target.value) })}
                        className="h-7 px-2 border border-border bg-bg-100 text-text-100 text-sm rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value={2}>Admin</option>
                        <option value={3}>Cliente</option>
                      </select>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setShowCreateUser(false);
                          setNewUser({ nombre: "", apellido: "", email: "", password: "", role_id: 3 });
                        }}
                        className="px-3 py-1 text-xs text-text-200 hover:text-text-100 transition"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={async () => {
                          const payload: CreateUserForEmpresaDto = {
                            ...newUser,
                            idEmpresa: selectedCompany!.id,
                          };
                          await handleCreateUser(payload);
                          setShowCreateUser(false);
                          setNewUser({ nombre: "", apellido: "", email: "", password: "", role_id: 3 });
                        }}
                        disabled={createUserMut.isPending}
                        className="px-3 py-1 text-xs bg-blue-500/20 text-blue-300 rounded hover:bg-blue-500/30 disabled:opacity-50 transition"
                      >
                        {createUserMut.isPending ? "Creando..." : "Crear Usuario"}
                      </button>
                    </div>
                  </div>
                )}

                {loadingUsers ? (
                  <p className="text-sm text-text-200">Cargando usuarios...</p>
                ) : companyUsers.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {companyUsers.map((user) => (
                      <div key={user.id} className="bg-bg-200 border border-border p-3 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-text-100 text-sm">
                            {user.nombre} {user.apellido}
                          </p>
                          <p className="text-xs text-text-200">{user.email}</p>
                        </div>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold border ${ROLE_COLORS[user.role_id]}`}>
                          {ROLE_LABELS[user.role_id]}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-text-200">No hay usuarios asignados</p>
                )}
              </div>

              {/* Dispositivos de la empresa */}
              <div>
                <h4 className="font-semibold text-text-100 flex items-center gap-2 mb-3">
                  <IconDeviceDesktop size={16} stroke={1.5} />
                  Dispositivos ({companyDevices.length})
                </h4>
                {loadingDevices ? (
                  <p className="text-sm text-text-200">Cargando dispositivos...</p>
                ) : companyDevices.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {companyDevices.map((device) => (
                      <div key={device.id} className="bg-bg-200 border border-border p-3 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-text-100 text-sm">{device.modelo}</p>
                          <p className="text-xs text-text-200">
                            {device.tipo_radar} {device.serial ? `· ${device.serial}` : ""} · {device.categoria ?? ""}
                          </p>
                        </div>
                        <span className={`inline-flex w-2 h-2 rounded-full ${device.status ? "bg-emerald-400" : "bg-text-200"}`} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-text-200">No hay dispositivos asignados</p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2 h-full items-center justify-center text-text-200 py-20">
              <IconBuildingSkyscraper size={40} stroke={1.5} />
              <p className="mt-2">Selecciona una compañía para ver detalles</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
