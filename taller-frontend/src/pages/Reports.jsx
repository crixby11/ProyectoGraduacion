import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { LineChart as LineChartIcon, DollarSign, ClipboardCheck, Receipt, ArrowUp, ArrowDown } from 'lucide-react'
import { getPerformanceReport } from '../api/reports'
import { fmtMoney } from '../utils/date'
import PageHeader from '../components/ui/PageHeader'

const PERIODS = [
  { value: 'month',   label: 'Mensual' },
  { value: 'quarter', label: 'Trimestral' },
]

const MONTHS_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function fmtBucket(bucket, period) {
  if (!bucket) return ''
  if (period === 'quarter') {
    const [y, q] = bucket.split('-Q')
    return `${q}T ${y.slice(2)}`
  }
  const [y, m] = bucket.split('-')
  return `${MONTHS_ES[parseInt(m, 10) - 1]} ${y.slice(2)}`
}

function TrendBadge({ pct, periodLabel }) {
  if (pct === null) return null
  const up = pct >= 0
  const Icon = up ? ArrowUp : ArrowDown
  return (
    <p className={`flex items-center gap-0.5 text-xs font-medium mt-1 ${up ? 'text-emerald-600' : 'text-red-500'}`}>
      <Icon size={12} />
      {Math.abs(pct).toFixed(0)}% {periodLabel}
    </p>
  )
}

function KpiCard({ icon: Icon, label, value, trend, periodLabel }) {
  return (
    <div className="card p-5 flex items-center gap-3">
      <div className="p-2.5 rounded-2xl bg-gray-50 border border-gray-100 shrink-0">
        <Icon size={19} className="text-gray-500" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">{label}</p>
        <p className="text-xl font-bold mt-1 text-gray-800 truncate">{value}</p>
        <TrendBadge pct={trend ?? null} periodLabel={periodLabel} />
      </div>
    </div>
  )
}

function ComboTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const revenue = payload.find((p) => p.dataKey === 'revenue')?.value
  const ots = payload.find((p) => p.dataKey === 'ot_count')?.value
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs space-y-1 min-w-[150px]">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      <p className="flex items-center justify-between gap-4 text-gray-500">
        Ingresos <span className="font-semibold text-gray-800">{fmtMoney(revenue)}</span>
      </p>
      <p className="flex items-center justify-between gap-4 text-gray-500">
        Autos entregados <span className="font-semibold text-gray-800">{ots}</span>
      </p>
    </div>
  )
}

export default function Reports() {
  const [period, setPeriod] = useState('month')

  const { data, isLoading } = useQuery({
    queryKey: ['reports-performance', period],
    queryFn: () => getPerformanceReport({ period }).then((r) => r.data),
  })

  const rows = data?.data ?? []

  const chartData = useMemo(
    () => rows.map((r) => ({
      bucket: fmtBucket(r.bucket, period),
      revenue: Number(r.revenue),
      ot_count: Number(r.ot_count),
    })),
    [rows, period]
  )

  const totals = useMemo(() => ({
    revenue: rows.reduce((s, r) => s + Number(r.revenue), 0),
    ots: rows.reduce((s, r) => s + Number(r.ot_count), 0),
  }), [rows])

  const avgTicket = totals.ots > 0 ? totals.revenue / totals.ots : 0

  const pctChange = (curr, prev) => {
    if (prev > 0) return ((curr - prev) / prev) * 100
    return curr > 0 ? 100 : 0
  }
  const trend = useMemo(() => {
    if (rows.length < 2) return { revenue: null, ots: null }
    const last = rows[rows.length - 1]
    const prev = rows[rows.length - 2]
    return {
      revenue: pctChange(Number(last.revenue), Number(prev.revenue)),
      ots: pctChange(Number(last.ot_count), Number(prev.ot_count)),
    }
  }, [rows])
  const trendLabel = period === 'quarter' ? 'vs trimestre anterior' : 'vs mes anterior'

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reportes del Taller"
        icon={LineChartIcon}
        subtitle="Rendimiento general de ingresos y autos entregados"
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          icon={DollarSign}
          label={period === 'quarter' ? 'Ingresos (últimos 8 trimestres)' : 'Ingresos (últimos 12 meses)'}
          value={fmtMoney(totals.revenue)}
          trend={trend.revenue}
          periodLabel={trendLabel}
        />
        <KpiCard
          icon={ClipboardCheck}
          label="Autos entregados"
          value={totals.ots}
          trend={trend.ots}
          periodLabel={trendLabel}
        />
        <KpiCard
          icon={Receipt}
          label="Ticket promedio"
          value={fmtMoney(avgTicket)}
        />
      </div>

      <div className="card p-4">
        <h3 className="font-semibold text-gray-800 mb-4">
          Ingresos y autos entregados por {period === 'quarter' ? 'trimestre' : 'mes'}
        </h3>
        {isLoading ? (
          <p className="text-sm text-gray-400 py-16 text-center">Cargando...</p>
        ) : !chartData.length ? (
          <p className="text-sm text-gray-400 py-16 text-center">Sin datos aún</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis
                yAxisId="revenue"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                width={45}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <YAxis
                yAxisId="ots"
                orientation="right"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                width={30}
                allowDecimals={false}
              />
              <Tooltip content={<ComboTooltip />} />
              <Bar yAxisId="revenue" dataKey="revenue" name="Ingresos" fill="#1f2937" radius={[4, 4, 0, 0]} barSize={22} />
              <Line yAxisId="ots" dataKey="ot_count" name="Autos entregados" stroke="#9ca3af" strokeWidth={2} dot={{ r: 3, fill: '#9ca3af' }} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
