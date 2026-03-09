import { useState } from "react";
import { IconRefresh, IconBell, IconDevices } from "@tabler/icons-react";
import {
  WidgetGrid,
  WidgetCloseButton,
  LineChartWidget,
  BarChartWidget,
  PieChartWidget,
  AreaChartWidget,
  DataTableWidget,
  StatCardWidget,
  KPIWidget,
  StatusListWidget,
  ProgressWidget,
} from "@/components/widgets";

// ─── Datos de ejemplo ─────────────────────────────────────────────────────────
const temperaturaData = [
  { hora: "00h", zona1: 22, zona2: 19, zona3: 24 },
  { hora: "04h", zona1: 21, zona2: 18, zona3: 23 },
  { hora: "08h", zona1: 24, zona2: 22, zona3: 26 },
  { hora: "12h", zona1: 28, zona2: 25, zona3: 30 },
  { hora: "16h", zona1: 27, zona2: 24, zona3: 29 },
  { hora: "20h", zona1: 25, zona2: 22, zona3: 27 },
];

const ventasData = [
  { mes: "Ene", norte: 4000, sur: 2400, este: 1800 },
  { mes: "Feb", norte: 3000, sur: 1398, este: 2200 },
  { mes: "Mar", norte: 2000, sur: 9800, este: 2900 },
  { mes: "Abr", norte: 2780, sur: 3908, este: 2000 },
  { mes: "May", norte: 1890, sur: 4800, este: 3100 },
  { mes: "Jun", norte: 2390, sur: 3800, este: 2500 },
];

const distribucionData = [
  { name: "Online", value: 63 },
  { name: "Offline", value: 22 },
  { name: "Error", value: 8 },
  { name: "Idle", value: 7 },
];

const consumoData = [
  { hora: "L", valor: 340 },
  { hora: "M", valor: 420 },
  { hora: "X", valor: 380 },
  { hora: "J", valor: 510 },
  { hora: "V", valor: 480 },
  { hora: "S", valor: 290 },
  { hora: "D", valor: 210 },
];

interface Device {
  id: string;
  nombre: string;
  tipo: string;
  ip: string;
  estado: string;
  ultima_act: string;
}

const devicesData: Device[] = [
  { id: "D-001", nombre: "Gateway Principal", tipo: "Gateway", ip: "192.168.1.1", estado: "Online", ultima_act: "hace 1m" },
  { id: "D-002", nombre: "Sensor T-001", tipo: "Temperatura", ip: "192.168.1.22", estado: "Online", ultima_act: "hace 3m" },
  { id: "D-003", nombre: "Cámara E-04", tipo: "Cámara", ip: "192.168.1.45", estado: "Error", ultima_act: "hace 2h" },
  { id: "D-004", nombre: "PLC Zona A", tipo: "PLC", ip: "192.168.1.80", estado: "Online", ultima_act: "hace 5s" },
  { id: "D-005", nombre: "HMI Panel", tipo: "HMI", ip: "192.168.1.90", estado: "Idle", ultima_act: "hace 15m" },
  { id: "D-006", nombre: "Sensor H-002", tipo: "Humedad", ip: "192.168.1.33", estado: "Warning", ultima_act: "hace 8m" },
  { id: "D-007", nombre: "Actuador V-01", tipo: "Actuador", ip: "192.168.1.55", estado: "Online", ultima_act: "hace 2m" },
  { id: "D-008", nombre: "Router Sec.", tipo: "Red", ip: "192.168.1.2", estado: "Online", ultima_act: "hace 1m" },
];

// ─── Componente ───────────────────────────────────────────────────────────────
export function WidgetsDemo() {
  const [hiddenWidgets, setHiddenWidgets] = useState<Set<string>>(new Set());

  const hide = (id: string) =>
    setHiddenWidgets((prev) => new Set([...prev, id]));

  const visible = (id: string) => !hiddenWidgets.has(id);

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-100">Dashboard de Widgets</h1>
          <p className="text-sm text-text-200 mt-0.5">
            Todos los widgets son reposicionables. Algunos pueden cerrarse con ✕.
          </p>
        </div>
        {hiddenWidgets.size > 0 && (
          <button
            className="text-xs text-brand-100 hover:underline"
            onClick={() => setHiddenWidgets(new Set())}
          >
            Restaurar todo
          </button>
        )}
      </div>

      <KPIWidget
        title="Resumen operacional"
        items={[
          { label: "Dispositivos activos", value: 142, trend: "up", color: "#8ecae0" },
          { label: "Alertas abiertas", value: 7, trend: "down", color: "#ffc658" },
          { label: "Uptime global", value: "99.8", unit: "%", target: 100 },
          { label: "Errores hoy", value: 3, trend: "neutral" },
        ]}
        columns={4}
      />

      {/* ── Fila 2: Stat cards ─────────────────────────────────────────────── */}
      <WidgetGrid columns={12} gap={16}>
        {visible("stat1") && (
          <StatCardWidget
            label="Temperatura promedio"
            value="24.5"
            unit="°C"
            trend={{ value: 2.3, direction: "up", label: "vs ayer" }}
            icon={<IconBell size={20} />}
            gridPosition={{ colSpan: 3 }}
            headerActions={<WidgetCloseButton onClose={() => hide("stat1")} />}
          />
        )}
        {visible("stat2") && (
          <StatCardWidget
            label="Dispositivos en línea"
            value={142}
            unit="/ 158"
            trend={{ value: 5, direction: "up", label: "vs última hora" }}
            icon={<IconDevices size={20} />}
            accentColor="#82ca9d"
            gridPosition={{ colSpan: 3 }}
            headerActions={<WidgetCloseButton onClose={() => hide("stat2")} />}
          />
        )}
        {visible("stat3") && (
          <StatCardWidget
            label="Alertas críticas"
            value={3}
            trend={{ value: 40, direction: "down", label: "vs semana pasada" }}
            accentColor="#f87171"
            gridPosition={{ colSpan: 3 }}
            headerActions={<WidgetCloseButton onClose={() => hide("stat3")} />}
          />
        )}
        {visible("stat4") && (
          <ProgressWidget
            title="Capacidad servidores"
            items={[
              { label: "Servidor A", value: 68, max: 100, color: "#8ecae0" },
              { label: "Servidor B", value: 91, max: 100, color: "#ffc658" },
              { label: "Servidor C", value: 43, max: 100, color: "#82ca9d" },
            ]}
            gridPosition={{ colSpan: 3 }}
            headerActions={<WidgetCloseButton onClose={() => hide("stat4")} />}
          />
        )}
      </WidgetGrid>

      {/* ── Fila 3: Gráficas principales ──────────────────────────────────── */}
      <WidgetGrid columns={12} gap={16}>
        <LineChartWidget
          title="Temperatura por zona"
          subtitle="Últimas 24 horas"
          data={temperaturaData}
          xAxisKey="hora"
          dataKey={["zona1", "zona2", "zona3"]}
          colors={["#8ecae0", "#82ca9d", "#ffc658"]}
          chartHeight={240}
          gridPosition={{ colSpan: 7 }}
          headerActions={
            <button className="p-1 rounded text-text-200 hover:text-text-100 hover:bg-bg-300 transition-colors">
              <IconRefresh size={14} />
            </button>
          }
        />

        <PieChartWidget
          title="Estado de flota"
          subtitle="En tiempo real"
          data={distribucionData}
          dataKey="value"
          nameKey="name"
          innerRadius={65}
          outerRadius={90}
          colors={["#82ca9d", "#6b7280", "#f87171", "#8ecae0"]}
          chartHeight={240}
          gridPosition={{ colSpan: 5 }}
        />
      </WidgetGrid>

      {/* ── Fila 4: Bar + Area + Status ───────────────────────────────────── */}
      <WidgetGrid columns={12} gap={16}>
        <BarChartWidget
          title="Ventas por región"
          subtitle="Últimos 6 meses"
          data={ventasData}
          xAxisKey="mes"
          dataKey={["norte", "sur", "este"]}
          colors={["#8ecae0", "#1f718e", "#3cb2dd"]}
          stacked
          chartHeight={220}
          gridPosition={{ colSpan: 5 }}
        />

        <AreaChartWidget
          title="Consumo energético"
          subtitle="Esta semana (kWh)"
          data={consumoData}
          xAxisKey="hora"
          dataKey="valor"
          colors={["#8ecae0"]}
          showLegend={false}
          chartHeight={220}
          gridPosition={{ colSpan: 4 }}
        />

        <StatusListWidget
          title="Estado de dispositivos"
          items={[
            { id: "1", label: "Gateway Principal", status: "online", value: "2ms" },
            { id: "2", label: "Sensor T-001", status: "online", value: "18s TTL" },
            { id: "3", label: "Cámara E-04", status: "error", lastSeen: "hace 2h" },
            { id: "4", label: "PLC Zona A", status: "online", value: "OK" },
            { id: "5", label: "Sensor H-002", status: "warning", lastSeen: "hace 8m" },
            { id: "6", label: "HMI Panel", status: "idle", lastSeen: "hace 15m" },
          ]}
          maxVisible={5}
          gridPosition={{ colSpan: 3 }}
        />
      </WidgetGrid>

      {/* ── Fila 5: Tabla completa ─────────────────────────────────────────── */}
      <DataTableWidget
        title="Inventario de dispositivos"
        subtitle="Todos los dispositivos registrados"
        data={devicesData}
        columns={[
          { key: "id", header: "ID", width: 80 },
          { key: "nombre", header: "Nombre" },
          { key: "tipo", header: "Tipo" },
          { key: "ip", header: "Dirección IP" },
          {
            key: "estado",
            header: "Estado",
            render: (v) => {
              const color =
                v === "Online"
                  ? "text-green-400 bg-green-400/10"
                  : v === "Error"
                  ? "text-red-400 bg-red-400/10"
                  : v === "Warning"
                  ? "text-yellow-400 bg-yellow-400/10"
                  : "text-text-400 bg-bg-300";
              return (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
                  {String(v)}
                </span>
              );
            },
          },
          { key: "ultima_act", header: "Última actividad" },
        ]}
        pageSize={5}
        striped
        hoverable
      />
    </div>
  );
}
