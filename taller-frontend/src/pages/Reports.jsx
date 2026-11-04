import { useState } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import {
  LineChart as LineChartIcon, DollarSign, Receipt, FileText, Wallet, ClipboardCheck, ClipboardList,
  Timer, CalendarCheck2, Calculator, CalendarX, Hourglass, Package, ArrowUp, ArrowDown,
  AlertTriangle, CheckCircle2, Info, Lightbulb,
} from 'lucide-react'
import { getPerformanceReport, downloadPerformanceReport } from '../api/reports'
import { fmtMoney } from '../utils/date'
import PageHeader from '../components/ui/PageHeader'
import ReportMenu from '../components/ui/ReportMenu'
import RangeFilter from '../components/reports/RangeFilter'
import { DEFAULT_RANGE, rangeParams } from '../components/reports/range'

const fmtPct = (n) => (n === null || n === undefined ? '—' : `${Number(n).toFixed(1)}%`)
const fmtNum = (n) => Number(n ?? 0).toLocaleString('es-HN')
const fmtK = (v) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : `${v}`)

const METHOD_LABELS = { efectivo: 'Efectivo', transferencia: 'Transferencia', tarjeta: 'Tarjeta', otro: 'Otro' }

/**
 * Variación contra el período anterior. Para porcentajes se muestra la diferencia
 * en puntos; para montos y conteos, el cambio porcentual.
 */
function variation(curr, prev, kind) {
  if (curr === null || curr === undefined || prev === null || prev === undefined) return null
  if (kind === 'rate') return { value: curr - prev, unit: 'pts' }
  if (prev === 0) return curr === 0 ? { value: 0, unit: '%' } : null
  return { value: ((curr - prev) / Math.abs(prev)) * 100, unit: '%' }
}

function Trend({ curr, prev, kind, inverse, compareLabel }) {
  const v = variation(curr, prev, kind)
  if (!v) return <p className="text-[11px] text-gray-400 mt-1">Sin dato para comparar</p>
  if (Math.abs(v.value) < 0.05) return <p className="text-[11px] text-gray-400 mt-1">Sin cambio {compareLabel}</p>
  const up = v.value > 0
  const good = inverse ? !up : up
  const Icon = up ? ArrowUp : ArrowDown
  return (
    <p className={`flex items-center gap-0.5 text-[11px] font-medium mt-1 ${good ? 'text-emerald-600' : 'text-red-500'}`}>
      <Icon size={11} />
      {Math.abs(v.value).toFixed(1)}{v.unit === 'pts' ? ' pts' : '%'}
      <span className="text-gray-400 font-normal ml-1">{compareLabel}</span>
    </p>
  )
}

function KpiCard({ icon: Icon, label, value, hint, trend }) {
  return (
    <div className="card p-4 flex items-start gap-3 min-w-0">
      <div className="p-2 rounded-xl bg-gray-50 border border-gray-100 shrink-0">
        <Icon size={17} className="text-gray-500" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
        <p className="text-lg font-bold mt-0.5 text-gray-800 truncate tabular-nums">{value}</p>
        {hint && <p className="text-[11px] text-gray-400">{hint}</p>}
        {trend}
      </div>
    </div>
  )
}

function SeriesTooltip({ active, payload, label, money }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs space-y-1 min-w-[170px]">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center justify-between gap-4 text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />{p.name}
          </span>
          <span className="font-semibold text-gray-800">{money ? fmtMoney(p.value) : p.value}</span>
        </p>
      ))}
    </div>
  )
}

const INSIGHT_STYLE = {
  bad:  { icon: AlertTriangle, cls: 'text-red-600' },
  warn: { icon: Info,          cls: 'text-amber-600' },
  good: { icon: CheckCircle2,  cls: 'text-emerald-600' },
}

/** Barra horizontal proporcional para desgloses. */
function ShareRow({ label, value, total, detail }) {
  const pct = total > 0 ? (value / total) * 100 : 0
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1 gap-2">
        <span className="text-gray-600 truncate">{label}</span>
        <span className="text-gray-800 font-semibold tabular-nums shrink-0">
          {fmtMoney(value)} <span className="text-gray-400 font-normal">· {pct.toFixed(0)}%{detail ? ` · ${detail}` : ''}</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full rounded-full bg-[#0f1e3d]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function Empty({ children = 'Sin datos en este período' }) {
  return <p className="text-sm text-gray-400 py-6 text-center">{children}</p>
}

function RankTable({ title, columns, rows }) {
  return (
    <div className="card p-4 min-w-0">
      <h3 className="font-semibold text-gray-800 mb-3">{title}</h3>
      {!rows?.length ? <Empty /> : (
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-400">
                {columns.map((c) => (
                  <th key={c.key} className={`font-semibold py-1.5 px-1 ${c.right ? 'text-right' : 'text-left'}`}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-gray-100">
                  {columns.map((c) => (
                    <td key={c.key} className={`py-1.5 px-1 ${c.right ? 'text-right tabular-nums' : ''} ${c.key === 'name' ? 'text-gray-700 font-medium' : 'text-gray-600'}`}>
                      {c.fmt ? c.fmt(r[c.key]) : r[c.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function Reports() {
  const [range, setRange] = useState(DEFAULT_RANGE)
  const [chart, setChart] = useState('money')
  const params = rangeParams(range)

  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: ['reports-performance', params],
    queryFn: () => getPerformanceReport(params).then((r) => r.data),
    placeholderData: keepPreviousData,
  })

  const k = data?.kpis
  const p = data?.previous
  const s = data?.snapshot
  const b = data?.breakdowns
  const cmp = data?.range?.compare_label ?? ''
  const series = data?.series ?? []

  const trend = (key, opts = {}) => k && p
    ? <Trend curr={k[key]} prev={p[key]} kind={opts.kind} inverse={opts.inverse} compareLabel={cmp} />
    : null

  const methodsTotal = b?.payment_methods?.reduce((sum, m) => sum + m.total, 0) ?? 0
  const mixTotal = k ? k.services_revenue + k.parts_revenue : 0
  const aging = s?.receivables

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reportes del Taller"
        icon={LineChartIcon}
        subtitle="Ingresos, operación y estado del taller en el período que elijas"
        action={
          <ReportMenu
            title="Reporte del taller"
            fileBase="reporte-taller"
            onFetch={async (format) => (await downloadPerformanceReport({ ...params, format })).data}
          />
        }
      />

      <RangeFilter value={range} onChange={setRange} info={data?.range} />

      {isError && <div className="card p-4 text-sm text-red-600">No se pudo cargar el reporte. Revise las fechas e intente de nuevo.</div>}

      {isLoading || !k ? (
        !isError && <div className="card p-10 text-center text-sm text-gray-400">Cargando reporte...</div>
      ) : (
        <div className={`space-y-6 transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
          {/* Observaciones */}
          {data.insights?.length > 0 && (
            <div className="card p-4">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Lightbulb size={16} className="text-amber-500" /> Puntos a revisar
              </h3>
              <ul className="space-y-2">
                {data.insights.map((ins, i) => {
                  const st = INSIGHT_STYLE[ins.type] ?? INSIGHT_STYLE.warn
                  return (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <st.icon size={15} className={`${st.cls} shrink-0 mt-0.5`} />
                      {ins.text}
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {/* Dinero */}
          <div>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Dinero</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <KpiCard icon={DollarSign} label="Cobrado" value={fmtMoney(k.collected)} hint="Pagos recibidos de clientes" trend={trend('collected')} />
              <KpiCard icon={FileText} label="Facturado" value={fmtMoney(k.invoiced)} hint={`${fmtNum(k.invoice_count)} factura(s) emitidas`} trend={trend('invoiced')} />
              <KpiCard icon={Receipt} label="Ticket promedio" value={fmtMoney(k.avg_ticket)} hint="Facturado ÷ facturas" trend={trend('avg_ticket')} />
              <KpiCard icon={Wallet} label="Flujo neto" value={fmtMoney(k.net_cash)} hint={`Cobrado − pagos a proveedores (${fmtMoney(k.supplier_payments)})`} trend={trend('net_cash')} />
            </div>
          </div>

          {/* Operación */}
          <div>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Operación</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <KpiCard icon={ClipboardList} label="OTs recibidas" value={fmtNum(k.ots_received)} hint={k.ots_cancelled ? `${k.ots_cancelled} cancelada(s)` : 'Trabajos que entraron'} trend={trend('ots_received')} />
              <KpiCard icon={ClipboardCheck} label="OTs entregadas" value={fmtNum(k.ots_delivered)} hint="Autos entregados al cliente" trend={trend('ots_delivered')} />
              <KpiCard icon={Timer} label="Días promedio de entrega" value={k.avg_turnaround_days ?? '—'} hint={`A tiempo: ${fmtPct(k.on_time_rate)}`} trend={trend('avg_turnaround_days', { inverse: true })} />
              <KpiCard icon={Hourglass} label="Saldo sin cobrar" value={fmtMoney(k.receivable)} hint="De lo facturado en el período" trend={trend('receivable', { inverse: true })} />
            </div>
          </div>

          {/* Clientes */}
          <div>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Clientes y ventas</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <KpiCard icon={Calculator} label="Cotizaciones aprobadas" value={fmtPct(k.conversion_rate)} hint={`${k.quotes_won} de ${k.quotes_issued} · ${fmtMoney(k.quotes_won_total)}`} trend={trend('conversion_rate', { kind: 'rate' })} />
              <KpiCard icon={CalendarCheck2} label="Citas" value={fmtNum(k.appointments)} hint={`${k.appointments_completed} completada(s) · ${k.appointments_cancelled} cancelada(s)`} trend={trend('appointments')} />
              <KpiCard icon={CalendarX} label="Citas sin presentarse" value={fmtPct(k.no_show_rate)} hint={`${k.appointments_no_show} cita(s)`} trend={trend('no_show_rate', { kind: 'rate', inverse: true })} />
              <KpiCard icon={Package} label="Margen en repuestos" value={fmtMoney(k.parts_margin)} hint={`${fmtPct(k.parts_margin_pct)} sobre ${fmtMoney(k.parts_sold)} vendidos`} trend={trend('parts_margin')} />
            </div>
          </div>

          {/* Gráfica */}
          <div className="card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <h3 className="font-semibold text-gray-800">
                {chart === 'money' ? 'Cobrado y facturado' : 'Órdenes recibidas y entregadas'} por {{ day: 'día', week: 'semana', month: 'mes' }[data.range.group]}
              </h3>
              <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                {[{ v: 'money', l: 'Dinero' }, { v: 'ots', l: 'Órdenes' }].map((o) => (
                  <button key={o.v} onClick={() => setChart(o.v)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${chart === o.v ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}>
                    {o.l}
                  </button>
                ))}
              </div>
            </div>
            {!series.length ? <Empty /> : (
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={series} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} minTickGap={8} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={45}
                    allowDecimals={chart === 'money'} tickFormatter={chart === 'money' ? fmtK : undefined} />
                  <Tooltip content={<SeriesTooltip money={chart === 'money'} />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {chart === 'money' ? (
                    <>
                      <Bar dataKey="invoiced" name="Facturado" fill="#cbd5e1" radius={[4, 4, 0, 0]} maxBarSize={28} />
                      <Bar dataKey="collected" name="Cobrado" fill="#0f1e3d" radius={[4, 4, 0, 0]} maxBarSize={28} />
                    </>
                  ) : (
                    <>
                      <Bar dataKey="ots_received" name="Recibidas" fill="#cbd5e1" radius={[4, 4, 0, 0]} maxBarSize={28} />
                      <Line dataKey="ots_delivered" name="Entregadas" stroke="#0f1e3d" strokeWidth={2} dot={{ r: 3 }} />
                    </>
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Desgloses y estado actual */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="card p-4 space-y-3">
              <h3 className="font-semibold text-gray-800">Cobros por método de pago</h3>
              {!b.payment_methods.length ? <Empty /> : b.payment_methods.map((m) => (
                <ShareRow key={m.method} label={METHOD_LABELS[m.method] ?? m.method} value={m.total} total={methodsTotal} detail={`${m.count} pago(s)`} />
              ))}
            </div>

            <div className="card p-4 space-y-3">
              <h3 className="font-semibold text-gray-800">Origen de la facturación</h3>
              {!mixTotal ? <Empty /> : (
                <>
                  <ShareRow label="Servicios (mano de obra)" value={k.services_revenue} total={mixTotal} />
                  <ShareRow label="Repuestos" value={k.parts_revenue} total={mixTotal} />
                </>
              )}
              <p className="text-[11px] text-gray-400 pt-1">
                Margen de repuestos: precio de venta menos el costo registrado al sacarlos del inventario, en órdenes entregadas.
              </p>
            </div>

            <div className="card p-4">
              <h3 className="font-semibold text-gray-800 mb-1">Estado actual del taller</h3>
              <p className="text-[11px] text-gray-400 mb-3">Hoy, sin importar el período elegido</p>
              <dl className="text-sm space-y-1.5">
                {[
                  ['OTs abiertas', s.open_total],
                  ['Recibidas / en diagnóstico', `${s.open_ots.recibido} / ${s.open_ots.diagnostico}`],
                  ['En progreso / listas', `${s.open_ots.en_progreso} / ${s.open_ots.listo}`],
                  ['OTs atrasadas', s.overdue_ots, s.overdue_ots > 0],
                  ['Repuestos con stock bajo', s.low_stock, s.low_stock > 0],
                ].map(([l, v, alert]) => (
                  <div key={l} className="flex justify-between gap-2">
                    <dt className="text-gray-500">{l}</dt>
                    <dd className={`font-semibold tabular-nums ${alert ? 'text-red-600' : 'text-gray-800'}`}>{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="border-t border-gray-100 mt-3 pt-3">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-500">Por cobrar ({aging.count} facturas)</span>
                  <span className="font-bold text-gray-800 tabular-nums">{fmtMoney(aging.total)}</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5 text-center">
                  {[
                    ['0-30 d', aging.d0_30],
                    ['31-60 d', aging.d31_60],
                    ['61-90 d', aging.d61_90],
                    ['+90 d', aging.d90plus],
                  ].map(([l, v], i) => (
                    <div key={l} className={`rounded-lg px-1 py-1.5 ${i >= 2 && v > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
                      <p className="text-[10px] text-gray-400">{l}</p>
                      <p className={`text-[11px] font-semibold tabular-nums ${i >= 2 && v > 0 ? 'text-red-600' : 'text-gray-700'}`}>{fmtK(Math.round(v))}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <RankTable
              title="Servicios más vendidos"
              rows={b.top_services}
              columns={[
                { key: 'name', label: 'Servicio' },
                { key: 'count', label: 'Veces', right: true },
                { key: 'total', label: 'Total', right: true, fmt: fmtMoney },
              ]}
            />
            <RankTable
              title="Repuestos más vendidos"
              rows={b.top_parts}
              columns={[
                { key: 'name', label: 'Repuesto' },
                { key: 'quantity', label: 'Cant.', right: true },
                { key: 'total', label: 'Total', right: true, fmt: fmtMoney },
              ]}
            />
            <RankTable
              title="Mejores clientes"
              rows={b.top_customers}
              columns={[
                { key: 'name', label: 'Cliente' },
                { key: 'total', label: 'Facturado', right: true, fmt: fmtMoney },
                { key: 'balance', label: 'Saldo', right: true, fmt: fmtMoney },
              ]}
            />
          </div>
          <p className="text-[11px] text-gray-400">
            Servicios y repuestos se cuentan en órdenes entregadas dentro del período. Clientes, por facturas emitidas.
          </p>
        </div>
      )}
    </div>
  )
}
