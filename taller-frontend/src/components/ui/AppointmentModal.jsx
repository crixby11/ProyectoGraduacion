import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { UserPlus, X, AlertTriangle, Users, User, MessageCircle, FileText, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from './Modal'
import TimePicker from './TimePicker'
import { to24h, from24h } from '../../utils/time'
import { createAppointment, updateAppointment } from '../../api/appointments'
import { getCustomers, createCustomer } from '../../api/customers'
import { getEmployees } from '../../api/employees'
import { getVehicles } from '../../api/vehicles'

// ── Colores por estado (exportado para uso en Calendar) ──────────────────
export const STATUS_COLORS = {
  programada:  '#3b82f6',
  confirmada:  '#10b981',
  completada:  '#9ca3af',
  cancelada:   '#ef4444',
  no_presente: '#f97316',
}

const DURATIONS = [
  { label: 'Sin duración específica', value: 0 },
  { label: '30 minutos',              value: 30 },
  { label: '1 hora',                  value: 60 },
  { label: '1 hora 30 min',           value: 90 },
  { label: '2 horas',                 value: 120 },
  { label: '3 horas',                 value: 180 },
  { label: '4 horas (medio día)',      value: 240 },
]

function calcDuration(startAt, endAt) {
  if (!startAt || !endAt) return 0
  try {
    const diff = Math.round((new Date(endAt) - new Date(startAt)) / 60000)
    return [30, 60, 90, 120, 180, 240].includes(diff) ? diff : 0
  } catch { return 0 }
}

// ══════════════════════════════════════════════════════════════════════════
// Props:
//   open          — boolean
//   onClose       — fn
//   initial       — objeto appointment para editar (null = crear)
//   defaultDate   — string "YYYY-MM-DD" para pre-llenar fecha al crear
//   onConvertToOT — fn opcional; si se pasa, aparece el botón "Convertir en OT"
//   onReminder    — fn opcional; si se pasa, aparece el botón "WhatsApp"
// ══════════════════════════════════════════════════════════════════════════
export default function AppointmentModal({
  open,
  onClose,
  initial = null,
  defaultDate = null,
  onConvertToOT,
  onReminder,
}) {
  const qc = useQueryClient()
  const [isWalkIn, setIsWalkIn]       = useState(false)
  const [quickCreate, setQuickCreate] = useState(false)

  const { register, handleSubmit, reset, setValue, watch, control, formState: { errors } } = useForm()
  const { register: regC, handleSubmit: handleC, reset: resetC, watch: watchC } = useForm()

  const watchedCustomerId = watch('customer_id') || ''
  const watchedPhone      = watchC('phone') ?? ''

  // Pre-llenar al abrir
  useEffect(() => {
    if (!open) return
    if (initial) {
      const walkIn = !initial.customer_id && (!!initial.customer_name || !!initial.customer_phone)
      setIsWalkIn(walkIn)
      const [start_date = '', rawTime = '09:00'] = (initial.start_at ?? '').split('T')
      const { hour, min, ampm } = from24h(rawTime.slice(0, 5))
      reset({
        title:          initial.title          || '',
        start_date,
        start_hour:     hour,
        start_min:      min,
        start_ampm:     ampm,
        duration:       String(calcDuration(initial.start_at, initial.end_at)),
        status:         initial.status         || 'programada',
        employee_id:    initial.employee_id    ? String(initial.employee_id) : '',
        customer_id:    initial.customer_id    ? String(initial.customer_id) : '',
        vehicle_id:     initial.vehicle_id     ? String(initial.vehicle_id)  : '',
        customer_name:  initial.customer_name  || '',
        customer_phone: initial.customer_phone || '',
        notes:          initial.notes          || initial.description || '',
      })
    } else {
      setIsWalkIn(false)
      reset({
        title: '', start_date: defaultDate || '',
        start_hour: '09', start_min: '00', start_ampm: 'AM',
        duration: '60', status: 'programada',
        employee_id: '', customer_id: '', vehicle_id: '',
        customer_name: '', customer_phone: '', notes: '',
      })
    }
    setQuickCreate(false)
  }, [open, initial, defaultDate, reset])

  // ── Queries ───────────────────────────────────────────────────────────
  const { data: customers } = useQuery({
    queryKey: ['customers-all'],
    queryFn: () => getCustomers({ per_page: 500 }).then(r => r.data.data),
    enabled: open,
    staleTime: 60000,
  })
  const { data: employees } = useQuery({
    queryKey: ['employees-active'],
    queryFn: () => getEmployees({ active: true, per_page: 100 }).then(r => r.data.data),
    enabled: open,
    staleTime: 60000,
  })
  const { data: vehicles } = useQuery({
    queryKey: ['vehicles-by-customer', watchedCustomerId],
    queryFn: () => getVehicles({ customer_id: watchedCustomerId, per_page: 50 }).then(r => r.data.data),
    enabled: !!watchedCustomerId && !isWalkIn && open,
  })

  // Detección de cliente duplicado por teléfono
  const dupCustomer = watchedPhone.replace(/\D/g, '').length >= 7
    ? (customers ?? []).find(c => c.phone?.replace(/\D/g, '') === watchedPhone.replace(/\D/g, ''))
    : null

  // ── Mutations ─────────────────────────────────────────────────────────
  const createCust = useMutation({
    mutationFn: d => createCustomer(d),
    onSuccess: res => {
      qc.invalidateQueries({ queryKey: ['customers-all'] })
      setValue('customer_id', String(res.data.id))
      setQuickCreate(false)
      resetC()
      toast.success('Cliente creado y seleccionado')
    },
    onError: e => toast.error(e.response?.data?.message ?? 'Error'),
  })

  const save = useMutation({
    mutationFn: d => initial?.id ? updateAppointment(initial.id, d) : createAppointment(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] })
      qc.invalidateQueries({ queryKey: ['appointments-list'] })
      toast.success(initial?.id ? 'Cita actualizada' : 'Cita creada')
      handleClose()
    },
    onError: e => toast.error(e.response?.data?.message ?? 'Error'),
  })

  const handleClose = () => {
    reset({})
    setIsWalkIn(false)
    setQuickCreate(false)
    onClose()
  }

  const switchToRegistered = () => {
    setIsWalkIn(false)
    setValue('customer_name', '')
    setValue('customer_phone', '')
  }

  const switchToWalkIn = () => {
    setIsWalkIn(true)
    setValue('customer_id', '')
    setValue('vehicle_id', '')
    setQuickCreate(false)
  }

  const onSubmit = handleSubmit(({
    title, start_date, start_hour, start_min, start_ampm, duration,
    status, employee_id, customer_id, vehicle_id,
    customer_name, customer_phone, notes,
  }) => {
    if (!title?.trim()) return
    if (!start_date)    return
    const start_at = `${start_date}T${to24h(start_hour, start_min, start_ampm)}`
    let end_at
    const durMins = Number(duration)
    if (durMins > 0) {
      const d = new Date(`${start_at}:00`)
      d.setMinutes(d.getMinutes() + durMins)
      const pad = n => String(n).padStart(2, '0')
      end_at = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
    }
    save.mutate({
      title: title.trim(),
      start_at,
      ...(end_at ? { end_at } : { end_at: null }),
      color:  STATUS_COLORS[status || 'programada'],
      status: status || 'programada',
      notes:  notes || undefined,
      employee_id: employee_id || undefined,
      ...(isWalkIn
        ? { customer_name: customer_name || undefined, customer_phone: customer_phone || undefined, customer_id: undefined, vehicle_id: undefined }
        : { customer_id: customer_id || undefined, vehicle_id: vehicle_id || undefined }
      ),
    })
  })

  const hasPhone   = initial && (initial.customer_phone || initial.customer?.phone)
  const canConvert = initial && !initial.work_order_id && ['programada', 'confirmada'].includes(initial?.status)

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <Modal open={open} onClose={handleClose} title={initial ? 'Editar cita' : 'Nueva cita'} size="md">
      <form onSubmit={onSubmit} className="space-y-4">

        {/* OT vinculada (informativo) */}
        {initial?.work_order_id && (
          <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-xl text-sm">
            <FileText size={14} className="text-green-600 shrink-0" />
            <span className="text-green-700 flex-1">Esta cita ya tiene una OT generada</span>
            <Link
              to={`/work-orders/${initial.work_order_id}`}
              onClick={handleClose}
              className="text-green-700 font-semibold hover:underline flex items-center gap-1"
            >
              Ver OT <ExternalLink size={12} />
            </Link>
          </div>
        )}

        {/* Título */}
        <div>
          <label className="label">Motivo de la cita *</label>
          <input
            {...register('title', { required: true })}
            className={`input ${errors.title ? 'border-red-400' : ''}`}
            placeholder="Ej: Cambio de aceite, diagnóstico, revisión de frenos..."
          />
          {errors.title && <p className="mt-1 text-xs text-red-500">Requerido</p>}
        </div>

        {/* Fecha y hora */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Fecha *</label>
            <input {...register('start_date', { required: true })} type="date" className={`input ${errors.start_date ? 'border-red-400' : ''}`} />
            {errors.start_date && <p className="mt-1 text-xs text-red-500">Requerido</p>}
          </div>
          <div>
            <label className="label">Hora *</label>
            <TimePicker control={control} prefix="start" />
          </div>
        </div>

        {/* Duración + Estado */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Duración estimada</label>
            <select {...register('duration')} className="input">
              {DURATIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>
          {initial && (
            <div>
              <label className="label">Estado</label>
              <select {...register('status')} className="input">
                <option value="programada">Programada</option>
                <option value="confirmada">Confirmada</option>
                <option value="completada">Completada</option>
                <option value="cancelada">Cancelada</option>
                <option value="no_presente">No presente</option>
              </select>
            </div>
          )}
        </div>

        {/* Sección cliente ─── toggle Registrado / Sin cuenta */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="label mb-0">Cliente</label>
            <div className="flex rounded-lg overflow-hidden border border-gray-200 text-xs font-medium">
              <button
                type="button"
                onClick={switchToRegistered}
                className={`px-3 py-1.5 flex items-center gap-1.5 transition-colors
                  ${!isWalkIn ? 'bg-primary-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
              >
                <Users size={12} /> Registrado
              </button>
              <button
                type="button"
                onClick={switchToWalkIn}
                className={`px-3 py-1.5 flex items-center gap-1.5 transition-colors
                  ${isWalkIn ? 'bg-primary-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
              >
                <User size={12} /> Sin cuenta
              </button>
            </div>
          </div>

          {/* ── Cliente registrado ── */}
          {!isWalkIn ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <select {...register('customer_id')} className="input flex-1" disabled={quickCreate}>
                  <option value="">— Seleccionar cliente —</option>
                  {(customers ?? []).map(c => (
                    <option key={c.id} value={String(c.id)}>
                      {c.name}{c.phone ? ` · ${c.phone}` : ''}
                    </option>
                  ))}
                </select>
                {!quickCreate && (
                  <button
                    type="button"
                    onClick={() => setQuickCreate(true)}
                    className="btn-secondary text-xs whitespace-nowrap flex items-center gap-1"
                  >
                    <UserPlus size={13} /> Nuevo
                  </button>
                )}
              </div>

              {/* Panel creación rápida */}
              {quickCreate && (
                <div className="p-3 border border-primary-200 rounded-xl bg-primary-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-primary-700 flex items-center gap-1.5">
                      <UserPlus size={13} /> Crear cliente nuevo
                    </span>
                    <button type="button" onClick={() => { setQuickCreate(false); resetC() }} className="text-gray-400 hover:text-gray-600">
                      <X size={14} />
                    </button>
                  </div>
                  <div>
                    <label className="label text-xs">Teléfono</label>
                    <input {...regC('phone')} className="input text-sm" placeholder="70001234" />
                  </div>
                  {dupCustomer ? (
                    <div className="flex items-start gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg text-xs">
                      <AlertTriangle size={14} className="text-yellow-500 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-yellow-800">Ya existe un cliente con este número:</p>
                        <p className="font-bold text-yellow-700">{dupCustomer.name}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setValue('customer_id', String(dupCustomer.id)); setQuickCreate(false); resetC() }}
                        className="btn-secondary text-xs py-1 px-2 shrink-0"
                      >
                        Seleccionar
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="label text-xs">Nombre *</label>
                          <input {...regC('first_name')} className="input text-sm" placeholder="Juan" />
                        </div>
                        <div>
                          <label className="label text-xs">Apellido *</label>
                          <input {...regC('last_name')} className="input text-sm" placeholder="Pérez" />
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={createCust.isPending}
                        onClick={handleC(d => createCust.mutate(d))}
                        className="btn-primary w-full text-sm"
                      >
                        {createCust.isPending ? 'Creando...' : 'Crear y seleccionar'}
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Vehículos del cliente */}
              {watchedCustomerId && !quickCreate && (
                <div>
                  <label className="label">Vehículo</label>
                  {(vehicles ?? []).length > 0 ? (
                    <select {...register('vehicle_id')} className="input">
                      <option value="">— Sin especificar vehículo —</option>
                      {vehicles.map(v => (
                        <option key={v.id} value={String(v.id)}>
                          {v.plate} — {v.brand}{v.model ? ` ${v.model}` : ''}{v.year ? ` (${v.year})` : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-xs text-gray-400 py-1">
                      Este cliente no tiene vehículos registrados
                    </p>
                  )}
                </div>
              )}
            </div>

          ) : (
            /* ── Persona sin cuenta ── */
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Nombre del contacto</label>
                <input {...register('customer_name')} className="input" placeholder="Juan Pérez" />
              </div>
              <div>
                <label className="label">Teléfono</label>
                <input {...register('customer_phone')} className="input" placeholder="70001234" />
              </div>
            </div>
          )}
        </div>

        {/* Técnico */}
        <div>
          <label className="label">Técnico asignado</label>
          <select {...register('employee_id')} className="input">
            <option value="">Sin asignar</option>
            {(employees ?? []).map(e => (
              <option key={e.id} value={String(e.id)}>
                {e.name}{e.specialty ? ` — ${e.specialty}` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Notas */}
        <div>
          <label className="label">Descripción / notas</label>
          <textarea
            {...register('notes')}
            rows={3}
            className="input"
            placeholder="Describe el problema o lo que necesita el cliente..."
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-gray-100">
          {/* Acciones contextuales */}
          <div className="flex gap-2 flex-wrap">
            {onReminder && hasPhone && (
              <button type="button" onClick={onReminder} className="btn-secondary text-sm flex items-center gap-1.5">
                <MessageCircle size={14} /> WhatsApp
              </button>
            )}
            {onConvertToOT && canConvert && (
              <button type="button" onClick={onConvertToOT} className="btn-primary text-sm flex items-center gap-1.5">
                <FileText size={14} /> Convertir en OT
              </button>
            )}
          </div>
          {/* Guardar / cancelar */}
          <div className="flex gap-2">
            <button type="button" onClick={handleClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={save.isPending} className="btn-primary">
              {save.isPending ? 'Guardando...' : (initial ? 'Guardar cambios' : 'Crear cita')}
            </button>
          </div>
        </div>

      </form>
    </Modal>
  )
}
