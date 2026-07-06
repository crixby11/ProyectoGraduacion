import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import {
  CalendarDays, ExternalLink, Search, Eye, FileText,
  Clock, User, Wrench, MessageCircle, Car, CalendarClock, Plus,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { getAppointments, sendReminder } from '../api/appointments'
import { getEmployees } from '../api/employees'
import { useConvertToOT } from '../hooks/useConvertToOT'
import PageHeader from '../components/ui/PageHeader'
import Modal from '../components/ui/Modal'
import AppointmentModal from '../components/ui/AppointmentModal'
import { fmtDate, fmtTime } from '../utils/date'

// ── Helpers de estado ──────────────────────────────────────────────────────
const APT_STATUS = {
  programada:  { label: 'Programada',  cls: 'bg-blue-100 text-blue-700' },
  confirmada:  { label: 'Confirmada',  cls: 'bg-emerald-100 text-emerald-700' },
  completada:  { label: 'Completada',  cls: 'bg-gray-100 text-gray-600' },
  cancelada:   { label: 'Cancelada',   cls: 'bg-red-100 text-red-600' },
  no_presente: { label: 'No presente', cls: 'bg-orange-100 text-orange-700' },
}

function AptBadge({ status }) {
  const s = APT_STATUS[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>
      {s.label}
    </span>
  )
}

// ── Períodos rápidos ───────────────────────────────────────────────────────
const todayISO   = () => new Date().toISOString().slice(0, 10)
const daysAgo    = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10)
const monthStart = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)

const PERIODS = [
  { label: 'Hoy',         start: todayISO(),    end: todayISO() },
  { label: 'Esta semana', start: daysAgo(6),    end: todayISO() },
  { label: 'Este mes',    start: monthStart(),  end: todayISO() },
  { label: 'Todo',        start: '',            end: '' },
]

// ── Fila de detalle ────────────────────────────────────────────────────────
function InfoRow({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
      <Icon size={15} className="text-gray-400 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 mb-0.5">{label}</p>
        <div className="text-sm text-gray-800">{children}</div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
export default function Appointments() {
  const qc       = useQueryClient()
  const navigate = useNavigate()

  // Filtros
  const [search,         setSearch]   = useState('')
  const [statusFilter,   setStatus]   = useState('')
  const [employeeFilter, setEmployee] = useState('')
  const [dateFrom,       setDateFrom] = useState('')
  const [dateTo,         setDateTo]   = useState('')
  const [activePeriod,   setActive]   = useState('Todo')

  // Modal detalle (solo lectura)
  const [selected,    setSelected]  = useState(null)
  const [detailOpen,  setDetail]    = useState(false)

  // Modal edición/creación (AppointmentModal)
  const [aptOpen,    setAptOpen]    = useState(false)
  const [aptInitial, setAptInitial] = useState(null)

  const applyPeriod = (p) => { setActive(p.label); setDateFrom(p.start); setDateTo(p.end) }

  const openDetail = (apt) => { setSelected(apt); setDetail(true) }
  const closeDetail = () => { setDetail(false); setSelected(null) }

  const openCreate = () => { setAptInitial(null); setAptOpen(true) }
  const openEdit   = (apt) => {
    closeDetail()
    setAptInitial(apt)
    setAptOpen(true)
  }
  const closeApt = () => { setAptOpen(false); setAptInitial(null) }

  // ── Queries ────────────────────────────────────────────────────────────
  const { data: appointments, isLoading } = useQuery({
    queryKey: ['appointments-list', { statusFilter, employeeFilter, dateFrom, dateTo }],
    queryFn:  () => getAppointments({
      status:      statusFilter   || undefined,
      employee_id: employeeFilter || undefined,
      start:       dateFrom       || undefined,
      end:         dateTo         || undefined,
    }).then(r => r.data),
  })

  const { data: employees } = useQuery({
    queryKey: ['employees-active'],
    queryFn:  () => getEmployees({ active: true, per_page: 100 }).then(r => r.data.data),
  })

  // ── Mutations ──────────────────────────────────────────────────────────
  const mutGenOT = useConvertToOT({ onClose: closeDetail })

  const mutReminder = useMutation({
    mutationFn: id => sendReminder(id),
    onSuccess:  res => { window.open(res.data.url, '_blank'); toast.success('Abriendo WhatsApp...') },
    onError:    ()  => toast.error('No se pudo generar el enlace'),
  })

  // ── Filtro local de búsqueda ───────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!appointments) return []
    if (!search.trim()) return appointments
    const q = search.toLowerCase()
    return appointments.filter(a =>
      a.title?.toLowerCase().includes(q) ||
      a.customer_name?.toLowerCase().includes(q) ||
      a.customer?.name?.toLowerCase().includes(q)
    )
  }, [appointments, search])

  // ── KPIs ───────────────────────────────────────────────────────────────
  const counts = useMemo(() => {
    const base = appointments ?? []
    return {
      programada:  base.filter(a => a.status === 'programada').length,
      confirmada:  base.filter(a => a.status === 'confirmada').length,
      completada:  base.filter(a => a.status === 'completada').length,
      cancelada:   base.filter(a => a.status === 'cancelada').length,
      no_presente: base.filter(a => a.status === 'no_presente').length,
    }
  }, [appointments])

  const canConvert = selected &&
    !selected.work_order_id &&
    ['programada', 'confirmada'].includes(selected.status)

  // ══════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-5">
      <PageHeader
        title="Citas"
        icon={CalendarDays}
        subtitle={appointments ? `${filtered.length} de ${appointments.length} citas` : ''}
        action={
          <div className="flex gap-2">
            <button onClick={openCreate} className="btn-primary flex items-center gap-2">
              <Plus size={16} /> Nueva cita
            </button>
            <Link to="/calendar" className="btn-secondary flex items-center gap-2">
              <CalendarDays size={16} /> Calendario
            </Link>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { key: 'programada',  label: 'Programadas',  cls: 'text-blue-600',    bg: 'bg-blue-50' },
          { key: 'confirmada',  label: 'Confirmadas',  cls: 'text-emerald-600', bg: 'bg-emerald-50' },
          { key: 'completada',  label: 'Completadas',  cls: 'text-gray-600',    bg: 'bg-gray-50' },
          { key: 'cancelada',   label: 'Canceladas',   cls: 'text-red-500',     bg: 'bg-red-50' },
          { key: 'no_presente', label: 'No presentes', cls: 'text-orange-600',  bg: 'bg-orange-50' },
        ].map(({ key, label, cls, bg }) => (
          <div
            key={key}
            onClick={() => setStatus(statusFilter === key ? '' : key)}
            className={`card p-4 cursor-pointer transition-all select-none
              ${statusFilter === key ? 'ring-2 ring-primary-500' : 'hover:shadow-md'} ${bg}`}
          >
            <p className="text-xs text-gray-500 mb-0.5">{label}</p>
            <p className={`text-2xl font-bold ${cls}`}>{counts[key]}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-500">Período:</span>
          {PERIODS.map(p => (
            <button
              key={p.label}
              onClick={() => applyPeriod(p)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors
                ${activePeriod === p.label
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'border-gray-200 text-gray-600 hover:border-primary-300'}`}
            >
              {p.label}
            </button>
          ))}
          <input type="date" value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); setActive('') }}
            className="input w-auto text-xs py-1" />
          <span className="text-gray-400 text-xs">—</span>
          <input type="date" value={dateTo}
            onChange={e => { setDateTo(e.target.value); setActive('') }}
            className="input w-auto text-xs py-1" />
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por título o cliente..."
              className="input pl-9 text-sm"
            />
          </div>
          <select value={employeeFilter} onChange={e => setEmployee(e.target.value)} className="input w-auto text-sm">
            <option value="">Todos los técnicos</option>
            {(employees ?? []).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>
      </div>

      {/* Tabla */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-gray-400 text-sm gap-2">
            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Cargando citas...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <CalendarDays size={36} className="mb-3 opacity-30" />
            <p className="text-sm font-medium">No hay citas en el período seleccionado</p>
            <p className="text-xs mt-1">Cambia los filtros o crea una nueva cita</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr className="text-left text-gray-500 font-medium text-xs uppercase tracking-wide">
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Hora</th>
                  <th className="px-4 py-3">Motivo</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Vehículo</th>
                  <th className="px-4 py-3">Técnico</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">OT</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(apt => {
                  const datePart     = String(apt.start_at ?? '').split('T')[0]
                  const customerName = apt.customer?.name ?? apt.customer_name ?? '—'
                  const vehicleLabel = apt.vehicle
                    ? `${apt.vehicle.plate}${apt.vehicle.brand ? ` · ${apt.vehicle.brand}` : ''}`
                    : null

                  return (
                    <tr key={apt.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-800">
                        {fmtDate(datePart)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                        {fmtTime(apt.start_at)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800 leading-tight">{apt.title}</p>
                        {apt.notes && (
                          <p className="text-xs text-gray-400 truncate max-w-[220px] mt-0.5">{apt.notes}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {apt.customer?.id
                          ? <Link to={`/customers/${apt.customer.id}`} className="hover:text-primary-600 hover:underline">{customerName}</Link>
                          : customerName}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {vehicleLabel ?? <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {apt.employee?.name ?? <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <AptBadge status={apt.status} />
                      </td>
                      <td className="px-4 py-3">
                        {apt.work_order_id
                          ? <Link to={`/work-orders/${apt.work_order_id}`} className="inline-flex items-center gap-1 text-xs text-primary-600 hover:underline font-mono">
                              Ver OT <ExternalLink size={11} />
                            </Link>
                          : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => openDetail(apt)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                          title="Ver detalle"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal detalle (solo lectura) ──────────────────────────────────── */}
      <Modal open={detailOpen} onClose={closeDetail} title="Detalle de cita" size="md">
        {selected && (
          <div className="space-y-4">
            <div className="space-y-0.5">

              <InfoRow icon={CalendarClock} label="Fecha y hora">
                <span className="font-semibold">
                  {fmtDate(String(selected.start_at ?? '').split('T')[0])}
                </span>
                <span className="text-gray-500 ml-2">{fmtTime(selected.start_at)}</span>
                {selected.end_at && (
                  <span className="text-gray-400 ml-1 text-xs">
                    → {fmtTime(selected.end_at)}
                  </span>
                )}
              </InfoRow>

              <InfoRow icon={FileText} label="Motivo">
                <span className="font-medium">{selected.title}</span>
              </InfoRow>

              <InfoRow icon={User} label="Cliente">
                {selected.customer?.id
                  ? <Link to={`/customers/${selected.customer.id}`} onClick={closeDetail}
                      className="text-primary-600 hover:underline">{selected.customer.name}</Link>
                  : (selected.customer_name ?? '—')}
                {(selected.customer_phone || selected.customer?.phone) && (
                  <span className="text-gray-400 ml-2 text-xs">
                    {selected.customer_phone || selected.customer?.phone}
                  </span>
                )}
              </InfoRow>

              {selected.vehicle && (
                <InfoRow icon={Car} label="Vehículo">
                  <span className="font-mono">{selected.vehicle.plate}</span>
                  {selected.vehicle.brand && (
                    <span className="text-gray-500 ml-2">
                      {selected.vehicle.brand}{selected.vehicle.model ? ` ${selected.vehicle.model}` : ''}
                      {selected.vehicle.year ? ` (${selected.vehicle.year})` : ''}
                    </span>
                  )}
                </InfoRow>
              )}

              <InfoRow icon={Wrench} label="Técnico">
                {selected.employee?.name ?? <span className="text-gray-400">Sin asignar</span>}
              </InfoRow>

              <InfoRow icon={Clock} label="Estado">
                <AptBadge status={selected.status} />
              </InfoRow>

              {selected.work_order_id && (
                <InfoRow icon={FileText} label="OT generada">
                  <Link to={`/work-orders/${selected.work_order_id}`} onClick={closeDetail}
                    className="text-primary-600 hover:underline font-mono text-sm flex items-center gap-1">
                    Ver orden de trabajo <ExternalLink size={12} />
                  </Link>
                </InfoRow>
              )}

              {(selected.notes || selected.description) && (
                <InfoRow icon={MessageCircle} label="Notas">
                  <p className="text-gray-600 whitespace-pre-wrap">
                    {selected.notes || selected.description}
                  </p>
                </InfoRow>
              )}
            </div>

            {/* Acciones */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100">
              <div className="flex gap-2 flex-wrap">

                {/* WhatsApp */}
                {(selected.customer_phone || selected.customer?.phone) && (
                  <button
                    type="button"
                    onClick={() => mutReminder.mutate(selected.id)}
                    disabled={mutReminder.isPending}
                    className="btn-secondary text-sm flex items-center gap-1.5"
                  >
                    <MessageCircle size={14} /> Recordatorio WA
                  </button>
                )}

                {/* Convertir en OT */}
                {canConvert && (
                  <button
                    type="button"
                    onClick={() => mutGenOT.mutate(selected)}
                    disabled={mutGenOT.isPending}
                    className="btn-primary text-sm flex items-center gap-1.5"
                  >
                    <FileText size={14} />
                    {mutGenOT.isPending ? 'Generando...' : 'Convertir en OT'}
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => openEdit(selected)}
                className="btn-secondary text-sm"
              >
                Editar cita
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── AppointmentModal (crear / editar completo) ────────────────────── */}
      <AppointmentModal
        open={aptOpen}
        onClose={closeApt}
        initial={aptInitial}
        onConvertToOT={
          aptInitial && !aptInitial.work_order_id && ['programada', 'confirmada'].includes(aptInitial?.status)
            ? () => { closeApt(); mutGenOT.mutate(aptInitial) }
            : undefined
        }
        onReminder={
          aptInitial && (aptInitial.customer_phone || aptInitial.customer?.phone)
            ? () => mutReminder.mutate(aptInitial.id)
            : undefined
        }
      />
    </div>
  )
}
