import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Edit2, Car, ClipboardList, Plus, CalendarDays, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'
import { getCustomer, updateCustomer } from '../api/customers'
import { createVehicle } from '../api/vehicles'
import { getAppointments } from '../api/appointments'
import { VEHICLE_CATALOG, BRANDS } from '../data/vehicleCatalog'
import Modal from '../components/ui/Modal'
import StatusBadge from '../components/ui/StatusBadge'
import { fmtDate } from '../utils/date'
import { isValidPhone, isValidCedula, fmtPhone, fmtCedula } from '../utils/hn'

const APT_STATUS = {
  programada: { label: 'Programada', cls: 'bg-blue-100 text-blue-700' },
  confirmada:  { label: 'Confirmada', cls: 'bg-emerald-100 text-emerald-700' },
  completada:  { label: 'Completada', cls: 'bg-gray-100 text-gray-600' },
  cancelada:   { label: 'Cancelada',   cls: 'bg-red-100 text-red-600' },
  no_presente: { label: 'No presente', cls: 'bg-orange-100 text-orange-700' },
}

function AptBadge({ status }) {
  const s = APT_STATUS[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600' }
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>{s.label}</span>
}

const schema = z.object({
  first_name:       z.string().min(1, 'Requerido'),
  second_name:      z.string().optional(),
  last_name:        z.string().min(1, 'Requerido'),
  second_last_name: z.string().optional(),
  phone:            z.string().min(1, 'El teléfono es requerido').refine(isValidPhone, 'Teléfono inválido (8 dígitos, ej: 9999-9999)'),
  email:            z.string().email('Email inválido').optional().or(z.literal('')),
  address:          z.string().optional(),
  id_number:        z.string().optional().refine(isValidCedula, 'Cédula inválida (ej: 0801-1990-12345)'),
  notes:            z.string().optional(),
})

const vehicleSchema = z.object({
  plate: z.string().min(1, 'Requerido'),
  brand: z.string().min(1, 'Requerido'),
  model: z.string().min(1, 'Requerido'),
  year: z.coerce.number().min(1900).max(2099).optional().or(z.literal('')),
  color: z.string().optional(),
  engine_type: z.string().optional(),
  vin: z.string().optional(),
  displacement: z.string().optional(),
  description: z.string().optional(),
})

const fmt = (n) => `Lps ${Number(n ?? 0).toLocaleString('es-HN')}`

export default function CustomerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)
  const [vehicleOpen, setVehicleOpen] = useState(false)
  const [brandMode, setBrandMode] = useState('list')
  const [modelMode, setModelMode] = useState('list')

  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => getCustomer(id).then((r) => r.data),
  })

  const { data: appointments } = useQuery({
    queryKey: ['appointments', { customer_id: id }],
    queryFn: () => getAppointments({ customer_id: id }).then((r) => r.data),
    enabled: !!id,
  })

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm({ resolver: zodResolver(schema) })
  const { register: regV, handleSubmit: handleV, reset: resetV, watch: watchV, setValue: setVValue, formState: { errors: errV } } = useForm({ resolver: zodResolver(vehicleSchema) })

  const watchedBrand = watchV('brand')
  const modelsForBrand = VEHICLE_CATALOG[watchedBrand] ?? []
  const showModelSelect = modelsForBrand.length > 0 && modelMode === 'list'

  const save = useMutation({
    mutationFn: (d) => updateCustomer(id, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customer', id] })
      qc.invalidateQueries({ queryKey: ['customers'] })
      toast.success('Cliente actualizado')
      setEditOpen(false)
    },
    onError: (e) => toast.error(e.response?.data?.message ?? 'Error'),
  })

  const saveVehicle = useMutation({
    mutationFn: (d) => createVehicle({ ...d, customer_id: id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customer', id] })
      qc.invalidateQueries({ queryKey: ['vehicles'] })
      toast.success('Vehículo agregado')
      setVehicleOpen(false)
      resetV()
    },
    onError: (e) => toast.error(e.response?.data?.message ?? 'Error'),
  })

  if (isLoading) return <div className="flex items-center justify-center py-24 text-gray-400">Cargando...</div>
  if (!customer) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-4">
        <button onClick={() => navigate('/customers')} className="btn-ghost p-2">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
          <p className="text-sm text-gray-500">Cliente #{customer.id}</p>
        </div>
        <button onClick={() => { reset(customer); setEditOpen(true) }} className="btn-secondary">
          <Edit2 size={15} /> Editar
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna izquierda: datos de contacto */}
        <div className="card p-4">
          <h3 className="font-semibold text-gray-800 mb-3">Información de contacto</h3>
          <dl className="space-y-2 text-sm">
            <div><dt className="text-gray-500">Teléfono</dt><dd className="font-medium">{customer.phone ?? '—'}</dd></div>
            <div><dt className="text-gray-500">Email</dt><dd>{customer.email ?? '—'}</dd></div>
            <div><dt className="text-gray-500">Dirección</dt><dd>{customer.address ?? '—'}</dd></div>
            <div><dt className="text-gray-500">Cédula / RUC</dt><dd className="font-mono">{customer.id_number ?? '—'}</dd></div>
            {customer.notes && (
              <div><dt className="text-gray-500">Notas</dt><dd className="text-gray-700">{customer.notes}</dd></div>
            )}
          </dl>
        </div>

        {/* Columna derecha: vehículos + OTs */}
        <div className="lg:col-span-2 space-y-4">
          {/* Vehículos */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Car size={16} className="text-primary-600" />
                <h3 className="font-semibold text-gray-800">Vehículos ({customer.vehicles?.length ?? 0})</h3>
              </div>
              <button onClick={() => { resetV({}); setBrandMode('list'); setModelMode('list'); setVehicleOpen(true) }} className="btn-secondary text-xs py-1.5">
                <Plus size={14} /> Agregar vehículo
              </button>
            </div>
            {!customer.vehicles?.length ? (
              <p className="text-sm text-gray-400 py-2 text-center">Sin vehículos registrados</p>
            ) : (
              <div className="space-y-2">
                {customer.vehicles.map((v) => (
                  <Link
                    key={v.id}
                    to={`/vehicles/${v.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-primary-200 hover:bg-primary-50 transition-colors"
                  >
                    <div>
                      <span className="font-mono font-semibold text-primary-700">{v.plate}</span>
                      <span className="ml-2 text-gray-700">{v.brand} {v.model} {v.year}</span>
                    </div>
                    <span className="text-xs text-gray-400">{v.color}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Historial de OTs */}
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <ClipboardList size={16} className="text-primary-600" />
              <h3 className="font-semibold text-gray-800">Historial de órdenes ({customer.work_orders?.length ?? 0})</h3>
            </div>
            {!customer.work_orders?.length ? (
              <p className="text-sm text-gray-400 py-2 text-center">Sin órdenes de trabajo</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-500 font-medium">
                    <th className="text-left py-1.5">N° OT</th>
                    <th className="text-left py-1.5">Vehículo</th>
                    <th className="text-left py-1.5">Estado</th>
                    <th className="text-right py-1.5">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {customer.work_orders.map((wo) => (
                    <tr key={wo.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2">
                        <Link to={`/work-orders/${wo.id}`} className="font-mono text-primary-600 hover:underline font-semibold">
                          {wo.number}
                        </Link>
                      </td>
                      <td className="py-2 text-gray-600">{[wo.vehicle_plate, wo.vehicle_brand, wo.vehicle_model].filter(Boolean).join(' ') || '—'}</td>
                      <td className="py-2"><StatusBadge status={wo.status} /></td>
                      <td className="py-2 text-right font-medium">{fmt(wo.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Sección de citas */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CalendarDays size={16} className="text-primary-600" />
            <h3 className="font-semibold text-gray-800">
              Citas ({appointments?.length ?? 0})
            </h3>
          </div>
          <Link to="/calendar" className="text-xs text-primary-600 hover:underline flex items-center gap-1">
            <ExternalLink size={12} /> Ver calendario
          </Link>
        </div>

        {!appointments?.length ? (
          <p className="text-sm text-gray-400 py-4 text-center">Sin citas registradas para este cliente</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-gray-500 font-medium text-left">
                  <th className="py-2 pr-4">Fecha</th>
                  <th className="py-2 pr-4">Hora</th>
                  <th className="py-2 pr-4">Título</th>
                  <th className="py-2 pr-4">Técnico</th>
                  <th className="py-2 pr-4">Estado</th>
                  <th className="py-2">OT</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((apt) => {
                  const [datePart = '', timePart = ''] = (apt.start_at ?? '').split('T')
                  const timeStr = timePart
                    ? new Date(`1970-01-01T${timePart}`).toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit', hour12: true })
                    : '—'
                  return (
                    <tr key={apt.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2 pr-4 whitespace-nowrap">{fmtDate(datePart)}</td>
                      <td className="py-2 pr-4 whitespace-nowrap text-gray-500">{timeStr}</td>
                      <td className="py-2 pr-4">
                        <p className="font-medium text-gray-800">{apt.title}</p>
                        {apt.notes && <p className="text-xs text-gray-400 truncate max-w-xs">{apt.notes}</p>}
                      </td>
                      <td className="py-2 pr-4 text-gray-600">{apt.employee?.name ?? <span className="text-gray-300">—</span>}</td>
                      <td className="py-2 pr-4"><AptBadge status={apt.status} /></td>
                      <td className="py-2">
                        {apt.work_order_id ? (
                          <Link
                            to={`/work-orders/${apt.work_order_id}`}
                            className="font-mono text-xs text-primary-600 hover:underline flex items-center gap-1"
                          >
                            Ver OT <ExternalLink size={11} />
                          </Link>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal nuevo vehículo */}
      <Modal open={vehicleOpen} onClose={() => setVehicleOpen(false)} title="Agregar vehículo" size="lg">
        <form onSubmit={handleV((d) => saveVehicle.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Placa *</label>
              <input {...regV('plate')} className="input uppercase" placeholder="ABC123" />
              {errV.plate && <p className="mt-1 text-xs text-red-500">{errV.plate.message}</p>}
            </div>
            <div>
              <label className="label">Color</label>
              <input {...regV('color')} className="input" placeholder="Blanco" />
            </div>
            {/* Marca */}
            <div>
              <label className="label">Marca *</label>
              {brandMode === 'list' ? (
                <>
                  <select
                    value={watchedBrand || ''}
                    onChange={(e) => {
                      if (e.target.value === '__other__') {
                        setBrandMode('custom')
                        setVValue('brand', '')
                        setVValue('model', '')
                        setModelMode('list')
                      } else {
                        setVValue('brand', e.target.value)
                        setVValue('model', '')
                        setModelMode('list')
                      }
                    }}
                    className="input"
                  >
                    <option value="">— Seleccionar marca —</option>
                    {BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
                    <option value="__other__">✏ Otra marca...</option>
                  </select>
                  <input type="hidden" {...regV('brand')} />
                </>
              ) : (
                <div className="flex gap-2">
                  <input {...regV('brand')} className="input flex-1" placeholder="Escribe la marca" autoFocus />
                  <button
                    type="button"
                    onClick={() => { setBrandMode('list'); setVValue('brand', ''); setVValue('model', '') }}
                    className="btn-secondary text-xs whitespace-nowrap"
                  >
                    Ver lista
                  </button>
                </div>
              )}
              {errV.brand && <p className="mt-1 text-xs text-red-500">{errV.brand.message}</p>}
            </div>

            {/* Modelo */}
            <div>
              <label className="label">Modelo *</label>
              {showModelSelect ? (
                <>
                  <select
                    value={watchV('model') || ''}
                    onChange={(e) => {
                      if (e.target.value === '__other__') {
                        setModelMode('custom')
                        setVValue('model', '')
                      } else {
                        setVValue('model', e.target.value)
                      }
                    }}
                    className="input"
                  >
                    <option value="">— Seleccionar modelo —</option>
                    {modelsForBrand.map((m) => <option key={m} value={m}>{m}</option>)}
                    <option value="__other__">✏ Otro modelo...</option>
                  </select>
                  <input type="hidden" {...regV('model')} />
                </>
              ) : (
                <div className="flex gap-2">
                  <input {...regV('model')} className="input flex-1" placeholder="Modelo" />
                  {modelsForBrand.length > 0 && (
                    <button
                      type="button"
                      onClick={() => { setModelMode('list'); setVValue('model', '') }}
                      className="btn-secondary text-xs whitespace-nowrap"
                    >
                      Ver lista
                    </button>
                  )}
                </div>
              )}
              {errV.model && <p className="mt-1 text-xs text-red-500">{errV.model.message}</p>}
            </div>
            <div>
              <label className="label">Año</label>
              <input {...regV('year')} type="number" className="input" placeholder="2020" />
            </div>
            <div>
              <label className="label">Motor</label>
              <input {...regV('engine_type')} className="input" placeholder="1.8L DOHC" />
            </div>
            <div>
              <label className="label">VIN</label>
              <input {...regV('vin')} className="input" placeholder="1HGCM82633A004352" />
            </div>
            <div>
              <label className="label">Cilindraje</label>
              <input {...regV('displacement')} className="input" placeholder="1800cc" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Descripción / Observaciones</label>
              <textarea {...regV('description')} rows={2} className="input" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setVehicleOpen(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={saveVehicle.isPending} className="btn-primary">
              {saveVehicle.isPending ? 'Guardando...' : 'Guardar vehículo'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal editar */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Editar cliente">
        <form onSubmit={handleSubmit((d) => save.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Primer nombre *</label>
              <input {...register('first_name')} className="input" />
              {errors.first_name && <p className="mt-1 text-xs text-red-500">{errors.first_name.message}</p>}
            </div>
            <div>
              <label className="label">Segundo nombre</label>
              <input {...register('second_name')} className="input" />
            </div>
            <div>
              <label className="label">Primer apellido *</label>
              <input {...register('last_name')} className="input" />
              {errors.last_name && <p className="mt-1 text-xs text-red-500">{errors.last_name.message}</p>}
            </div>
            <div>
              <label className="label">Segundo apellido</label>
              <input {...register('second_last_name')} className="input" />
            </div>
            <div>
              <label className="label">Teléfono</label>
              <input
                {...register('phone')}
                onChange={(e) => setValue('phone', fmtPhone(e.target.value), { shouldValidate: true })}
                className="input" placeholder="9999-9999" maxLength={9}
              />
              {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone.message}</p>}
            </div>
            <div>
              <label className="label">Email</label>
              <input {...register('email')} type="email" className="input" />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
            </div>
            <div>
              <label className="label">Cédula</label>
              <input
                {...register('id_number')}
                onChange={(e) => setValue('id_number', fmtCedula(e.target.value), { shouldValidate: true })}
                className="input" placeholder="0801-1990-12345" maxLength={15}
              />
              {errors.id_number && <p className="mt-1 text-xs text-red-500">{errors.id_number.message}</p>}
            </div>
            <div>
              <label className="label">Dirección</label>
              <input {...register('address')} className="input" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Notas</label>
              <textarea {...register('notes')} rows={2} className="input" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setEditOpen(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={save.isPending} className="btn-primary">
              {save.isPending ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
