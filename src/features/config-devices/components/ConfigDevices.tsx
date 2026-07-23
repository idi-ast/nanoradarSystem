import { useState } from "react";
import { useConfigDevices } from "../hooks/useConfigDevices";
import { NanoradarEditModal } from "../nanoradar/components/NanoradarEditModal";
import { MagosradarEditModal } from "../magosradar/components/MagosradarEditModal";
import { SpotterEditModal } from "../spotter/components/SpotterEditModal";
import { usePerfilesMagos, useDeletePerfilMagos } from "../magosradar/hooks/usePerfilMagos";
import { PerfilMagosModal } from "../magosradar/components/PerfilMagosModal";
import type { Nanoradares, Magosradares, Spotters, PerfilMagos } from "../types/ConfigServices.type";
import LiquidGlassCard from "@/components/ui/LiquidGlass";
import { useToast } from "@/libs/sonner";

function ConfigDevices() {
    const { data: configDevices } = useConfigDevices();
    const { data: perfiles, isLoading: perfilesLoading } = usePerfilesMagos();
    const { mutate: deletePerfil } = useDeletePerfilMagos();
    const { success } = useToast();
    const [editingNanoradar, setEditingNanoradar] = useState<Nanoradares | null>(null);
    const [editingMagosradar, setEditingMagosradar] = useState<Magosradares | null>(null);
    const [editingSpotter, setEditingSpotter] = useState<Spotters | null>(null);
    const [profileModal, setProfileModal] = useState<{ open: true; perfil?: PerfilMagos } | { open: false }>({ open: false });

    return (
        <div className="flex flex-col gap-5 p-5 bg-linear-to-bl h-full from-brand-100 to-brand-200">
            <h1>Config NanoRadar</h1>
            <LiquidGlassCard content="dasd" title="asdadas" key={1} children="asdasdas" subtitle="asdasds" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {configDevices?.data.nanoradares.map((nanoradar) => (
                    <div key={nanoradar.id} className="bg-bg-100 rounded-md p-5 flex flex-col gap-2">
                        <div>ID: <span className="font-bold text-text-200">{nanoradar.id}</span></div>
                        <div>Nombre: <span className="font-bold text-text-200">{nanoradar.nombre}</span></div>
                        <div>Dirección IP: <span className="font-bold text-text-200">{nanoradar.direccionIp}</span></div>
                        <div>Latitud: <span className="font-bold text-text-200">{nanoradar.latitud}</span></div>
                        <div>Longitud: <span className="font-bold text-text-200">{nanoradar.longitud}</span></div>
                        <div>Azimut: <span className="font-bold text-text-200">{nanoradar.azimut}</span></div>
                        <div>Grado: <span className="font-bold text-text-200">{nanoradar.grado}</span></div>
                        <div>Radio: <span className="font-bold text-text-200">{nanoradar.radio}</span></div>
                        <div>Apertura: <span className="font-bold text-text-200">{nanoradar.apertura}</span></div>
                        <div>Color: <span className="font-bold" style={{ color: nanoradar.color }}>{nanoradar.color}</span></div>
                        <div>ID Empresa: <span className="font-bold text-text-200">{nanoradar.idEmpresa}</span></div>
                        <button
                            onClick={() => setEditingNanoradar(nanoradar)}
                            className="mt-2 w-full rounded-md bg-accent-200 hover:bg-accent-200/80 text-black text-sm font-medium py-1.5 transition"
                        >
                            Editar
                        </button>
                    </div>
                ))}
            </div>
            <div>
                <div>Config MagosRadar</div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {configDevices?.data.magosradares.map((magosradar) => (
                        <div key={magosradar.id} className="bg-bg-100 rounded-md p-5 flex flex-col gap-2">
                            <div>ID: <span className="font-bold text-text-200">{magosradar.id}</span></div>
                            <div>Nombre: <span className="font-bold text-text-200">{magosradar.nombre}</span></div>
                            <div>Dirección IP: <span className="font-bold text-text-200">{magosradar.direccionIp}</span></div>
                            <div>Latitud: <span className="font-bold text-text-200">{magosradar.latitud}</span></div>
                            <div>Longitud: <span className="font-bold text-text-200">{magosradar.longitud}</span></div>
                            <div>Azimut: <span className="font-bold text-text-200">{magosradar.azimut}</span></div>
                            <div>Grado: <span className="font-bold text-text-200">{magosradar.grado}</span></div>
                            <div>Radio: <span className="font-bold text-text-200">{magosradar.radio}</span></div>
                            <div>Apertura: <span className="font-bold text-text-200">{magosradar.apertura}</span></div>
                            <div>Color: <span className="font-bold" style={{ color: magosradar.color }}>{magosradar.color}</span></div>
                            <div>ID Empresa: <span className="font-bold text-text-200">{magosradar.idEmpresa}</span></div>
                            <button
                                onClick={() => setEditingMagosradar(magosradar)}
                                className="mt-2 w-full rounded-md bg-accent-200 hover:bg-accent-200/80 text-black text-sm font-medium py-1.5 transition"
                            >
                                Editar
                            </button>
                        </div>
                    ))}
                </div>
            </div>
            <div>
                <div>Config Camaras</div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {configDevices?.data.camaras.map((camara) => (
                        <div key={camara.id} className="bg-bg-100 rounded-md p-5 flex flex-col gap-2">
                            <div>ID: <span className="font-bold text-text-200">{camara.id}</span></div>
                            <div>Nombre: <span className="font-bold text-text-200">{camara.nombre}</span></div>
                            <div>Dirección IP: <span className="font-bold text-text-200">{camara.direccionIp}</span></div>
                            <div>Latitud: <span className="font-bold text-text-200">{camara.ubicacion.lat}</span></div>
                            <div>Longitud: <span className="font-bold text-text-200">{camara.ubicacion.lng}</span></div>
                            <div>Azimut: <span className="font-bold text-text-200">{camara.azimut}</span></div>
                            <div>Canal: <span className="font-bold text-text-200">{camara.channel}</span></div>
                            <div>Subtipo: <span className="font-bold text-text-200">{camara.subtype}</span></div>
                            <div>Tipo: <span className="font-bold text-text-200">{camara.tipo}</span></div>
                            <div>Usuario: <span className="font-bold text-text-200">{camara.usuario}</span></div>
                            <div>Color: <span className="font-bold" style={{ color: camara.color }}>{camara.color}</span></div>
                            <div>Url Stream: <span className="font-bold text-text-200">{camara.url_stream}</span></div>
                        </div>
                    ))}
                </div>
            </div>
            <div>
                <div>Config Spotters</div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {configDevices?.data.spotters.map((spotter) => (
                        <div key={spotter.id} className="bg-bg-100 rounded-md p-5 flex flex-col gap-2">
                            <div>ID: <span className="font-bold text-text-200">{spotter.id}</span></div>
                            <div>Nombre: <span className="font-bold text-text-200">{spotter.nombre}</span></div>
                            <div>Dirección IP: <span className="font-bold text-text-200">{spotter.direccionIp}</span></div>
                            <div>Modelo: <span className="font-bold text-text-200">{spotter.model}</span></div>
                            <div>Versión: <span className="font-bold text-text-200">{spotter.version}</span></div>
                            <div>Serial: <span className="font-bold text-text-200">{spotter.serial}</span></div>
                            <div>Latitud: <span className="font-bold text-text-200">{spotter.latitude}</span></div>
                            <div>Longitud: <span className="font-bold text-text-200">{spotter.longitude}</span></div>
                            <div>Altitud: <span className="font-bold text-text-200">{spotter.altitude}</span></div>
                            <div>Azimut: <span className="font-bold text-text-200">{spotter.azimut}</span></div>
                            <div>Bearing: <span className="font-bold text-text-200">{spotter.bearing}</span></div>
                            <div>Declinación: <span className="font-bold text-text-200">{spotter.declination}</span></div>
                            <div>Grado: <span className="font-bold text-text-200">{spotter.grado}</span></div>
                            <div>Radio: <span className="font-bold text-text-200">{spotter.radio}</span></div>
                            <div>Apertura: <span className="font-bold text-text-200">{spotter.apertura}</span></div>
                            <div>Color: <span className="font-bold" style={{ color: spotter.color }}>{spotter.color}</span></div>
                            <div>ID Empresa: <span className="font-bold text-text-200">{spotter.idEmpresa}</span></div>
                            <button
                                onClick={() => setEditingSpotter(spotter)}
                                className="mt-2 w-full rounded-md bg-accent-200 hover:bg-accent-200/80 text-black text-sm font-medium py-1.5 transition"
                            >
                                Editar
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* ════════ PERFILES MAGOS ════════ */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <div className="text-lg font-semibold text-text-100">Perfiles MagosRadar</div>
                    <button
                        onClick={() => setProfileModal({ open: true })}
                        className="rounded-md bg-brand-200 hover:bg-brand-200/80 text-black text-sm font-medium px-4 py-1.5 transition"
                    >
                        + Nuevo perfil
                    </button>
                </div>
                {perfilesLoading ? (
                    <div className="text-sm text-text-200 animate-pulse">Cargando perfiles...</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {perfiles?.map((perfil) => (
                            <div key={perfil.id} className="bg-bg-100 rounded-md p-5 flex flex-col gap-2 border border-border/50">
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-text-100">{perfil.nombre}</span>
                                    {perfil.is_default && (
                                        <span className="text-[10px] bg-brand-200/20 text-brand-200 px-2 py-0.5 rounded-full font-semibold">
                                            Default
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-text-200/80">{perfil.descripcion}</p>
                                <div className="h-px bg-border/40 my-1" />
                                <div className="text-[11px] text-text-200 space-y-0.5">
                                    <div>SNR: <span className="font-semibold text-text-100">{perfil.snr ?? "—"}</span></div>
                                    <div>RCS: <span className="font-semibold text-text-100">{perfil.rcs ?? "—"}</span></div>
                                    <div>Vel. máx: <span className="font-semibold text-text-100">{perfil.speed ?? "—"} m/s</span></div>
                                    <div>TTL: <span className="font-semibold text-text-100">{perfil.ttl ?? "—"}s</span></div>
                                    <div>Dist. clustering: <span className="font-semibold text-text-100">{perfil.clusterDist ?? "—"}m</span></div>
                                </div>
                                <div className="flex gap-2 mt-1">
                                    <button
                                        onClick={() => setProfileModal({ open: true, perfil })}
                                        className="flex-1 rounded-md bg-accent-200 hover:bg-accent-200/80 text-black text-sm font-medium py-1.5 transition"
                                    >
                                        Editar
                                    </button>
                                    {!perfil.is_default && (
                                        <button
                                            onClick={() => {
                                                if (confirm(`¿Eliminar el perfil "${perfil.nombre}"?`)) {
                                                    deletePerfil(perfil.id, {
                                                        onSuccess: () => success("Perfil eliminado"),
                                                    });
                                                }
                                            }}
                                            className="rounded-md bg-red-500/20 hover:bg-red-500/40 text-red-400 text-sm font-medium px-3 py-1.5 transition"
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

            {editingNanoradar && (
                <NanoradarEditModal
                    nanoradar={editingNanoradar}
                    onClose={() => setEditingNanoradar(null)}
                />
            )}
            {editingMagosradar && (
                <MagosradarEditModal
                    magosradar={editingMagosradar}
                    onClose={() => setEditingMagosradar(null)}
                />
            )}
            {editingSpotter && (
                <SpotterEditModal
                    spotter={editingSpotter}
                    onClose={() => setEditingSpotter(null)}
                />
            )}

            {profileModal.open && (
                <PerfilMagosModal
                    perfil={profileModal.perfil ?? null}
                    onClose={() => setProfileModal({ open: false })}
                />
            )}
        </div>
    );
}

export default ConfigDevices