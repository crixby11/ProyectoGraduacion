import { useState, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin  from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import allLocales from '@fullcalendar/core/locales-all'
import { Plus, ClipboardList, CalendarDays as CalendarIcon, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'
import { getAppointments, updateAppointment, sendReminder } from '../api/appointments'
import { getWorkOrders } from '../api/workOrders'
import { useConvertToOT } from '../hooks/useConvertToOT'
import PageHeader from '../components/ui/PageHeader'
import AppointmentModal, { STATUS_COLORS } from '../components/ui/AppointmentModal'

// ── Colores y etiquetas de OTs ────────────────────────────────────────────
const WO_STATUS_COLORS = {
  recibido:    '#64748b',
  diagnostico: '#8b5cf6',
  en_progreso: '#f59e0b',
  listo:       '#22c55e',
}
const WO_STATUS_LABELS = {
  recibido:    'Recibido',
  diagnostico: 'Diagnóstico',
  en_progreso: 'En progreso',
  listo:       'Listo para entregar',
}
const APT_STATUS_LABELS = {
  programada:  'Programada',
  confirmada:  'Confirmada',
  completada:  'Completada',
  cancelada:   'Cancelada',
  no_presente: 'No presente',
}

const todayStr = new Date().toISOString().slice(0, 10)

// ══════════════════════════════════════════════════════════════════════════
export default function Calendar() {
  const qc       = useQueryClient()
  const navigate = useNavigate()
  const calRef   = useRef(null)

  const [range,       setRange]       = useState({ start: null, end: null })
  const [modalOpen,   setModalOpen]   = useState(false)
  const [selected,    setSelected]    = useState(null)
  const [defaultDate, setDefaultDate] = useState(null)
  const [showApts,    setShowApts]    = useState(true)
  const [showWOs,     setShowWOs]     = useState(true)
  const [showLegend,  setShowLegend]  = useState(false)

  // end_at solo vale si es el mismo día que start_at (evita barras multi-día)
  const sameDay = useCallback((startAt, endAt) => {
    if (!endAt || !startAt) return undefined
    return endAt.slice(0, 10) === startAt?.slice(0, 10) ? endAt.slice(0, 16) : undefined
  }, [])

  // ── Queries ────────────────────────────────────────────────────────────
  const { data: appointments, isFetching: fetchingApts } = useQuery({
    queryKey: ['appointments', range],
    queryFn:  () => getAppointments({ start: range.start, end: range.end }).then(r => r.data),
    enabled:  !!(range.start && range.end),
  })

  const { data: calendarWOs, isFetching: fetchingWOs } = useQuery({
    queryKey: ['calendar-work-orders', range],
    queryFn:  () => getWorkOrders({
      promised_from: range.start?.slice(0, 10),
      promised_to:   range.end?.slice(0, 10),
      per_page: 200,
    }).then(r => r.data.data),
    enabled: !!(range.start && range.end) && showWOs,
  })

  const calendarLoading = fetchingApts || fetchingWOs

  // ── Mutations ──────────────────────────────────────────────────────────
  const remind = useMutation({
    mutationFn: id => sendReminder(id),
    onSuccess:  res => { window.open(res.data.url, '_blank'); toast.success('Abriendo WhatsApp...') },
    onError:    ()  => toast.error('No se pudo generar el enlace'),
  })

  const genOT = useConvertToOT({ onClose: handleCloseModal })

  // ── Construcción de eventos ────────────────────────────────────────────
  const aptEvents = showApts
    ? (appointments ?? []).map(apt => ({
        id:              `apt-${apt.id}`,
        title:           apt.title,
        start:           apt.start_at?.slice(0, 16),
        end:             sameDay(apt.start_at, apt.end_at), // nunca span multi-día
        backgroundColor: apt.color ?? STATUS_COLORS[apt.status] ?? STATUS_COLORS.programada,
        borderColor:     'transparent',
        extendedProps:   { _type: 'apt', ...apt },
      }))
    : []

  const woEvents = showWOs
    ? (calendarWOs ?? [])
        .filter(wo => wo.promised_at && !['entregado', 'cancelado'].includes(wo.status))
        .map(wo => {
          const isOverdue = wo.promised_at < todayStr
          const color = isOverdue ? '#ef4444' : (WO_STATUS_COLORS[wo.status] ?? '#64748b')
          return {
            id:              `wo-${wo.id}`,
            title:           `🔧 ${wo.number}${wo.customer_name ? ` · ${wo.customer_name}` : ''}`,
            start:           wo.promised_at,
            allDay:          true,
            backgroundColor: color,
            borderColor:     'transparent',
            editable:        false,   // OTs no son arrastrables
            extendedProps:   { _type: 'wo', ...wo },
          }
        })
    : []

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleCloseModal = () => {
    setModalOpen(false)
    setSelected(null)
    setDefaultDate(null)
  }

  const handleDateClick = (info) => {
    setSelected(null)
    setDefaultDate(info.dateStr?.slice(0, 10) ?? null)
    setModalOpen(true)
  }

  const handleEventClick = (info) => {
    const props = info.event.extendedProps
    if (props._type === 'wo') {
      navigate(`/work-orders/${props.id}`)
    } else {
      setSelected(props)
      setDefaultDate(null)
      setModalOpen(true)
    }
  }

  // Drag & drop: solo citas, no OTs
  const handleEventDrop = (info) => {
    const { _type, id } = info.event.extendedProps
    if (_type !== 'apt') { info.revert(); return }
    updateAppointment(id, { start_at: info.event.startStr })
      .then(() => {
        qc.invalidateQueries({ queryKey: ['appointments'] })
        toast.success('Cita reprogramada')
      })
      .catch(() => {
        info.revert()
        toast.error('No se pudo reprogramar la cita')
      })
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div>
      <PageHeader
        title="Calendario"
        icon={CalendarIcon}
        subtitle="Citas y órdenes de trabajo"
        action={
          <button onClick={() => { setSelected(null); setDefaultDate(null); setModalOpen(true) }} className="btn-primary">
            <Plus size={16} /> Nueva cita
          </button>
        }
      />

      {/* Controles de visibilidad ─────────────────────────────────────── */}
      <div className="mb-3 space-y-2">

        {/* Fila principal: toggles + botón leyenda */}
        <div className="flex items-center gap-4 flex-wrap">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={showApts} onChange={e => setShowApts(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-primary-600" />
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 shrink-0" />
            <span className="text-sm text-gray-700">Citas</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={showWOs} onChange={e => setShowWOs(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-primary-600" />
            <ClipboardList size={13} className="text-gray-400 shrink-0" />
            <span className="text-sm text-gray-700">Órdenes de trabajo</span>
          </label>

          <button
            onClick={() => setShowLegend(v => !v)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 ml-auto transition-colors"
          >
            Leyenda
            <ChevronDown size={13} className={`transition-transform ${showLegend ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Leyenda expandible */}
        {showLegend && (
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 px-3 py-2.5 bg-gray-50 rounded-xl border border-gray-100">
            {showApts && Object.entries(APT_STATUS_LABELS).map(([status, label]) => (
              <span key={status} className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: STATUS_COLORS[status] }} />
                {label}
              </span>
            ))}
            {showApts && showWOs && <span className="text-gray-200 text-xs select-none">|</span>}
            {showWOs && Object.entries(WO_STATUS_LABELS).map(([status, label]) => (
              <span key={status} className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: WO_STATUS_COLORS[status] }} />
                {label}
              </span>
            ))}
            {showWOs && (
              <span className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="w-2.5 h-2.5 rounded-sm bg-red-500 shrink-0" />
                OT vencida
              </span>
            )}
          </div>
        )}
      </div>

      {/* Calendario ──────────────────────────────────────────────────────── */}
      <div className="card p-4 relative">
        {calendarLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 rounded-2xl">
            <div className="flex items-center gap-2 text-gray-500 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
              <svg className="animate-spin w-4 h-4 text-primary-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span className="text-sm font-medium">Cargando eventos...</span>
            </div>
          </div>
        )}
        <FullCalendar
          ref={calRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
          locales={allLocales}
          locale="es"
          initialView="dayGridMonth"
          headerToolbar={{
            left:   'prev,next today',
            center: 'title',
            right:  'dayGridMonth,timeGridWeek,listWeek',
          }}
          events={[...aptEvents, ...woEvents]}
          editable={true}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          eventDrop={handleEventDrop}
          datesSet={info => setRange({ start: info.startStr, end: info.endStr })}
          height="auto"
          eventDisplay="block"
          eventBorderColor="transparent"
          eventTimeFormat={{ hour: 'numeric', minute: '2-digit', meridiem: 'short', hour12: true }}
          slotLabelFormat={{ hour: 'numeric', minute: '2-digit', meridiem: 'short', hour12: true }}
          slotMinTime="06:00:00"
          slotMaxTime="19:00:00"
          eventDidMount={info => {
            const p = info.event.extendedProps
            if (p._type === 'wo') {
              info.el.title = [
                `OT: ${p.number}`,
                p.customer_name  ? `Cliente: ${p.customer_name}`  : null,
                p.vehicle_plate  ? `Placa: ${p.vehicle_plate}`    : null,
                `Estado: ${WO_STATUS_LABELS[p.status] ?? p.status}`,
                p.promised_at
                  ? `Entrega: ${new Date(p.promised_at + 'T12:00:00').toLocaleDateString('es-HN')}`
                  : null,
              ].filter(Boolean).join('\n')
            } else {
              // Tooltip para citas
              info.el.title = [
                p.title,
                p.customer?.name || p.customer_name ? `Cliente: ${p.customer?.name || p.customer_name}` : null,
                p.vehicle?.plate ? `Vehículo: ${p.vehicle.plate}` : null,
                p.employee?.name ? `Técnico: ${p.employee.name}`  : null,
                p.notes          ? `Notas: ${p.notes}`            : null,
              ].filter(Boolean).join('\n')
            }
          }}
        />
      </div>

      {/* Modal de cita ────────────────────────────────────────────────────── */}
      <AppointmentModal
        open={modalOpen}
        onClose={handleCloseModal}
        initial={selected}
        defaultDate={defaultDate}
        onConvertToOT={selected ? () => genOT.mutate(selected) : undefined}
        onReminder={selected ? () => remind.mutate(selected.id) : undefined}
      />
    </div>
  )
}
