# Recharts

Libreria de graficos basada en React y D3.

## Caracteristicas

- Componentes declarativos
- Altamente personalizable
- Responsive por defecto
- TypeScript nativo

## Uso Basico

```tsx
import { LineChartWrapper, BarChartWrapper, PieChartWrapper } from "@/libs/recharts";

const data = [
  { name: "Enero", value: 400 },
  { name: "Febrero", value: 300 },
  { name: "Marzo", value: 600 },
];

function Dashboard() {
  return (
    <div>
      <LineChartWrapper
        data={data}
        dataKey="value"
        xAxisKey="name"
        height={300}
      />
      
      <BarChartWrapper
        data={data}
        dataKey="value"
        xAxisKey="name"
        height={300}
      />
      
      <PieChartWrapper
        data={data}
        dataKey="value"
        nameKey="name"
        height={300}
      />
    </div>
  );
}
```

## Con Multiples Series

```tsx
const multiData = [
  { name: "Enero", ventas: 400, gastos: 240 },
  { name: "Febrero", ventas: 300, gastos: 139 },
  { name: "Marzo", ventas: 600, gastos: 380 },
];

<LineChartWrapper
  data={multiData}
  dataKey={["ventas", "gastos"]}
  xAxisKey="name"
  colors={["#8884d8", "#82ca9d"]}
  height={300}
/>
```

## Hooks Disponibles

| Hook | Descripcion |
|------|-------------|
| `useChartDimensions` | Calcula dimensiones responsivas |
| `useChartData` | Transforma y formatea datos |

## Componentes Disponibles

| Componente | Descripcion |
|------------|-------------|
| `LineChartWrapper` | Grafico de lineas |
| `BarChartWrapper` | Grafico de barras |
| `PieChartWrapper` | Grafico circular |
| `AreaChartWrapper` | Grafico de area |
