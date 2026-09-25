import { useMemo } from "react";
import { IconBuilding, IconMail, IconUser, IconLock, IconId } from "@tabler/icons-react";
import { useRole } from "@/context/role";
import { useEmpresas } from "@/features/config-devices/dispositivos/hooks/useDispositivos";

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

export function Perfil() {
  const { roleId, idEmpresa, isSuperAdmin, isAdmin, isCliente } = useRole();
  const { data: empresas } = useEmpresas();

  const miEmpresa = useMemo(
    () => empresas?.find((e) => e.id === idEmpresa) ?? null,
    [empresas, idEmpresa],
  );

  const rolActual = roleId ? ROLE_LABELS[roleId] : "Sin rol";
  const rolColor = roleId ? ROLE_COLORS[roleId] : "bg-gray-500/20 text-gray-300 border border-gray-500/30";

  return (
    <div className="p-6 bg-bg-100 min-h-full">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-100">Mi Perfil</h1>
            <p className="text-sm text-text-200">Información de tu cuenta y empresa</p>
          </div>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${rolColor}`}>
            {rolActual}
          </span>
        </div>

        {/* Información del Usuario */}
        <div className="bg-bg-200 border border-border rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-text-100 flex items-center gap-2">
            <IconUser size={18} stroke={1.5} />
            Información de la Cuenta
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-text-200 uppercase tracking-widest">Nombre de usuario</label>
              <p className="font-medium text-text-100">{localStorage.getItem("auth_user") ? JSON.parse(localStorage.getItem("auth_user")!).name : "Usuario"}</p>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-text-200 uppercase tracking-widest">Email</label>
              <p className="font-medium text-text-100">{localStorage.getItem("auth_user") ? JSON.parse(localStorage.getItem("auth_user")!).email : "—"}</p>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-text-200 uppercase tracking-widest">Rol</label>
              <span className={`inline-flex px-2 py-1 rounded text-xs font-semibold border ${rolColor}`}>
                {rolActual}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-text-200 uppercase tracking-widest">ID Empresa</label>
              <p className="font-medium text-text-100">{idEmpresa ?? "—"}</p>
            </div>
          </div>
        </div>

        {/* Información de la Empresa */}
        <div className="bg-bg-200 border border-border rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-text-100 flex items-center gap-2">
            <IconBuilding size={18} stroke={1.5} />
            Mi Empresa
          </h2>
          {miEmpresa ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-text-200 uppercase tracking-widest">Nombre</label>
                <p className="font-medium text-text-100">{miEmpresa.nombre}</p>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-text-200 uppercase tracking-widest">RUT</label>
                <p className="font-medium text-text-100">{miEmpresa.rut}</p>
              </div>
              <div className="flex flex-col gap-1 sm:col-span-2">
                <label className="text-xs text-text-200 uppercase tracking-widest">Dirección</label>
                <p className="font-medium text-text-100">{miEmpresa.direccion || "—"}</p>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-text-200 uppercase tracking-widest">Teléfono</label>
                <p className="font-medium text-text-100">{miEmpresa.telefono || "—"}</p>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-text-200 uppercase tracking-widest">Email</label>
                <p className="font-medium text-text-100">{miEmpresa.email || "—"}</p>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-text-200 uppercase tracking-widest">ID Empresa</label>
                <p className="font-medium text-text-100">{miEmpresa.id}</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-text-200">
              <IconBuilding size={32} stroke={1.5} className="mx-auto mb-2 opacity-50" />
              <p>No tienes una empresa asignada</p>
              {isSuperAdmin && (
                <p className="text-xs text-brand-200 mt-1">Como Superadmin, puedes crear una desde <a href="/template/companias" className="underline hover:no-underline">Mis Compañías</a></p>
              )}
            </div>
          )}
        </div>

        {/* Permisos según rol */}
        <div className="bg-bg-200 border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-text-100 flex items-center gap-2 mb-4">
            <IconLock size={18} stroke={1.5} />
            Tus Permisos
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <PermisoCard
              titulo="Ver Dispositivos"
              descripcion="Acceso a la lista de dispositivos de tu empresa"
              habilitado={true}
              icon={<IconId size={18} stroke={1.5} />}
            />
            <PermisoCard
              titulo="Editar Dispositivos"
              descripcion={isCliente ? "Solo lectura" : "Crear, editar y eliminar dispositivos de tu empresa"}
              habilitado={!isCliente}
              icon={<IconLock size={18} stroke={1.5} />}
            />
            <PermisoCard
              titulo="Gestionar Usuarios"
              descripcion={isCliente ? "No disponible" : isSuperAdmin ? "Todas las empresas" : "Solo tu empresa"}
              habilitado={isSuperAdmin || isAdmin}
              icon={<IconUser size={18} stroke={1.5} />}
            />
            <PermisoCard
              titulo="Crear Empresas"
              descripcion="Solo Superadmin"
              habilitado={isSuperAdmin}
              icon={<IconBuilding size={18} stroke={1.5} />}
            />
            <PermisoCard
              titulo="Ver Todas Empresas"
              descripcion="Acceso global"
              habilitado={isSuperAdmin}
              icon={<IconBuilding size={18} stroke={1.5} />}
            />
            <PermisoCard
              titulo="Configurar Dispositivos"
              descripcion="Parámetros, zonas, calibración PTZ"
              habilitado={!isCliente}
              icon={<IconId size={18} stroke={1.5} />}
            />
          </div>
        </div>

        {/* Accesos rápidos */}
        {isSuperAdmin && (
          <div className="bg-brand-100 border border-brand-500/30 rounded-xl p-4">
            <h3 className="font-semibold text-brand-200 mb-2">Accesos de Superadmin</h3>
            <div className="flex flex-wrap gap-2">
              <a href="/template/companias" className="px-3 py-1.5 text-xs bg-brand-200 text-brand-100 rounded hover:bg-brand-200/80 transition">
                Gestión de Empresas
              </a>
              <a href="/template/admin" className="px-3 py-1.5 text-xs bg-brand-200 text-brand-100 rounded hover:bg-brand-200/80 transition">
                Panel Admin
              </a>
              <a href="/usuarios" className="px-3 py-1.5 text-xs bg-brand-200 text-brand-100 rounded hover:bg-brand-200/80 transition">
                Gestión de Usuarios
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PermisoCard({ titulo, descripcion, habilitado, icon }: { titulo: string; descripcion: string; habilitado: boolean; icon: React.ReactNode }) {
  return (
    <div className={`p-4 rounded-lg border flex items-start gap-3 ${habilitado ? "bg-emerald-500/10 border-emerald-500/30" : "bg-red-500/10 border-red-500/30"}`}>
      <div className={`p-2 rounded ${habilitado ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-text-100 text-sm">{titulo}</p>
        <p className="text-xs text-text-200 mt-0.5 truncate">{descripcion}</p>
      </div>
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${habilitado ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-red-500/20 text-red-300 border border-red-500/30"}`}>
        {habilitado ? "Sí" : "No"}
      </span>
    </div>
  );
}

export default Perfil;