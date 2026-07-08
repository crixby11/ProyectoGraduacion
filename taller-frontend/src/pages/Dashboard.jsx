import { useQuery } from '@tanstack/react-query'
import { getDashboard } from '../api/dashboard'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  DollarSign, ClipboardList, Package, Trophy,
  TrendingUp, AlertTriangle, Truck, Plus,
  CalendarDays, ArrowRight, Clock,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { fmtDate, fmtTime } from '../utils/date'
import StatusBadge from '../components/ui/StatusBadge'

const fmt = (n) =>
  `Lps ${Number(n ?? 0).toLocaleString('es-HN', { minimumFractionDigits: 0 })}`

// Capitaliza solo la primera letra de la cadena (no cada palabra)
const capFirst = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 18) return 'Buenas tardes'
  return 'Buenas noches'
}

// ── KPI Card ───────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, sub, color = 'blue' }) {
  const palette = {
    blue:   { soft: 'bg-blue-50',    icon: 'text-blue-500',    ring: 'ring-blue-100'    },
    green:  { soft: 'bg-emerald-50', icon: 'text-emerald-500', ring: 'ring-emerald-100' },
    yellow: { soft: 'bg-amber-50',   icon: 'text-amber-500',   ring: 'ring-amber-100'   },
    purple: { soft: 'bg-violet-50',  icon: 'text-violet-500',  ring: 'ring-violet-100'  },
  }
  const c = palette[color] ?? palette.blue
  return (
    <div className="card p-5 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">{label}</p>
          <p className="text-2xl font-bold mt-2 leading-none text-gray-800 truncate">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1.5 truncate">{sub}</p>}
        </div>
        <div className={`p-2.5 rounded-2xl ${c.soft} ring-1 ${c.ring} shrink-0`}>
          <Icon size={19} className={c.icon} />
        </div>
      </div>
    </div>
  )
}

// ── OT status row con mini barra de progreso ───────────────────────────────
const OT_CFG = {
  recibido:    { label: 'Recibido',    bar: 'bg-blue-400'    },
  diagnostico: { label: 'Diagnóstico', bar: 'bg-violet-400'  },
  en_progreso: { label: 'En progreso', bar: 'bg-amber-400'   },
  listo:       { label: 'Listo',       bar: 'bg-emerald-400' },
}

function OtStatusRow({ status, count, total }) {
  const n   = parseInt(count) || 0
  const pct = total > 0 ? Math.min(100, Math.round((n / total) * 100)) : 0
  const cfg = OT_CFG[status] ?? { label: status, bar: 'bg-gray-400' }
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-gray-600">{cfg.label}</span>
        <span className="text-sm font-bold text-gray-800 tabular-nums">{n}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${cfg.bar} rounded-full transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ── Appointment STATUS badge colors ───────────────────────────────────────
const APT_DOT = {
  programada:  'bg-blue-400',
  confirmada:  'bg-emerald-400',
  completada:  'bg-gray-300',
  cancelada:   'bg-red-400',
  no_presente: 'bg-orange-400',
}
const APT_LABEL = {
  programada:  'Programada',
  confirmada:  'Confirmada',
  completada:  'Completada',
  cancelada:   'Cancelada',
  no_presente: 'No presente',
}

// ══════════════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const { user } = useAuth()
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn:  () => getDashboard().then((r) => r.data),
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
  const statuses   = ['recibido', 'diagnostico', 'en_progreso', 'listo']
  const totalOpen  = statuses.reduce((s, k) => s + (parseInt(d.ots_by_status?.[k]) || 0), 0)
  const chartData  = (d.revenue_chart ?? []).map((r) => ({
    date:  r.date?.slice(5),
    total: Number(r.total),
  }))

  const firstName    = user?.name ? user.name.trim().split(/\s+/)[0] : null
  const hasOverdue   = (d.overdue_work_orders?.length  ?? 0) > 0
  const hasDelivery  = (d.deliveries_today?.length     ?? 0) > 0
  const hasApts      = (d.appointments_today?.length   ?? 0) > 0

  return (
    <div className="space-y-6">

      {/* ── Encabezado ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {getGreeting()}{firstName ? `, ${firstName}` : ''}
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {capFirst(new Date().toLocaleDateString('es-HN', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
            }))}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/work-orders" className="btn-primary">
            <Plus size={15} /> Nueva OT
          </Link>
          <Link to="/calendar" className="btn-secondary">
            <CalendarDays size={15} /> Calendario
          </Link>
        </div>
      </div>

      {/* ── KPIs ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={DollarSign}   label="Ingresos hoy"    value={fmt(d.revenue?.today)}  color="green"  />
        <KpiCard icon={TrendingUp}   label="Ingresos semana" value={fmt(d.revenue?.week)}   color="blue"   />
        <KpiCard icon={DollarSign}   label="Ingresos mes"    value={fmt(d.revenue?.month)}  color="purple" />
        <KpiCard
          icon={ClipboardList}
          label="OTs abiertas"
          value={d.open_work_orders ?? 0}
          sub={totalOpen > 0 ? `${totalOpen} en proceso activo` : 'Sin órdenes activas'}
          color="yellow"
        />
      </div>

      {/* ── Gráfica + Panel derecho ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Área chart */}
        <div className="card p-5 lg:col-span-2">
          <div className="mb-5">
            <h2 className="text-base font-semibold text-gray-800">Ingresos</h2>
            <p className="text-xs text-gray-400 mt-0.5">Últimos 30 días</p>
          </div>

          {chartData.length === 0 ? (
            <div className="h-52 flex flex-col items-center justify-center gap-2 text-gray-200">
              <TrendingUp size={36} strokeWidth={1} />
              <span className="text-sm text-gray-400">Sin datos de ingresos aún</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  width={38}
                />
                <Tooltip
                  formatter={(v) => [fmt(v), 'Total']}
                  labelStyle={{ fontSize: 12, color: '#374151' }}
                  contentStyle={{
                    borderRadius: 10,
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 4px 16px rgba(0,0,0,.07)',
                    fontSize: 12,
                  }}
                  cursor={{ stroke: '#e5e7eb', strokeWidth: 1 }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  fill="url(#gradRevenue)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#6366f1', strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Panel derecho */}
        <div className="space-y-4">

          {/* Estado OTs */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-800">Estado de OTs</h2>
              {totalOpen > 0 && (
                <span className="text-xs font-semibold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">
                  {totalOpen} total
                </span>
              )}
            </div>
            <div className="space-y-3.5">
              {statuses.map((s) => (
                <OtStatusRow
                  key={s}
                  status={s}
                  count={d.ots_by_status?.[s] ?? 0}
                  total={totalOpen}
                />
              ))}
            </div>
            <Link
              to="/work-orders"
              className="mt-4 flex items-center justify-center gap-1.5 text-xs font-semibold text-primary-600 hover:text-primary-700 transition-colors py-1"
            >
              Ver todas las OTs <ArrowRight size={12} />
            </Link>
          </div>

          {/* Técnico del mes */}
          {d.top_employee && (
            <div className="card p-4 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 border-amber-100">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 rounded-lg bg-amber-100">
                  <Trophy size={14} className="text-amber-600" />
                </div>
                <span className="text-[11px] font-bold text-amber-700 uppercase tracking-widest">
                  Técnico del mes
                </span>
              </div>
              <p className="font-semibold text-gray-900 text-[15px] mt-2 leading-tight">
                {d.top_employee.name}
              </p>
              <div className="mt-1.5 flex items-center gap-3 text-xs text-gray-500">
                <span>{Number(d.top_employee.total_hours).toFixed(1)} hrs</span>
                <span className="text-gray-200">·</span>
                <span className="text-emerald-600 font-semibold">{fmt(d.top_employee.total_revenue)}</span>
              </div>
            </div>
          )}

          {/* Alerta stock bajo */}
          {(d.low_stock_count ?? 0) > 0 && (
            <Link
              to="/inventory?low_stock=1"
              className="card p-4 flex items-center gap-3 border-l-4 border-amber-400 hover:bg-amber-50 transition-colors group"
            >
              <div className="p-2 rounded-xl bg-amber-50 group-hover:bg-amber-100 transition-colors shrink-0">
                <Package size={16} className="text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">Stock bajo</p>
                <p className="text-xs text-gray-500">{d.low_stock_count} repuesto(s) por reponer</p>
              </div>
              <ArrowRight size={14} className="text-gray-300 group-hover:text-amber-500 transition-colors shrink-0" />
            </Link>
          )}
        </div>
      </div>

      {/* ── Alerta OTs vencidas ─────────────────────────────────────────── */}
      {hasOverdue && (
        <div className="card p-5 border-l-4 border-red-400">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-1.5 rounded-lg bg-red-50">
              <AlertTriangle size={15} className="text-red-500" />
            </div>
            <h2 className="text-base font-semibold text-gray-800">Entrega vencida</h2>
            <span className="ml-auto text-xs font-bold text-white bg-red-500 rounded-full px-2 py-0.5 tabular-nums">
              {d.overdue_work_orders.length}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {d.overdue_work_orders.map((ot) => (
              <Link
                key={ot.id}
                to={`/work-orders/${ot.id}`}
                className="flex items-center gap-3 p-3 rounded-xl border border-red-100 bg-red-50/60 hover:bg-red-100 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900 truncate">{ot.number}</p>
                  <p className="text-xs text-gray-500 truncate">{ot.customer_name ?? '—'}</p>
                </div>
                <div className="text-right shrink-0 space-y-1">
                  <p className="text-xs text-red-600 font-medium whitespace-nowrap">{fmtDate(ot.promised_at)}</p>
                  <StatusBadge status={ot.status} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Citas hoy + Entregas hoy ────────────────────────────────────── */}
      {(hasApts || hasDelivery) && (
        <div className={`grid grid-cols-1 gap-6 ${hasApts && hasDelivery ? 'lg:grid-cols-2' : ''}`}>

          {/* Citas de hoy */}
          {hasApts && (
            <div className="card p-5">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="p-1.5 rounded-lg bg-blue-50">
                  <Clock size={15} className="text-blue-500" />
                </div>
                <h2 className="text-base font-semibold text-gray-800">Citas hoy</h2>
                <span className="ml-auto text-xs font-bold text-white bg-blue-500 rounded-full px-2 py-0.5 tabular-nums">
                  {d.appointments_today.length}
                </span>
              </div>
              <div className="space-y-2">
                {d.appointments_today.map((apt) => {
                  const name = apt.customer?.name || apt.customer_name || 'Sin nombre'
                  const dot  = APT_DOT[apt.status]  ?? 'bg-gray-300'
                  const lbl  = APT_LABEL[apt.status] ?? apt.status
                  return (
                    <Link
                      key={apt.id}
                      to="/appointments"
                      className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/50 transition-colors"
                    >
                      {/* Hora */}
                      <div className="text-xs font-semibold text-gray-500 tabular-nums w-16 shrink-0">
                        {fmtTime(apt.start_at)}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900 truncate">{apt.title || name}</p>
                        <p className="text-xs text-gray-400 truncate">
                          {apt.vehicle?.plate
                            ? `${apt.vehicle.plate}${apt.vehicle.brand ? ` · ${apt.vehicle.brand}` : ''}`
                            : name}
                        </p>
                      </div>
                      {/* Estado */}
                      <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500 shrink-0">
                        <span className={`w-2 h-2 rounded-full ${dot}`} />
                        {lbl}
                      </span>
                    </Link>
                  )
                })}
              </div>
              <Link
                to="/calendar"
                className="mt-3 flex items-center justify-center gap-1.5 text-xs font-semibold text-primary-600 hover:text-primary-700 transition-colors py-1"
              >
                Ver calendario <ArrowRight size={12} />
              </Link>
            </div>
          )}

          {/* Entregas prometidas hoy */}
          {hasDelivery && (
            <div className="card p-5">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="p-1.5 rounded-lg bg-blue-50">
                  <Truck size={15} className="text-blue-500" />
                </div>
                <h2 className="text-base font-semibold text-gray-800">Entregas hoy</h2>
                <span className="ml-auto text-xs font-bold text-white bg-blue-500 rounded-full px-2 py-0.5 tabular-nums">
                  {d.deliveries_today.length}
                </span>
              </div>
              <div className="space-y-2">
                {d.deliveries_today.map((ot) => (
                  <Link
                    key={ot.id}
                    to={`/work-orders/${ot.id}`}
                    className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-primary-200 hover:bg-primary-50/60 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900 truncate">{ot.number}</p>
                      <p className="text-xs text-gray-500 truncate">{ot.customer_name}</p>
                      {(ot.vehicle_plate || ot.vehicle_brand) && (
                        <p className="text-xs text-gray-400 truncate">
                          {[ot.vehicle_plate, ot.vehicle_brand, ot.vehicle_model].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                    <StatusBadge status={ot.status} />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
