import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { createPortal } from "react-dom";
import {
  IconDeviceDesktop,
  IconPencil,
  IconPlus,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { PageLoader } from "@/components/ui/PageLoader";
import { useCreateDispositivo, useDeleteDispositivo, useDispositivos, useEmpresas, useTiposDispositivos, useUpdateDispositivo } from "../hooks/useDispositivos";
import type { Dispositivo, DispositivoPayload, TipoDispositivo } from "../types";
import { parseConfig, tipoLabel, tipoMeta } from "../types";

/** Plantillar de config por tipo (mismas claves que las tablas legacy). */
const TIPO_PLANTILLAS: Record<string, Record<string, unknown>> = {
  nano: {
    direccionIp: "",
    latitud: "",
    longitud: "",
    azimut: "0",
    radio: 100,
    grado: 0,
    apertura: 360,
    color: "#22c55e",
    idPtz: null,
    ptzAutoTracking: false,
  },
  magos: {
    direccionIp: "",
    trackColor: null,
    enabled: 1,
    sinFiltro: 0,
    espejoX: 0,
    espejoY: 0,
    trackingManual: 0,
    snr: null,
    rcs: null,
    maxSpeed: null,
    zoomAutomatico: 0,
    zoomMax: 0.5,
    zoomMin: 0.0,
  },
  spotter: {
    direccionIp: "",
    serial: "",
    model: "",
    version: "",
    latitude: "",
    longitude: "",
    bearing: "0",
  },
  ptz: {
    direccionIp: "",
    puertoOnvif: 80,
    puertoRtsp: 554,
    azimut: "0",
    usuario: "admin",
    password: "",
    channel: 1,
    subtype: 0,
  },
  camara: {
    direccionIp: "",
    channel: 1,
    subtype: 0,
    azimut: "0",
    usuario: "admin",
    password: "",
  },
  sensor: {},
};

const toJsonText = (config: Record<string, unknown> | null | undefined): string =>
  JSON.stringify(config && Object.keys(config).length ? config : {}, null, 2);

const configKeyCount = (config: Record<string, unknown> | null | undefined): number =>
  config ? Object.keys(config).length : 0;

interface ModalProps {
  editing: Dispositivo | null;
  tipos: TipoDispositivo[];
  empresas: { id: number; nombre: string }[];
  onClose: () => void;
}

function DispositivoFormModal({ editing, tipos, empresas, onClose }: ModalProps) {
  const createMut = useCreateDispositivo();
  const updateMut = useUpdateDispositivo();

  const [idTipo, setIdTipo] = useState<number>(
    editing?.id_tipo_dispositivo ?? tipos[0]?.id ?? 0
  );
  const [modelo, setModelo] = useState<string>(editing?.modelo ?? "");
  const [serial, setSerial] = useState<string>(editing?.serial ?? "");
  const [status, setStatus] = useState<boolean>(editing?.status ?? true);
  const [idEmpresa, setIdEmpresa] = useState<number>(
    editing?.id_empresa ?? empresas[0]?.id ?? 1
  );
  const [configText, setConfigText] = useState<string>(
    toJsonText(editing?.config)
  );
  const [error, setError] = useState<string | null>(null);

  const tipoSeleccionado = tipos.find((t) => t.id === idTipo);
  const isPending = createMut.isPending || updateMut.isPending;

  const aplicarPlantilla = () => {
    const template = TIPO_PLANTILLAS[tipoSeleccionado?.nombre ?? ""] ?? {};
    setConfigText(JSON.stringify(template, null, 2));
    setError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!idTipo) {
      setError("Selecciona el tipo de dispositivo");
      return;
    }
    if (!modelo.trim()) {
      setError("El modelo es obligatorio");
      return;
    }
    let config: Record<string, unknown>;
    try {
      config = parseConfig(configText);
    } catch (err) {
      setError(String((err as Error).message));
      return;
    }

    const payload: DispositivoPayload = {
      id_tipo_dispositivo: idTipo,
      modelo: modelo.trim(),
      serial: serial.trim() || null,
      status,
      id_empresa: idEmpresa,
      config,
    };

    if (editing) {
      updateMut.mutate({ id: editing.id, payload }, { onSuccess: onClose });
    } else {
      createMut.mutate(payload, { onSuccess: onClose });
    }
  };

  const labelCampo = "text-xs font-medium text-text-200";

  return createPortal(
    <div
      className="fixed inset-0 z-99999 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-bg-100 border border-border rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-text-100">
            {editing ? "Editar dispositivo" : "Nuevo dispositivo"}
            {editing && (
              <span className="ml-2 text-xs font-normal text-text-200">
                (#{editing.id})
              </span>
            )}
          </h2>
          <button
            onClick={onClose}
            className="text-text-200 hover:text-text-100 transition"
            aria-label="Cerrar"
          >
            <IconX size={16} stroke={1.5} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 flex flex-col gap-4">
          {error && <Alert variant="error">{error}</Alert>}

          {/* Tipo de dispositivo */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tipo" className={labelCampo}>
              Tipo de dispositivo
            </Label>
            <select
              id="tipo"
              value={idTipo}
              onChange={(e) => setIdTipo(Number(e.target.value))}
              disabled={isPending}
              className="py-2.5 px-3 border bg-bg-100 text-text-100 placeholder-text-200 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg border-border"
            >
              {tipos.map((t) => (
                <option key={t.id} value={t.id}>
                  {tipoLabel(t.nombre)} ({t.nombre})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-text-200">
              tipo_radar heredado:{" "}
              <span className="font-mono text-brand-200">
                {tipoSeleccionado?.nombre ?? "—"}
              </span>
            </p>
          </div>

          {/* Identificación */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="modelo" className={labelCampo}>
                Modelo *
              </Label>
              <Input
                id="modelo"
                value={modelo}
                onChange={(e) => setModelo(e.target.value)}
                placeholder="Ej: Spotter S1, MG-1000"
                disabled={isPending}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="serial" className={labelCampo}>
                Serial
              </Label>
              <Input
                id="serial"
                value={serial}
                onChange={(e) => setSerial(e.target.value)}
                placeholder="Opcional"
                disabled={isPending}
              />
            </div>
          </div>

          {/* Estado + Empresa */}
          <div className="grid grid-cols-2 gap-3 items-end">
            <div className="flex items-center gap-2 pb-1">
              <Checkbox
                id="status"
                checked={status}
                onChange={(e) => setStatus(e.target.checked)}
                disabled={isPending}
              />
              <Label htmlFor="status" className="text-xs text-text-100 cursor-pointer">
                Activo
              </Label>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="empresa" className={labelCampo}>
                Empresa
              </Label>
              <select
                id="empresa"
                value={idEmpresa}
                onChange={(e) => setIdEmpresa(Number(e.target.value))}
                disabled={isPending}
                className="py-2.5 px-3 border bg-bg-100 text-text-100 placeholder-text-200 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg border-border"
              >
                {empresas.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Config JSON */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="config" className={labelCampo}>
                Configuración (JSON)
              </Label>
              <button
                type="button"
                onClick={aplicarPlantilla}
                className="text-[11px] text-brand-200 hover:underline"
              >
                Plantilla {tipoSeleccionado ? tipoLabel(tipoSeleccionado.nombre) : ""}
              </button>
            </div>
            <textarea
              id="config"
              value={configText}
              onChange={(e) => setConfigText(e.target.value)}
              rows={8}
              spellCheck={false}
              disabled={isPending}
              className="px-3 py-2.5 border bg-bg-100 text-text-100 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg border-border resize-y"
            />
            <p className="text-[11px] text-text-200">
              Configuración específica del dispositivo (comportamientos futuros).
            </p>
          </div>

          {/* Acciones */}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={isPending}>
              {editing ? "Guardar cambios" : "Crear dispositivo"}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

export function DispositivosPage() {
  const [filtroTipo, setFiltroTipo] = useState<string>("all");
  const [busqueda, setBusqueda] = useState<string>("");
  const [modal, setModal] = useState<{ abierto: boolean; editing: Dispositivo | null }>({
    abierto: false,
    editing: null,
  });
  const [borrar, setBorrar] = useState<Dispositivo | null>(null);

  const tiposQuery = useTiposDispositivos();
  const disposQuery = useDispositivos({
    tipo_radar: filtroTipo === "all" ? undefined : filtroTipo,
  });
  const empresasQuery = useEmpresas();
  const deleteMut = useDeleteDispositivo();

  const tipos = tiposQuery.data ?? [];
  const empresas = useMemo(() => empresasQuery.data ?? [], [empresasQuery.data]);
  const empresasMap = useMemo(
    () => new Map(empresas.map((e) => [e.id, e.nombre])),
    [empresas]
  );

  const filas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return disposQuery.data ?? [];
    return (disposQuery.data ?? []).filter(
      (d) => d.modelo.toLowerCase().includes(q) || (d.serial ?? "").toLowerCase().includes(q)
    );
  }, [disposQuery.data, busqueda]);

  const stats = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of disposQuery.data ?? []) {
      map.set(d.tipo_radar, (map.get(d.tipo_radar) ?? 0) + 1);
    }
    return map;
  }, [disposQuery.data]);

  const isLoading =
    tiposQuery.isLoading || disposQuery.isLoading || empresasQuery.isLoading;

  const badge = (nombre: string) => {
    const meta = tipoMeta(nombre);
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${meta.badge}`}>
        {meta.label}
      </span>
    );
  };

  return (
    <div className="p-5 flex flex-col gap-4">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-bg-400/60 flex items-center justify-center text-text-100">
            <IconDeviceDesktop size={18} stroke={1.5} />
          </div>
          <div>
            <h1 className="text-base font-semibold text-text-100">Dispositivos</h1>
            <p className="text-xs text-text-200">
              Registro genérico por tipo y modelo (wiradar)
            </p>
          </div>
        </div>
        <Button
          onClick={() => setModal({ abierto: true, editing: null })}
          leftIcon={<IconPlus size={15} stroke={1.5} />}
        >
          Nuevo dispositivo
        </Button>
      </div>

      {/* Resumen por tipo */}
      {tiposQuery.data && tiposQuery.data.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tiposQuery.data.map((t) => {
            const n = stats.get(t.nombre) ?? 0;
            return (
              <button
                key={t.id}
                onClick={() => setFiltroTipo(t.nombre)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition ${
                  filtroTipo === t.nombre
                    ? "border-brand-200 text-brand-200 bg-brand-200/10"
                    : "border-border text-text-200 hover:bg-bg-200"
                }`}
              >
                {tipoLabel(t.nombre)} · {n}
              </button>
            );
          })}
          <button
            onClick={() => setFiltroTipo("all")}
            className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition ${
              filtroTipo === "all"
                ? "border-brand-200 text-brand-200 bg-brand-200/10"
                : "border-border text-text-200 hover:bg-bg-200"
            }`}
          >
            Todos
          </button>
        </div>
      )}

      {/* Búsqueda */}
      <div className="max-w-xs">
        <Input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por modelo o serial…"
        />
      </div>

      {/* Tabla */}
      {isLoading ? (
        <PageLoader />
      ) : filas.length === 0 ? (
        <div className="border border-border rounded-xl p-8 text-center text-sm text-text-200">
          No hay dispositivos registrados para este filtro.
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-text-200">
                <th className="px-4 py-2.5">ID</th>
                <th className="px-4 py-2.5">Tipo</th>
                <th className="px-4 py-2.5">Modelo</th>
                <th className="px-4 py-2.5">Serial</th>
                <th className="px-4 py-2.5">Estado</th>
                <th className="px-4 py-2.5">Empresa</th>
                <th className="px-4 py-2.5">Config</th>
                <th className="px-4 py-2.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((d) => (
                <tr key={d.id} className="border-b border-border/50 last:border-0 hover:bg-bg-200/40">
                  <td className="px-4 py-2.5 text-text-200 font-mono text-xs">{d.id}</td>
                  <td className="px-4 py-2.5">{badge(d.tipo_radar)}</td>
                  <td className="px-4 py-2.5 text-text-100 font-medium">{d.modelo}</td>
                  <td className="px-4 py-2.5 text-text-200">{d.serial || "—"}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                        d.status ? "text-emerald-400" : "text-text-200"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          d.status ? "bg-emerald-400" : "bg-text-200"
                        }`}
                      />
                      {d.status ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-text-200">
                    {empresasMap.get(d.id_empresa) ?? `Empresa #${d.id_empresa}`}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-bg-200 border border-border text-[11px] font-mono text-text-200">
                      {configKeyCount(d.config)} campos
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setModal({ abierto: true, editing: d })}
                        className="p-1.5 rounded-lg text-text-200 hover:text-text-100 hover:bg-bg-200 transition"
                        aria-label="Editar"
                      >
                        <IconPencil size={15} stroke={1.5} />
                      </button>
                      <button
                        onClick={() => setBorrar(d)}
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition"
                        aria-label="Eliminar"
                      >
                        <IconTrash size={15} stroke={1.5} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal crear/editar */}
      {modal.abierto && (
        <DispositivoFormModal
          editing={modal.editing}
          tipos={tipos}
          empresas={empresas}
          onClose={() => setModal({ abierto: false, editing: null })}
        />
      )}

      {/* Confirmación de borrado */}
      {borrar &&
        createPortal(
          <div
            className="fixed inset-0 z-99999 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && setBorrar(null)}
          >
            <div className="bg-bg-100 border border-border rounded-xl shadow-2xl w-full max-w-sm mx-4 p-5">
              <h3 className="text-sm font-semibold text-text-100">Eliminar dispositivo</h3>
              <p className="text-xs text-text-200 mt-2">
                ¿Seguro que deseas eliminar{" "}
                <span className="font-mono text-text-100">
                  {borrar.modelo}{borrar.serial ? ` · ${borrar.serial}` : ""}
                </span>{" "}
                (#{borrar.id})?
              </p>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="ghost" onClick={() => setBorrar(null)}>
                  Cancelar
                </Button>
                <Button
                  variant="danger"
                  isLoading={deleteMut.isPending}
                  onClick={() =>
                    deleteMut.mutate(borrar.id, { onSuccess: () => setBorrar(null) })
                  }
                >
                  Eliminar
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

export default DispositivosPage;