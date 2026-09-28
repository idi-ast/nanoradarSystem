import { useState, useEffect, useMemo } from "react";
import type { FormEvent } from "react";
import { createPortal } from "react-dom";
import { IconX } from "@tabler/icons-react";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { useRole } from "@/context/role";
import { useEmpresas } from "@/features/config-devices/dispositivos/hooks/useDispositivos";
import { useCreateUser } from "../hooks/useCreateUser";
import { useUpdateUser } from "../hooks/useUpdateUser";
import type { Data, CreateUserDto } from "../types/users.types";

interface UserModalProps {
    user?: Data;
    onClose: () => void;
}

const ROLES = [
    { id: 1, label: "Super Admin" },
    { id: 2, label: "Admin" },
    { id: 3, label: "Cliente" },
];

const SELECT_CLASS =
    "h-8 text-sm rounded-lg border border-border bg-bg-100 text-text-100 px-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed";

export function UserModal({ user, onClose }: UserModalProps) {
    const isEdit = !!user;

    const { isSuperAdmin, idEmpresa: miIdEmpresa, empresaEsPrincipal } = useRole();
    const { data: empresasData, isLoading: empresasLoading } = useEmpresas();

    const [form, setForm] = useState({
        nombre: user?.nombre ?? "",
        apellido: user?.apellido ?? "",
        email: user?.email ?? "",
        password: "",
        role_id: user?.role_id ?? 3,
        idEmpresa: user?.idEmpresa ?? 0,
    });

    const { mutate: create, isPending: creating, error: createError } = useCreateUser();
    const { mutate: update, isPending: updating, error: updateError } = useUpdateUser();

    const isPending = creating || updating;
    const error = createError ?? updateError;

    // Solo el superadmin de la empresa principal administra todas las empresas;
    // cualquier otro admin únicamente ve la suya (misma regla que el backend
    // en scope_empresa / puede_ver_todas_las_empresas).
    const puedeVerTodas = isSuperAdmin && empresaEsPrincipal;

    const empresasVisibles = useMemo(() => {
        const todas = empresasData ?? [];
        const visibles = puedeVerTodas ? todas : todas.filter((e) => e.id === miIdEmpresa);
        // El backend solo permite asignar el rol superadmin a usuarios de la
        // empresa principal, así que filtramos para evitar un 400 garantizado.
        return form.role_id === 1 ? visibles.filter((e) => e.principal) : visibles;
    }, [empresasData, puedeVerTodas, miIdEmpresa, form.role_id]);

    // Al editar, la empresa actual siempre aparece como opción para no perderla
    // en el select aunque no esté entre las visibles.
    const empresas = useMemo(() => {
        const actual = form.idEmpresa;
        if (isEdit && actual && !empresasVisibles.some((e) => e.id === actual)) {
            return [...empresasVisibles, { id: actual, nombre: `Empresa #${actual}`, principal: false }];
        }
        return empresasVisibles;
    }, [empresasVisibles, form.idEmpresa, isEdit]);

    // Al crear, si aún no hay elección explícita, se toma la primera disponible.
    const idEmpresa = empresas.some((e) => e.id === form.idEmpresa)
        ? form.idEmpresa
        : (empresas[0]?.id ?? 0);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [onClose]);

    function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
        const { name, value } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: name === "role_id" || name === "idEmpresa" ? Number(value) : value,
        }));
    }

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        if (isEdit) {
            const payload: Record<string, unknown> = {
                nombre: form.nombre,
                apellido: form.apellido,
                email: form.email,
                role_id: form.role_id,
                idEmpresa,
            };
            if (form.password) payload.password = form.password;
            update({ id: user.id, data: payload }, { onSuccess: onClose });
        } else {
            create({ ...form, idEmpresa } as CreateUserDto, { onSuccess: onClose });
        }
    }

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-bg-200 border border-border rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                    <div>
                        <h2 className="text-sm font-semibold text-text-100">
                            {isEdit ? "Editar usuario" : "Crear usuario"}
                        </h2>
                        {isEdit && <p className="text-xs text-text-200 mt-0.5">ID: {user.id}</p>}
                    </div>
                    <button
                        onClick={onClose}
                        className="text-text-200 hover:text-text-100 transition"
                    >
                        <IconX size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-5 py-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                            <Label htmlFor="nombre" className="text-[11px] text-text-100/60 uppercase tracking-widest">
                                Nombre
                            </Label>
                            <Input
                                id="nombre"
                                name="nombre"
                                value={form.nombre}
                                onChange={handleChange}
                                placeholder="Juan"
                                required
                                className="h-8 text-sm"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <Label htmlFor="apellido" className="text-[11px] text-text-100/60 uppercase tracking-widest">
                                Apellido
                            </Label>
                            <Input
                                id="apellido"
                                name="apellido"
                                value={form.apellido}
                                onChange={handleChange}
                                placeholder="Pérez"
                                required
                                className="h-8 text-sm"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-1">
                        <Label htmlFor="email" className="text-[11px] text-text-100/60 uppercase tracking-widest">
                            Correo electrónico
                        </Label>
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            value={form.email}
                            onChange={handleChange}
                            placeholder="juan@empresa.com"
                            required
                            className="h-8 text-sm"
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <Label htmlFor="password" className="text-[11px] text-text-100/60 uppercase tracking-widest">
                            Contraseña{isEdit && <span className="normal-case tracking-normal text-text-200 ml-1">(dejar vacío para no cambiar)</span>}
                        </Label>
                        <Input
                            id="password"
                            name="password"
                            type="password"
                            value={form.password}
                            onChange={handleChange}
                            placeholder="••••••••"
                            required={!isEdit}
                            className="h-8 text-sm"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                            <Label htmlFor="role_id" className="text-[11px] text-text-100/60 uppercase tracking-widest">
                                Rol
                            </Label>
                            <select
                                id="role_id"
                                name="role_id"
                                value={form.role_id}
                                onChange={handleChange}
                                className={SELECT_CLASS}
                            >
                                {ROLES.map((r) => (
                                    <option key={r.id} value={r.id}>
                                        {r.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex flex-col gap-1">
                            <Label htmlFor="idEmpresa" className="text-[11px] text-text-100/60 uppercase tracking-widest">
                                Empresa
                            </Label>
                            <select
                                id="idEmpresa"
                                name="idEmpresa"
                                value={idEmpresa}
                                onChange={handleChange}
                                required
                                disabled={empresasLoading || !puedeVerTodas}
                                className={SELECT_CLASS}
                            >
                                {empresasLoading && <option value={0}>Cargando empresas...</option>}
                                {!empresasLoading && empresas.length === 0 && (
                                    <option value={0}>Sin empresas disponibles</option>
                                )}
                                {empresas.map((e) => (
                                    <option key={e.id} value={e.id}>
                                        {e.nombre}
                                    </option>
                                ))}
                            </select>
                            {!puedeVerTodas && !empresasLoading && (
                                <p className="text-[10px] text-text-200">
                                    Solo puedes asignar usuarios a tu propia empresa.
                                </p>
                            )}
                        </div>
                    </div>

                    {error && (
                        <p className="text-xs text-red-400">
                            {(error as Error).message}
                        </p>
                    )}

                    <div className="flex justify-end gap-2 pt-1">
                        <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
                            Cancelar
                        </Button>
                        {/* idEmpresa = 0 significaría una empresa inexistente: el backend
                            lo rechazaría con un 500 por violación de FK. */}
                        <Button type="submit" disabled={isPending || idEmpresa === 0}>
                            {isPending ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear usuario"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>,
        document.body,
    );
}
