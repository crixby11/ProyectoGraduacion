import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { LineChart as LineChartIcon, DollarSign, ClipboardCheck, Receipt } from 'lucide-react'
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

function KpiCard({ icon: Icon, label, value, color }) {
  const palette = {
    blue:   { soft: 'bg-blue-50',    icon: 'text-blue-500'    },
    green:  { soft: 'bg-emerald-50', icon: 'text-emerald-500' },
    purple: { soft: 'bg-violet-50',  icon: 'text-violet-500'  },
  }
  const c = palette[color] ?? palette.blue
  return (
    <div className="card p-5 flex items-center gap-3">
      <div className={`p-2.5 rounded-2xl ${c.soft} shrink-0`}>
        <Icon size={19} className={c.icon} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">{label}</p>
        <p className="text-xl font-bold mt-1 text-gray-800 truncate">{value}</p>
      </div>
    </div>
  )
}

function RevenueTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      <p className="text-gray-500">Ingresos: <span className="font-semibold text-gray-800">{fmtMoney(payload[0].value)}</span></p>
    </div>
  )
}

function OtTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      <p className="text-gray-500">Autos entregados: <span className="font-semibold text-gray-800">{payload[0].value}</span></p>
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
          color="green"
        />
        <KpiCard
          icon={ClipboardCheck}
          label="Autos entregados"
          value={totals.ots}
          color="blue"
        />
        <KpiCard
          icon={Receipt}
          label="Ticket promedio"
          value={fmtMoney(avgTicket)}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-4">
          <h3 className="font-semibold text-gray-800 mb-4">Ingresos por {period === 'quarter' ? 'trimestre' : 'mes'}</h3>
          {isLoading ? (
            <p className="text-sm text-gray-400 py-16 text-center">Cargando...</p>
          ) : !chartData.length ? (
            <p className="text-sm text-gray-400 py-16 text-center">Sin datos aún</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={55}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<RevenueTooltip />} />
                <Bar dataKey="revenue" name="Ingresos" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card p-4">
          <h3 className="font-semibold text-gray-800 mb-4">Autos entregados por {period === 'quarter' ? 'trimestre' : 'mes'}</h3>
          {isLoading ? (
            <p className="text-sm text-gray-400 py-16 text-center">Cargando...</p>
          ) : !chartData.length ? (
            <p className="text-sm text-gray-400 py-16 text-center">Sin datos aún</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={35} allowDecimals={false} />
                <Tooltip content={<OtTooltip />} />
                <Bar dataKey="ot_count" name="Autos entregados" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
