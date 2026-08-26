import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line,
} from 'recharts'
import { BarChart2, Trophy, Clock, DollarSign, Gift } from 'lucide-react'
import { getEmployeeStats } from '../api/employees'
import { fmtMoney } from '../utils/date'
import PageHeader from '../components/ui/PageHeader'

const PERIODS = [
  { value: 'month',   label: 'Este mes' },
  { value: 'quarter', label: 'Últimos 3 meses' },
  { value: 'half',    label: 'Últimos 6 meses' },
  { value: 'year',    label: 'Este año' },
]

const MONTHS_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const fmtMonth = (yyyyMm) => {
  if (!yyyyMm) return ''
  const [y, m] = yyyyMm.split('-')
  return `${MONTHS_ES[parseInt(m, 10) - 1]} ${y.slice(2)}`
}
const fmtH = (n) => `${Number(n ?? 0).toFixed(1)} h`

const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#84cc16']

/* Tooltip personalizado */
function CustomTooltip({ active, payload, label, type }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs min-w-[140px]">
      <p className="font-semibold text-gray-700 mb-1.5">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
            <span className="text-gray-500">{p.name}</span>
          </span>
          <span className="font-semibold text-gray-800">
            {type === 'revenue' ? fmtMoney(p.value) : type === 'hours' ? fmtH(p.value) : p.value}
            {type === 'ots' ? ' OT' : ''}
          </span>
        </div>
      ))}
    </div>
  )
}

/* Tarjeta de ranking */
function RankCard({ rank, employee, metric, metricLabel, metricFmt }) {
  const medals = ['🥇', '🥈', '🥉']
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 hover:border-primary-100 hover:bg-primary-50/30 transition-colors">
      <span className="text-xl w-7 text-center shrink-0">
        {rank <= 3 ? medals[rank - 1] : <span className="text-sm font-bold text-gray-400">#{rank}</span>}
      </span>
      <div className="flex-1 min-w-0">
        <Link to={`/employees/${employee.id}`} className="text-sm font-semibold text-gray-800 hover:text-primary-600 truncate block">
          {employee.name}
        </Link>
        {employee.specialty && <p className="text-xs text-gray-400 truncate">{employee.specialty}</p>}
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-bold text-primary-700">{metricFmt(metric)}</p>
        <p className="text-[10px] text-gray-400">{metricLabel}</p>
      </div>
    </div>
  )
}

export default function EmployeeStats() {
  const [period, setPeriod] = useState('month')
  const [chartMetric, setChartMetric] = useState('revenue')

  const { data, isLoading } = useQuery({
    queryKey: ['employee-stats', period],
    queryFn: () => getEmployeeStats({ period }).then((r) => r.data),
  })

  const ranking = data?.ranking ?? []
  const monthlyTrend = data?.monthly_trend ?? []

  /* Transformar tendencia mensual a formato recharts:
     [{ month, Empleado1: n, Empleado2: n, ... }] */
  const { trendData, trendEmployees } = useMemo(() => {
    const months = [...new Set(monthlyTrend.map((r) => r.month))].sort()
    const employees = [...new Map(monthlyTrend.map((r) => [r.employee_id, r.name])).entries()]

    const trendData = months.map((m) => {
      const row = { month: fmtMonth(m) }
      employees.forEach(([eid, ename]) => {
        const entry = monthlyTrend.find((r) => r.month === m && r.employee_id === eid)
        const value = chartMetric === 'revenue' ? entry?.revenue : chartMetric === 'hours' ? entry?.hours : entry?.ot_count
        row[ename] = Number(value ?? 0)
      })
      return row
    })
    return { trendData, trendEmployees: employees.map(([, n]) => n) }
  }, [monthlyTrend, chartMetric])

  /* KPI totales del período */
  const totals = useMemo(() => ({
    revenue: ranking.reduce((s, e) => s + Number(e.total_revenue), 0),
    hours:   ranking.reduce((s, e) => s + Number(e.total_hours), 0),
    bonuses: ranking.reduce((s, e) => s + Number(e.total_bonuses), 0),
    ots:     ranking.reduce((s, e) => s + Number(e.ot_count), 0),
  }), [ranking])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Estadísticas de Empleados"
        icon={BarChart2}
        subtitle="Productividad y rendimiento del equipo"
        action={
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  period === p.value
                    ? 'bg-white text-gray-800 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        }
      />

      {/* KPIs globales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Ingresos generados', value: fmtMoney(totals.revenue), icon: DollarSign, color: 'bg-blue-500' },
          { label: 'Horas trabajadas',   value: fmtH(totals.hours),  icon: Clock,       color: 'bg-emerald-500' },
          { label: 'OTs atendidas',      value: totals.ots,           icon: Trophy,      color: 'bg-amber-500' },
          { label: 'Total bonos',        value: fmtMoney(totals.bonuses),  icon: Gift,        color: 'bg-violet-500' },
        ].map((k) => (
          <div key={k.label} className="card p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${k.color} flex items-center justify-center shrink-0`}>
              <k.icon size={18} className="text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{k.label}</p>
              <p className="text-lg font-bold text-gray-800 tabular-nums">{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ranking por ingresos */}
        <div className="card p-4">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Trophy size={15} className="text-amber-500" /> Ranking por ingresos
          </h3>
          {isLoading ? (
            <p className="text-sm text-gray-400 py-8 text-center">Cargando...</p>
          ) : !ranking.length ? (
            <p className="text-sm text-gray-400 py-8 text-center">Sin datos para este período</p>
          ) : (
            <div className="space-y-2">
              {ranking.map((e, i) => (
                <RankCard
                  key={e.id} rank={i + 1} employee={e}
                  metric={e.total_revenue} metricLabel="ingresos" metricFmt={fmtMoney}
                />
              ))}
            </div>
          )}
        </div>

        {/* Ranking por horas */}
        <div className="card p-4">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Clock size={15} className="text-blue-500" /> Ranking por horas trabajadas
          </h3>
          {isLoading ? (
            <p className="text-sm text-gray-400 py-8 text-center">Cargando...</p>
          ) : !ranking.length ? (
            <p className="text-sm text-gray-400 py-8 text-center">Sin datos para este período</p>
          ) : (
            <div className="space-y-2">
              {[...ranking].sort((a, b) => b.total_hours - a.total_hours).map((e, i) => (
                <RankCard
                  key={e.id} rank={i + 1} employee={e}
                  metric={e.total_hours} metricLabel="horas" metricFmt={fmtH}
                />
              ))}
            </div>
          )}
        </div>

        {/* Ranking por OTs trabajadas */}
        <div className="card p-4">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <BarChart2 size={15} className="text-emerald-500" /> Ranking por OTs trabajadas
          </h3>
          {isLoading ? (
            <p className="text-sm text-gray-400 py-8 text-center">Cargando...</p>
          ) : !ranking.length ? (
            <p className="text-sm text-gray-400 py-8 text-center">Sin datos para este período</p>
          ) : (
            <div className="space-y-2">
              {[...ranking].sort((a, b) => b.ot_count - a.ot_count).map((e, i) => (
                <RankCard
                  key={e.id} rank={i + 1} employee={e}
                  metric={e.ot_count} metricLabel="OTs" metricFmt={(n) => `${n}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Gráfica comparativa mensual */}
      {trendData.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Tendencia mensual (últimos 6 meses)</h3>
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
              {[
                { value: 'revenue', label: 'Ingresos' },
                { value: 'hours',   label: 'Horas' },
                { value: 'ots',     label: 'OTs' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setChartMetric(opt.value)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    chartMetric === opt.value ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trendData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={55}
                tickFormatter={(v) => chartMetric === 'revenue' ? `${(v/1000).toFixed(0)}k` : chartMetric === 'hours' ? `${v}h` : v}
              />
              <Tooltip content={<CustomTooltip type={chartMetric} />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {trendEmployees.map((name, i) => (
                <Line
                  key={name} type="monotone" dataKey={name}
                  stroke={COLORS[i % COLORS.length]} strokeWidth={2}
                  dot={{ r: 3 }} activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Gráfica de barras comparativa por empleado */}
      {ranking.length > 0 && (
        <div className="card p-4">
          <h3 className="font-semibold text-gray-800 mb-4">Comparativa de ingresos por empleado</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={ranking.map((e) => ({ name: e.name.split(' ')[0], revenue: Number(e.total_revenue), hours: Number(e.total_hours) }))}
              margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={55}
                tickFormatter={(v) => `${(v/1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip type="revenue" />} />
              <Bar dataKey="revenue" name="Ingresos" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
