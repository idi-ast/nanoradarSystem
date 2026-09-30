import { useMemo, useState } from "react";
import { IconEdit, IconTrash } from "@tabler/icons-react";
import { useEmpresas } from "@/features/config-devices/dispositivos/hooks/useDispositivos";
import { useUsers } from "../hooks/useUsers";
import { useDeleteUser } from "../hooks/useDeleteUser";
import { UserModal } from "../components/UserModal";
import type { Data } from "../types/users.types";

function Users() {
  const { data: users } = useUsers();
  const { data: empresas } = useEmpresas();
  const { mutate: deleteUser } = useDeleteUser();

  const [showCreate, setShowCreate] = useState(false);
  const [editingUser, setEditingUser] = useState<Data | null>(null);

  const empresasMap = useMemo(
    () => new Map((empresas ?? []).map((e) => [e.id, e.nombre])),
    [empresas],
  );

  const roles = (roleId: number) => {
    switch (roleId) {
      case 1:
        return "Super Admin";
      case 2:
        return "Admin";
      case 3:
        return "Cliente";
      default:
        return "Sin roles";
    }
  };

  const rolesColor = (roleId: number) => {
    switch (roleId) {
      case 1:
        return "text-violet-200 border border-violet-500";
      case 2:
        return "text-blue-200 border border-blue-500";
      case 3:
        return "text-green-200 border border-green-500";
      default:
        return "text-gray-200 border border-gray-500";
    }
  };

  return (
    <div className="flex flex-col w-full bg-bg-100 h-full">
      <div className="h-20 bg-bg-100 text-text-100 p-5 flex items-center justify-between">
        <h1>Usuarios</h1>
        <div>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-bg-400 text-text-400 rounded hover:bg-bg-200/80 hover:text-text-100 transition-colors"
          >
            Crear Usuario
          </button>
        </div>
      </div>
      <div className="p-5 w-1/3">
        {users?.data?.map((user) => (
          <div
            key={user.id}
            className="p-2 border-t border-t-bg-300 bg-bg-200/50 rounded-2xl hover:bg-bg-200 mb-2 flex flex-col gap-2"
          >
            <div className="grid grid-cols-2">
              <div className="flex items-center gap-2">
                <h3 className="capitalize text-text-100">
                  {user.nombre} {user.apellido}
                </h3>
                <span
                  className={`text-[10px] ${rolesColor(user.role_id)} px-2 py-0.5 rounded-full`}
                >
                  {roles(user.role_id)}
                </span>
              </div>
              <div className="flex items-center justify-end gap-1">
                <button
                  onClick={() => setEditingUser(user)}
                  className="p-1.5 rounded hover:bg-bg-300 text-text-200 hover:text-text-100 transition-colors"
                >
                  <IconEdit size={15} stroke={1.5} />
                </button>
                <button
                  onClick={() => deleteUser(user.id)}
                  className="p-1.5 rounded hover:bg-red-500/10 text-text-200 hover:text-red-400 transition-colors"
                >
                  <IconTrash size={15} stroke={1.5} />
                </button>
              </div>
            </div>
            <div className="flex gap-5">
              <span className="text-text-200 tracking-widest">
                {user.email}
              </span>
              <span className="text-text-200 tracking-widest ">
                {user.idEmpresa
                  ? `Empresa: ${empresasMap.get(user.idEmpresa) ?? `#${user.idEmpresa}`}`
                  : "Sin empresa asignada"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {showCreate && <UserModal onClose={() => setShowCreate(false)} />}
      {editingUser && (
        <UserModal user={editingUser} onClose={() => setEditingUser(null)} />
      )}
    </div>
  );
}

export default Users;
