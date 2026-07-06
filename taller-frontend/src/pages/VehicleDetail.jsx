import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Edit2, User, ClipboardList, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'
import { getVehicle, updateVehicle } from '../api/vehicles'
import { getCustomers } from '../api/customers'
import Modal from '../components/ui/Modal'
import StatusBadge from '../components/ui/StatusBadge'

const schema = z.object({
  customer_id: z.coerce.number().min(1, 'Seleccione un cliente'),
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

export default function VehicleDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)

  const { data: vehicle, isLoading } = useQuery({
    queryKey: ['vehicle', id],
    queryFn: () => getVehicle(id).then((r) => r.data),
  })

  const { data: customers } = useQuery({
    queryKey: ['customers-all'],
    queryFn: () => getCustomers({ per_page: 500 }).then((r) => r.data.data),
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm({ resolver: zodResolver(schema) })

  const save = useMutation({
    mutationFn: (d) => updateVehicle(id, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicle', id] })
      qc.invalidateQueries({ queryKey: ['vehicles'] })
      toast.success('Vehículo actualizado')
      setEditOpen(false)
    },
    onError: (e) => toast.error(e.response?.data?.message ?? 'Error'),
  })

  if (isLoading) return <div className="flex items-center justify-center py-24 text-gray-400">Cargando...</div>
  if (!vehicle) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-4">
        <button onClick={() => navigate('/vehicles')} className="btn-ghost p-2">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold font-mono text-gray-900">{vehicle.plate}</h1>
          <p className="text-sm text-gray-600">{vehicle.brand} {vehicle.model} {vehicle.year}</p>
        </div>
        <button onClick={() => { reset({ ...vehicle, customer_id: vehicle.customer_id }); setEditOpen(true) }} className="btn-secondary">
          <Edit2 size={15} /> Editar
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna izquierda: especificaciones + propietario */}
        <div className="space-y-4">
          <div className="card p-4">
            <h3 className="font-semibold text-gray-800 mb-3">Especificaciones</h3>
            <dl className="space-y-2 text-sm">
              <div><dt className="text-gray-500">Marca</dt><dd className="font-medium">{vehicle.brand}</dd></div>
              <div><dt className="text-gray-500">Modelo</dt><dd className="font-medium">{vehicle.model}</dd></div>
              <div><dt className="text-gray-500">Año</dt><dd>{vehicle.year ?? '—'}</dd></div>
              <div><dt className="text-gray-500">Color</dt><dd>{vehicle.color ?? '—'}</dd></div>
              <div><dt className="text-gray-500">Motor</dt><dd>{vehicle.engine_type ?? '—'}</dd></div>
              <div><dt className="text-gray-500">Cilindraje</dt><dd>{vehicle.displacement ?? '—'}</dd></div>
              <div><dt className="text-gray-500">VIN</dt><dd className="font-mono text-xs break-all">{vehicle.vin ?? '—'}</dd></div>
              {vehicle.description && (
                <div><dt className="text-gray-500">Descripción</dt><dd className="text-gray-700">{vehicle.description}</dd></div>
              )}
            </dl>
          </div>

          {vehicle.customer && (
            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <User size={15} className="text-primary-600" />
                  <h3 className="font-semibold text-gray-800">Propietario</h3>
                </div>
                <Link to={`/customers/${vehicle.customer.id}`} className="btn-ghost p-1.5 text-primary-600" title="Ver cliente">
                  <ExternalLink size={14} />
                </Link>
              </div>
              <dl className="space-y-1 text-sm">
                <div><dt className="text-gray-500">Nombre</dt><dd className="font-medium">{vehicle.customer.name}</dd></div>
                <div><dt className="text-gray-500">Teléfono</dt><dd>{vehicle.customer.phone ?? '—'}</dd></div>
                <div><dt className="text-gray-500">Email</dt><dd>{vehicle.customer.email ?? '—'}</dd></div>
              </dl>
            </div>
          )}
        </div>

        {/* Columna derecha: historial de OTs */}
        <div className="lg:col-span-2">
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <ClipboardList size={16} className="text-primary-600" />
              <h3 className="font-semibold text-gray-800">Historial de órdenes ({vehicle.work_orders?.length ?? 0})</h3>
            </div>
            {!vehicle.work_orders?.length ? (
              <p className="text-sm text-gray-400 py-4 text-center">Sin órdenes de trabajo registradas</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-500 font-medium">
                    <th className="text-left py-1.5">N° OT</th>
                    <th className="text-left py-1.5">Tipo de servicio</th>
                    <th className="text-left py-1.5">Estado</th>
                    <th className="text-right py-1.5">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicle.work_orders.map((wo) => (
                    <tr key={wo.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2">
                        <Link to={`/work-orders/${wo.id}`} className="font-mono text-primary-600 hover:underline font-semibold">
                          {wo.number}
                        </Link>
                      </td>
                      <td className="py-2 text-gray-600">{wo.service_type ?? '—'}</td>
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

      {/* Modal editar */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Editar vehículo" size="lg">
        <form onSubmit={handleSubmit((d) => save.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Propietario *</label>
              <select {...register('customer_id')} className="input">
                <option value="">Seleccionar cliente...</option>
                {(customers ?? []).map((c) => (
                  <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>
                ))}
              </select>
              {errors.customer_id && <p className="mt-1 text-xs text-red-500">{errors.customer_id.message}</p>}
            </div>
            <div>
              <label className="label">Placa *</label>
              <input {...register('plate')} className="input uppercase" />
              {errors.plate && <p className="mt-1 text-xs text-red-500">{errors.plate.message}</p>}
            </div>
            <div>
              <label className="label">Color</label>
              <input {...register('color')} className="input" />
            </div>
            <div>
              <label className="label">Marca *</label>
              <input {...register('brand')} className="input" />
              {errors.brand && <p className="mt-1 text-xs text-red-500">{errors.brand.message}</p>}
            </div>
            <div>
              <label className="label">Modelo *</label>
              <input {...register('model')} className="input" />
              {errors.model && <p className="mt-1 text-xs text-red-500">{errors.model.message}</p>}
            </div>
            <div>
              <label className="label">Año</label>
              <input {...register('year')} type="number" className="input" />
            </div>
            <div>
              <label className="label">Motor</label>
              <input {...register('engine_type')} className="input" />
            </div>
            <div>
              <label className="label">VIN</label>
              <input {...register('vin')} className="input" />
            </div>
            <div>
              <label className="label">Cilindraje</label>
              <input {...register('displacement')} className="input" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Descripción / Observaciones</label>
              <textarea {...register('description')} rows={2} className="input" />
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
