import { useState } from "react";
import { IconEdit, IconTrash } from "@tabler/icons-react";
import { useUsers } from "../hooks/useUsers";
import { useDeleteUser } from "../hooks/useDeleteUser";
import { UserModal } from "../components/UserModal";
import type { Data } from "../types/users.types";

function Users() {
    const { data: users } = useUsers();
    const { mutate: deleteUser } = useDeleteUser();

    const [showCreate, setShowCreate] = useState(false);
    const [editingUser, setEditingUser] = useState<Data | null>(null);

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
                return "text-violet-200 bg-violet-500 border border-violet-500";
            case 2:
                return "text-blue-200 bg-blue-500 border border-blue-500";
            case 3:
                return "text-green-200 bg-green-500 border border-green-500";
            default:
                return "text-gray-200 bg-gray-500 border border-gray-500";
        }
    };

    return (
        <div className="flex flex-col w-full">
            <div className="h-20 bg-bg-100 p-5 flex items-center justify-between">
                <h1>Usuarios</h1>
                <div>
                    <button
                        onClick={() => setShowCreate(true)}
                        className="px-4 py-2 bg-brand-100 text-text-100 rounded hover:bg-bg-300 transition-colors">
                        Crear Usuario
                    </button>
                </div>
            </div>
            <div className="p-5">
                {users?.data?.map((user) => (
                    <div key={user.id} className="p-2 border-s-4 border border-border border-s-border-200 mb-2 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <h3 className="capitalize">{user.nombre} {user.apellido}</h3>
                                <span className={`text-xs ${rolesColor(user.role_id)} px-2 py-0.5 rounded`}>{roles(user.role_id)}</span>
                            </div>
                            <div className="flex items-center gap-1">
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
                        <div>
                            {user.email} - {user.idEmpresa ? `Empresa: ${user.idEmpresa}` : "Sin empresa asignada"}
                        </div>
                    </div>
                ))}
            </div>

            {showCreate && <UserModal onClose={() => setShowCreate(false)} />}
            {editingUser && <UserModal user={editingUser} onClose={() => setEditingUser(null)} />}
        </div>
    )
}

export default Users