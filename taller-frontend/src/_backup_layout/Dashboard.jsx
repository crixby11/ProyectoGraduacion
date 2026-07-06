import { useQuery } from '@tanstack/react-query'
import { getDashboard } from '../api/dashboard'
import { Link } from 'react-router-dom'
import {
  DollarSign, ClipboardList, Package, Trophy,
  TrendingUp, Clock, CheckCircle, Truck, AlertTriangle,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { fmtDate } from '../utils/date'
import StatusBadge from '../components/ui/StatusBadge'

const fmt = (n) => `Lps ${Number(n ?? 0).toLocaleString('es-HN', { minimumFractionDigits: 0 })}`

function KpiCard({ icon: Icon, label, value, sub, color = 'blue' }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    purple: 'bg-purple-50 text-purple-600',
  }
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
        <div className={`p-2.5 rounded-xl ${colors[color]}`}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  )
}

function StatusCounter({ status, count }) {
  const labels = {
    recibido: 'Recibidos', diagnostico: 'Diagnóstico',
    en_progreso: 'En Progreso', listo: 'Listos',
    entregado: 'Entregados', cancelado: 'Cancelados',
  }
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <StatusBadge status={status} />
      <span className="font-semibold text-gray-800">{count}</span>
    </div>
  )
}

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => getDashboard().then((r) => r.data),
    refetchInterval: 60_000,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400">
        <svg className="animate-spin w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        Cargando dashboard...
      </div>
    )
  }

  const d = data ?? {}
  const statuses = ['recibido', 'diagnostico', 'en_progreso', 'listo']
  const chartData = (d.revenue_chart ?? []).map((r) => ({
    date: r.date?.slice(5),
    total: Number(r.total),
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Resumen operativo del taller</p>
      </div>

      {/* KPIs de ingresos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={DollarSign} label="Ingresos hoy" value={fmt(d.revenue?.today)} color="green" />
        <KpiCard icon={TrendingUp} label="Ingresos semana" value={fmt(d.revenue?.week)} color="blue" />
        <KpiCard icon={DollarSign} label="Ingresos mes" value={fmt(d.revenue?.month)} color="purple" />
        <KpiCard
          icon={ClipboardList}
          label="OTs abiertas"
          value={d.open_work_orders ?? 0}
          sub="Órdenes en curso"
          color="yellow"
        />
      </div>

      {/* Gráfica + Estado OTs + Top empleado */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfica de ingresos */}
        <div className="card p-5 lg:col-span-2">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Ingresos últimos 30 días</h2>
          {chartData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
              Sin datos de ingresos aún
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `Lps ${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(v) => [fmt(v), 'Total']}
                  labelStyle={{ fontSize: 12 }}
                  contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#2563eb"
                  strokeWidth={2}
                  fill="url(#colorTotal)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* OTs por estado + Top empleado */}
        <div className="space-y-4">
          <div className="card p-5">
            <h2 className="text-base font-semibold text-gray-800 mb-3">Estado de OTs</h2>
            {statuses.map((s) => (
              <StatusCounter key={s} status={s} count={d.ots_by_status?.[s] ?? 0} />
            ))}
            <Link
              to="/work-orders"
              className="block mt-3 text-center text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Ver todas →
            </Link>
          </div>

          {d.top_employee && (
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Trophy size={18} className="text-yellow-500" />
                <h2 className="text-base font-semibold text-gray-800">Técnico del mes</h2>
              </div>
              <p className="font-semibold text-gray-900">{d.top_employee.name}</p>
              <p className="text-sm text-gray-500 mt-1">
                {Number(d.top_employee.total_hours).toFixed(1)} horas trabajadas
              </p>
              <p className="text-sm text-green-600 font-medium">
                {fmt(d.top_employee.total_revenue)} generados
              </p>
            </div>
          )}

          {d.low_stock_count > 0 && (
            <Link to="/inventory?low_stock=1" className="card p-4 border-l-4 border-yellow-400 hover:bg-yellow-50 transition-colors block">
              <div className="flex items-center gap-2">
                <Package size={18} className="text-yellow-500" />
                <div>
                  <p className="text-sm font-semibold text-gray-800">Stock bajo</p>
                  <p className="text-xs text-gray-500">{d.low_stock_count} repuesto(s) por reponer</p>
                </div>
              </div>
            </Link>
          )}
        </div>
      </div>

      {/* OTs vencidas */}
      {d.overdue_work_orders?.length > 0 && (
        <div className="card p-5 border-l-4 border-red-400">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={18} className="text-red-500" />
            <h2 className="text-base font-semibold text-gray-800">
              OTs con entrega vencida ({d.overdue_work_orders.length})
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {d.overdue_work_orders.map((ot) => (
              <Link
                key={ot.id}
                to={`/work-orders/${ot.id}`}
                className="flex items-center gap-3 p-3 rounded-lg border border-red-100 bg-red-50 hover:bg-red-100 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900 truncate">{ot.number}</p>
                  <p className="text-xs text-gray-500 truncate">{ot.customer_name ?? '—'}</p>
                  <p className="text-xs text-red-600 font-medium">
                    Prometido: {fmtDate(ot.promised_at)}
                  </p>
                </div>
                <StatusBadge status={ot.status} />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Entregas del día */}
      {d.deliveries_today?.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Truck size={18} className="text-primary-600" />
            <h2 className="text-base font-semibold text-gray-800">
              Entregas prometidas hoy ({d.deliveries_today.length})
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {d.deliveries_today.map((ot) => (
              <Link
                key={ot.id}
                to={`/work-orders/${ot.id}`}
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-primary-200 hover:bg-primary-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900 truncate">{ot.number}</p>
                  <p className="text-xs text-gray-500 truncate">{ot.customer_name}</p>
                  <p className="text-xs text-gray-400">{ot.vehicle_plate} — {ot.vehicle_brand} {ot.vehicle_model}</p>
                </div>
                <StatusBadge status={ot.status} />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
