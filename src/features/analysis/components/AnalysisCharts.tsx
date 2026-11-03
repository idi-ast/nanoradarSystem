import { useMemo } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { OperationalAnalysis } from '@/features/history/reportAnalytics';
import { isNight } from '@/features/history/reportAnalytics';

const axis = { fill: 'var(--color-text-200)', fontSize: 11 };
const tooltipStyle = { backgroundColor: 'var(--color-bg-100)', border: '1px solid var(--color-border)', borderRadius: 8, color: 'var(--color-text-100)' };
export function HourlyActivityChart({ analysis }: { analysis: OperationalAnalysis }) {
  const data = useMemo(() => analysis.hourly.map(h => ({ ...h, label: `${String(h.hour).padStart(2, '0')}:00` })), [analysis.hourly]);
  return <div className="h-72 w-full min-w-0" role="img" aria-label="Gráfico de inicios de tracks por hora de Chile, comparados con embarcaciones clasificadas">
    <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 600, height: 288 }}><BarChart data={data} margin={{ top: 15, right: 8, left: 0, bottom: 0 }}>
      <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
      <XAxis dataKey="label" tick={axis} minTickGap={22} axisLine={false} tickLine={false} />
      <YAxis allowDecimals={false} tick={axis} width={38} axisLine={false} tickLine={false} />
      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(148,163,184,.1)' }} />
      <Legend wrapperStyle={{ fontSize: 12 }} />
      <Bar name="Inicios de todos los tracks" dataKey="starts" fill="#38bdf8" radius={[3, 3, 0, 0]} isAnimationActive={false} />
      <Bar name="Embarcaciones clasificadas" dataKey="boatStarts" fill="#2dd4bf" radius={[3, 3, 0, 0]} isAnimationActive={false} />
    </BarChart></ResponsiveContainer>
  </div>;
}
export function DailyActivityChart({ analysis }: { analysis: OperationalAnalysis }) {
  return <div className="h-72 w-full min-w-0" role="img" aria-label="Evolución de inicios por fecha local y presencia nocturna observada">
    <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 600, height: 288 }}><AreaChart data={analysis.days} margin={{ top: 15, right: 8, left: 0, bottom: 0 }}>
      <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
      <XAxis dataKey="day" tick={axis} tickFormatter={day => String(day).slice(5)} minTickGap={30} axisLine={false} tickLine={false} />
      <YAxis allowDecimals={false} tick={axis} width={38} axisLine={false} tickLine={false} />
      <Tooltip contentStyle={tooltipStyle} />
      <Legend wrapperStyle={{ fontSize: 12 }} />
      <Area name="Inicios de tracks" dataKey="starts" stroke="#38bdf8" fill="#38bdf8" fillOpacity={.12} strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
      <Area name="Tracks con presencia nocturna (muestra)" dataKey="nightPresent" stroke="#fbbf24" fill="#fbbf24" fillOpacity={.08} strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
    </AreaChart></ResponsiveContainer>
  </div>;
}
export function ActivityCalendar({ analysis }: { analysis: OperationalAnalysis }) {
  const max = Math.max(1, ...analysis.days.flatMap(d => d.hours));
  return <div>
    <div className="max-h-96 overflow-auto rounded-lg border border-border">
      <table className="w-full min-w-175 border-separate border-spacing-1 text-[10px]">
        <caption className="sr-only">Tracks distintos observados por día y hora local. Cero corresponde a ausencia de registros en la muestra.</caption>
        <thead className="sticky top-0 z-10 bg-bg-100"><tr><th className="px-2 py-2 text-left text-text-200">Fecha</th>{analysis.hourly.map(h => <th key={h.hour} className={isNight(h.hour, analysis.settings) ? 'text-amber-400' : 'text-text-200'}>{String(h.hour).padStart(2, '0')}</th>)}</tr></thead>
        <tbody>{analysis.days.map(day => <tr key={day.day}><th className="whitespace-nowrap px-2 py-1 text-left font-normal text-text-200">{day.day}</th>{day.hours.map((count, hour) => <td key={hour} title={`${day.day}, ${String(hour).padStart(2, '0')}:00: ${count} tracks distintos observados`} className="h-7 min-w-5 rounded-sm text-center tabular-nums" style={{ backgroundColor: count ? `rgba(14,165,233,${.2 + .8 * count / max})` : 'var(--color-bg-200)', color: count ? '#ffffff' : 'var(--color-text-300)' }}>{count || '·'}</td>)}</tr>)}</tbody>
      </table>
    </div>
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-text-200"><span>Cabeceras ámbar: noche 21:00–07:00.</span><span className="flex items-center gap-2">0 <span className="h-2 w-24 rounded bg-linear-to-r from-sky-950 to-sky-400" /> {max} tracks/celda</span></div>
  </div>;
}
