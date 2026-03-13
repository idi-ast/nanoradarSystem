export interface ConfigServicesType {
    data: Data;
    message: string;
}

export interface Data {
    nanoradares: Nanoradares[];
    camaras: Camaras[];
    spotters: Spotters[];
}

export interface Spotters {
    serial: string;
    id: number;
    version: string;
    latitude: string;
    altitude: string;
    bearing: string;
    direccionIp: string;
    nombre: string;
    model: string;
    timestamp: number;
    longitude: string;
    declination: string;
    idEmpresa: number;
}

export interface Camaras {
    id: number;
    nombre: string;
    ubicacion: Ubicacion;
    url_stream: string;
    tipo: string;
}

export interface Ubicacion {
    lat: string;
    lng: string;
}

export interface Nanoradares {
    latitud: string;
    id: number;
    azimut: string;
    grado: number;
    idEmpresa: number;
    nombre: string;
    direccionIp: string;
    longitud: string;
    radio: number;
    apertura: number;
}