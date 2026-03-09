import { useEffect, useState } from "react";
import { apiClient } from "@/apis/apiClient";
import {
  IconEdit,
  IconTrash,
  IconUserPlus,
  IconBuilding,
  IconUsers,
  IconDeviceFloppy,
} from "@tabler/icons-react";

interface Empresa {
  id: number;
  nombre: string;
  rut: string;
  email: string;
  telefono: string;
  direccion: string;
}

interface Usuario {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  role: string;
}

// --- COMPONENTE PRINCIPAL ---
const Administracion = () => {
  const [view, setView] = useState<"empresa" | "usuarios">("usuarios");
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [resEmp, resUsu] = await Promise.all([
        apiClient.get<{ data: Empresa[] }>("/empresas"),
        apiClient.get<{ data: Usuario[] }>("/usuarios"),
      ]);
      setEmpresa(resEmp.data.data[0]);
      setUsuarios(resUsu.data.data);
    } catch (error) {
      console.error("Error al cargar datos administrativos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading)
    return (
      <div className="p-8 text-emerald-500 font-mono">
        INICIALIZANDO SISTEMA...
      </div>
    );

  return (
    <div className="flex flex-col w-full h-[calc(100vh-64px)] bg-slate-950 text-slate-200 p-6 overflow-hidden">
      {/* Tabs de Navegación */}
      <div className="flex space-x-4 border-b border-emerald-500/20 mb-6">
        <button
          onClick={() => setView("usuarios")}
          className={`pb-2 px-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-all ${
            view === "usuarios"
              ? "border-b-2 border-emerald-500 text-emerald-500"
              : "text-slate-500 hover:text-slate-300"
          }`}
        >
          <IconUsers size={14} /> Gestión de Usuarios
        </button>
        <button
          onClick={() => setView("empresa")}
          className={`pb-2 px-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-all ${
            view === "empresa"
              ? "border-b-2 border-emerald-500 text-emerald-500"
              : "text-slate-500 hover:text-slate-300"
          }`}
        >
          <IconBuilding size={14} /> Datos de Empresa
        </button>
      </div>

      {/* Contenido Dinámico */}
      <div className="flex-grow overflow-y-auto pr-2">
        {view === "usuarios" ? (
          <SeccionUsuarios
            usuarios={usuarios}
            refresh={fetchData}
            idEmpresa={empresa?.id}
          />
        ) : (
          <SeccionEmpresa empresa={empresa} refresh={fetchData} />
        )}
      </div>
    </div>
  );
};

// --- SUB-COMPONENTE: SECCIÓN USUARIOS ---
const SeccionUsuarios = ({
  usuarios,
  refresh,
  idEmpresa,
}: {
  usuarios: Usuario[];
  refresh: () => void;
  idEmpresa?: number;
}) => {
  const [isEditing, setIsEditing] = useState<Partial<Usuario> | null>(null);

  const eliminarUsuario = async (id: number) => {
    if (!window.confirm("¿Confirmar eliminación de usuario?")) return;
    try {
      await apiClient.delete(`/usuarios/${id}`);
      refresh();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-light tracking-tight">
          Personal <span className="text-emerald-500 font-bold">Autorizado</span>
        </h2>
        <button
          onClick={() =>
            setIsEditing({
              nombre: "",
              apellido: "",
              email: "",
              role: "user",
            })
          }
          className="bg-emerald-600 hover:bg-emerald-500 text-black px-4 py-2 rounded flex items-center gap-2 text-[10px] font-bold uppercase tracking-tighter transition-all"
        >
          <IconUserPlus size={14} /> Registrar Usuario
        </button>
      </div>

      <div className="bg-slate-900/40 border border-emerald-500/10 rounded-lg overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-emerald-500/5 text-emerald-500 text-[9px] uppercase tracking-[0.2em] border-b border-emerald-500/10">
            <tr>
              <th className="p-4">Operador</th>
              <th className="p-4">Contacto</th>
              <th className="p-4">Privilegios</th>
              <th className="p-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-mono text-xs">
            {usuarios.map((u) => (
              <tr
                key={u.id}
                className="hover:bg-emerald-500/5 transition-colors"
              >
                <td className="p-4 text-slate-200">
                  {u.nombre} {u.apellido}
                </td>
                <td className="p-4 text-slate-400">{u.email}</td>
                <td className="p-4">
                  <span
                    className={`px-2 py-0.5 rounded text-[9px] border ${
                      u.role === "admin"
                        ? "border-red-500/50 text-red-400"
                        : "border-emerald-500/50 text-emerald-400"
                    }`}
                  >
                    {u.role}
                  </span>
                </td>
                <td className="p-4 flex justify-center gap-4">
                  <button
                    onClick={() => setIsEditing(u)}
                    className="text-emerald-500 hover:text-white"
                  >
                    <IconEdit size={14} />
                  </button>
                  <button
                    onClick={() => eliminarUsuario(u.id)}
                    className="text-red-500/70 hover:text-red-400"
                  >
                    <IconTrash size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Suprimir warning de variable no usada cuando esté implementado el modal */}
      {isEditing && idEmpresa !== undefined && null}
    </div>
  );
};

// --- SUB-COMPONENTE: SECCIÓN EMPRESA ---
const SeccionEmpresa = ({
  empresa,
  refresh,
}: {
  empresa: Empresa | null;
  refresh: () => void;
}) => {
  const [form, setForm] = useState<Empresa | null>(empresa);

  useEffect(() => {
    setForm(empresa);
  }, [empresa]);

  const updateEmpresa = async () => {
    if (!form || !empresa) return;
    try {
      await apiClient.put(`/empresas/${empresa.id}`, form);
      alert("Información actualizada en el servidor.");
      refresh();
    } catch {
      alert("Error al actualizar.");
    }
  };

  if (!form) return null;

  const fields: { label: string; key: keyof Empresa; disabled?: boolean; full?: boolean }[] = [
    { label: "Nombre Legal", key: "nombre" },
    { label: "RUT / Identificador", key: "rut", disabled: true },
    { label: "Email Corporativo", key: "email" },
    { label: "Teléfono de Contacto", key: "telefono" },
    { label: "Dirección Comercial", key: "direccion", full: true },
  ];

  return (
    <div className="max-w-3xl bg-slate-900/60 p-8 rounded-xl border border-emerald-500/10 shadow-2xl">
      <h2 className="text-sm font-bold text-emerald-500 mb-8 flex items-center gap-3 uppercase tracking-widest">
        <IconBuilding size={18} /> Configuración de Entidad
      </h2>
      <div className="grid grid-cols-2 gap-x-8 gap-y-6">
        {fields.map((field) => (
          <div
            key={field.key}
            className={`flex flex-col gap-2 ${field.full ? "col-span-2" : ""}`}
          >
            <label className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">
              {field.label}
            </label>
            <input
              className={`bg-black/40 border border-white/10 p-2.5 rounded text-xs focus:border-emerald-500 outline-none transition-all ${
                field.disabled ? "opacity-50 cursor-not-allowed" : ""
              }`}
              value={form[field.key] ?? ""}
              disabled={field.disabled}
              onChange={(e) =>
                setForm({ ...form, [field.key]: e.target.value })
              }
            />
          </div>
        ))}
      </div>
      <button
        onClick={updateEmpresa}
        className="mt-10 w-full bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-[10px] py-4 rounded uppercase tracking-[0.2em] transition-all flex justify-center items-center gap-3"
      >
        <IconDeviceFloppy size={16} /> Confirmar Cambios en Base de Datos
      </button>
    </div>
  );
};

export default Administracion;
