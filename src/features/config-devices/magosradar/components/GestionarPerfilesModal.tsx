import { useState } from "react";
import { usePerfilesMagos, useDeletePerfilMagos } from "../hooks/usePerfilMagos";
import { PerfilMagosModal } from "./PerfilMagosModal";
import type { PerfilMagos } from "../../types/ConfigServices.type";
import { useToast } from "@/libs/sonner";

interface Props {
    onClose: () => void;
}

export function GestionarPerfilesModal({ onClose }: Props) {
    const { data: perfiles, isLoading } = usePerfilesMagos();
    const { mutate: deletePerfil } = useDeletePerfilMagos();
    const { success } = useToast();
    const [editing, setEditing] = useState<PerfilMagos | null | "new">(null);

    if (editing !== null) {
        return (
            <PerfilMagosModal
                perfil={editing === "new" ? null : editing}
                onClose={() => setEditing(null)}
            />
        );
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-bg-200 border border-border rounded-xl shadow-2xl w-full max-w-xl mx-4 max-h-[85vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
                    <div>
                        <h2 className="text-base font-semibold text-text-100">Gestionar perfiles</h2>
                        <p className="text-xs text-text-200 mt-0.5">Administra las configuraciones predefinidas para MagosRadar</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-text-200 hover:text-text-100 transition"
                        aria-label="Cerrar"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5">
                    {isLoading ? (
                        <div className="text-sm text-text-200 animate-pulse text-center py-8">Cargando perfiles...</div>
                    ) : !perfiles || perfiles.length === 0 ? (
                        <div className="text-sm text-text-200 text-center py-8">
                            No hay perfiles creados aún.
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {perfiles.map((perfil) => (
                                <div
                                    key={perfil.id}
                                    className="flex items-center justify-between rounded-lg border border-border/60 bg-bg-100 px-4 py-3 hover:border-brand-200 transition-colors"
                                >
                                    <div className="flex flex-col min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold text-text-100 truncate">{perfil.nombre}</span>
                                            {perfil.is_default && (
                                                <span className="text-[9px] bg-brand-200/20 text-brand-200 px-1.5 py-0.5 rounded-full font-semibold shrink-0">
                                                    Default
                                                </span>
                                            )}
                                        </div>
                                        {perfil.descripcion && (
                                            <p className="text-[11px] text-text-200 truncate mt-0.5">{perfil.descripcion}</p>
                                        )}
                                        <div className="flex gap-2 mt-1 text-[11px] text-text-200/50">
                                            <span>SNR: {perfil.snr ?? "—"}</span>
                                            <span>RCS: {perfil.rcs ?? "—"}</span>
                                            <span>TTL: {perfil.ttl ?? "—"}s</span>
                                            <span>Cluster: {perfil.clusterDist ?? "—"}m</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-1.5 ml-3 shrink-0">
                                        <button
                                            onClick={() => setEditing(perfil)}
                                            className="rounded-md bg-accent-200/20 hover:bg-accent-200/40 text-accent-200 text-[11px] font-medium px-3 py-1.5 transition"
                                        >
                                            Editar
                                        </button>
                                        {!perfil.is_default && (
                                            <button
                                                onClick={() => {
                                                    if (confirm(`¿Eliminar el perfil "${perfil.nombre}"?`)) {
                                                        deletePerfil(perfil.id, {
                                                            onSuccess: () => success(`Perfil "${perfil.nombre}" eliminado`),
                                                        });
                                                    }
                                                }}
                                                className="rounded-md bg-red-500/15 hover:bg-red-500/30 text-red-400 text-[11px] font-medium px-3 py-1.5 transition"
                                            >
                                                Eliminar
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-5 py-3 border-t border-border shrink-0">
                    <button
                        onClick={onClose}
                        className="rounded-md bg-bg-100 hover:bg-bg-300 text-text-200 text-sm font-medium px-4 py-1.5 transition"
                    >
                        Cerrar
                    </button>
                    <button
                        onClick={() => setEditing("new")}
                        className="rounded-md  bg-bg-400 hover:bg-bg-400/80 text-text-400 text-sm font-medium px-4 py-1.5 transition"
                    >
                        Crear perfil
                    </button>
                </div>
            </div>
        </div>
    );
}
