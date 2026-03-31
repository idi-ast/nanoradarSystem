import { useState } from "react";
import { useConfigDevices } from "../hooks/useConfigDevices";
import { NanoradarEditModal } from "../nanoradar/components/NanoradarEditModal";
import { SpotterEditModal } from "../spotter/components/SpotterEditModal";
import type { Nanoradares, Spotters } from "../types/ConfigServices.type";
import LiquidGlassCard from "@/components/ui/LiquidGlass";

function ConfigDevices() {
    const { data: configDevices } = useConfigDevices();
    const [editingNanoradar, setEditingNanoradar] = useState<Nanoradares | null>(null);
    const [editingSpotter, setEditingSpotter] = useState<Spotters | null>(null);

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

            {editingNanoradar && (
                <NanoradarEditModal
                    nanoradar={editingNanoradar}
                    onClose={() => setEditingNanoradar(null)}
                />
            )}
            {editingSpotter && (
                <SpotterEditModal
                    spotter={editingSpotter}
                    onClose={() => setEditingSpotter(null)}
                />
            )}
        </div>
    );
}

export default ConfigDevices