import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  ArrowLeft, Edit2, Package, Phone, Mail, MapPin, AlertTriangle,
  Wallet, Clock, CheckCircle2, Banknote,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { getSupplier, updateSupplier } from '../api/suppliers'
import { updateSupplierPayment } from '../api/supplierPayments'
import { fmtMoney, fmtDate } from '../utils/date'
import Modal from '../components/ui/Modal'
import { isValidPhone, fmtPhone } from '../utils/hn'

const schema = z.object({
  name: z.string().min(1, 'Requerido'),
  contact_name: z.string().optional(),
  phone: z.string().min(1, 'El teléfono es requerido').refine(isValidPhone, 'Teléfono inválido (8 dígitos, ej: 9999-9999)'),
  email: z.string().email('Correo inválido').optional().or(z.literal('')),
  address: z.string().optional(),
  rtn: z.string().optional(),
  notes: z.string().optional(),
  active: z.boolean().optional(),
})

const payMethodSchema = z.object({
  method: z.string().optional(),
  payment_date: z.string().optional(),
  reference: z.string().optional(),
})

const METHOD_LABELS = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  tarjeta: 'Tarjeta',
  cheque: 'Cheque',
  otro: 'Otro',
}


export default function SupplierDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)
  const [payingId, setPayingId] = useState(null)

  const { data: supplier, isLoading } = useQuery({
    queryKey: ['supplier', id],
    queryFn: () => getSupplier(id).then((r) => r.data),
  })

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm({ resolver: zodResolver(schema) })
  const { register: regPay, handleSubmit: handlePay, reset: resetPay } = useForm({ resolver: zodResolver(payMethodSchema) })

  const save = useMutation({
    mutationFn: (d) => updateSupplier(id, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['supplier', id] })
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      qc.invalidateQueries({ queryKey: ['suppliers-all'] })
      toast.success('Proveedor actualizado')
      setEditOpen(false)
    },
    onError: (e) => toast.error(e.response?.data?.message ?? 'Error'),
  })

  const markPaid = useMutation({
    mutationFn: (d) => updateSupplierPayment(payingId, { ...d, status: 'pagado' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['supplier', id] })
      toast.success('Pago marcado como completado')
      setPayingId(null)
      resetPay()
    },
    onError: (e) => toast.error(e.response?.data?.message ?? 'Error'),
  })

  if (isLoading) return <div className="flex items-center justify-center py-24 text-gray-400">Cargando...</div>
  if (!supplier) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-4">
        <button onClick={() => navigate('/suppliers')} className="btn-ghost p-2">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{supplier.name}</h1>
            <span className={`badge ${supplier.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {supplier.active ? 'Activo' : 'Inactivo'}
            </span>
          </div>
          <p className="text-sm text-gray-500">Proveedor #{supplier.id}</p>
        </div>
        <button onClick={() => { reset({ ...supplier, active: !!supplier.active }); setEditOpen(true) }} className="btn-secondary">
          <Edit2 size={15} /> Editar
        </button>
      </div>

      {/* KPIs de pagos */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0">
            <CheckCircle2 size={18} className="text-white" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Total pagado</p>
            <p className="text-lg font-bold text-gray-800 tabular-nums">{fmtMoney(supplier.total_paid)}</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shrink-0">
            <Clock size={18} className="text-white" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Pendiente de pago</p>
            <p className="text-lg font-bold text-gray-800 tabular-nums">{fmtMoney(supplier.total_pending)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna izquierda: datos de contacto */}
        <div className="card p-4">
          <h3 className="font-semibold text-gray-800 mb-3">Información de contacto</h3>
          <dl className="space-y-3 text-sm">
            {supplier.contact_name && (
              <div><dt className="text-gray-500">Persona de contacto</dt><dd className="font-medium">{supplier.contact_name}</dd></div>
            )}
            <div>
              <dt className="text-gray-500">Teléfono</dt>
              <dd className="font-medium flex items-center gap-1.5">
                <Phone size={13} className="text-gray-400" /> {supplier.phone ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Email</dt>
              <dd className="flex items-center gap-1.5">
                <Mail size={13} className="text-gray-400" /> {supplier.email ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Dirección</dt>
              <dd className="flex items-center gap-1.5">
                <MapPin size={13} className="text-gray-400 shrink-0" /> {supplier.address ?? '—'}
              </dd>
            </div>
            <div><dt className="text-gray-500">RTN</dt><dd className="font-mono">{supplier.rtn ?? '—'}</dd></div>
            {supplier.notes && (
              <div><dt className="text-gray-500">Notas</dt><dd className="text-gray-700">{supplier.notes}</dd></div>
            )}
          </dl>
        </div>

        {/* Columna derecha: repuestos que suministra */}
        <div className="lg:col-span-2">
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Package size={16} className="text-primary-600" />
              <h3 className="font-semibold text-gray-800">Repuestos suministrados ({supplier.inventory_count ?? 0})</h3>
            </div>
            {!supplier.inventory?.length ? (
              <p className="text-sm text-gray-400 py-4 text-center">Este proveedor no tiene repuestos asociados</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-500 font-medium">
                    <th className="text-left py-1.5">Repuesto</th>
                    <th className="text-left py-1.5">Categoría</th>
                    <th className="text-right py-1.5">Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {supplier.inventory.map((item) => (
                    <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2">
                        <p className="font-medium text-gray-800">{item.name}</p>
                        {item.sku && <p className="text-xs text-gray-400 font-mono">{item.sku}</p>}
                      </td>
                      <td className="py-2 text-gray-600">{item.category ?? '—'}</td>
                      <td className="py-2 text-right">
                        <span className={`inline-flex items-center gap-1 font-semibold ${item.stock <= item.min_stock ? 'text-amber-600' : 'text-gray-800'}`}>
                          {item.stock <= item.min_stock && <AlertTriangle size={13} />}
                          {item.stock}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Pagos al proveedor */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Wallet size={16} className="text-primary-600" />
          <h3 className="font-semibold text-gray-800">Pagos registrados ({supplier.payments?.length ?? 0})</h3>
        </div>
        {!supplier.payments?.length ? (
          <p className="text-sm text-gray-400 py-4 text-center">
            Sin pagos registrados. Se registran opcionalmente al hacer una entrada de stock en Inventario.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-gray-500 font-medium">
                <th className="text-left py-1.5">Fecha</th>
                <th className="text-left py-1.5">Repuesto</th>
                <th className="text-left py-1.5">Método</th>
                <th className="text-left py-1.5">Referencia</th>
                <th className="text-right py-1.5">Monto</th>
                <th className="text-right py-1.5">Estado</th>
              </tr>
            </thead>
            <tbody>
              {supplier.payments.map((p) => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2 text-gray-600">{fmtDate(p.payment_date)}</td>
                  <td className="py-2 text-gray-600">
                    {p.inventory_movement?.inventory_item?.name
                      ? `${p.inventory_movement.inventory_item.name} (×${p.inventory_movement.quantity})`
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="py-2 text-gray-600">{METHOD_LABELS[p.method] ?? <span className="text-gray-300">—</span>}</td>
                  <td className="py-2 text-gray-500 text-xs">{p.reference ?? '—'}</td>
                  <td className="py-2 text-right font-medium">{fmtMoney(p.amount)}</td>
                  <td className="py-2 text-right">
                    {p.status === 'pagado' ? (
                      <span className="badge bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">Pagado</span>
                    ) : (
                      <button
                        onClick={() => { setPayingId(p.id); resetPay({ payment_date: new Date().toISOString().slice(0, 10) }) }}
                        className="badge bg-amber-50 text-amber-700 ring-1 ring-amber-200 cursor-pointer hover:bg-amber-100 transition-colors"
                        title="Clic para marcar como pagado"
                      >
                        Pendiente
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal marcar pago como completado */}
      <Modal open={!!payingId} onClose={() => setPayingId(null)} title="Marcar pago como completado">
        <form onSubmit={handlePay((d) => markPaid.mutate(d))} className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800">
            <Banknote size={16} className="shrink-0" />
            Este pago quedará marcado como <strong>pagado</strong>.
          </div>
          <div>
            <label className="label">Método</label>
            <select {...regPay('method')} className="input">
              <option value="">— Sin especificar —</option>
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="cheque">Cheque</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          <div>
            <label className="label">Fecha de pago</label>
            <input {...regPay('payment_date')} type="date" className="input" />
          </div>
          <div>
            <label className="label">Referencia</label>
            <input {...regPay('reference')} className="input" placeholder="N° factura, voucher..." />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setPayingId(null)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={markPaid.isPending} className="btn-primary">
              {markPaid.isPending ? 'Guardando...' : 'Confirmar pago'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal editar */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Editar proveedor" size="lg">
        <form onSubmit={handleSubmit((d) => save.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Nombre del proveedor *</label>
              <input {...register('name')} className="input" />
              {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
            </div>
            <div>
              <label className="label">Persona de contacto</label>
              <input {...register('contact_name')} className="input" />
            </div>
            <div>
              <label className="label">Teléfono *</label>
              <input
                {...register('phone')}
                onChange={(e) => setValue('phone', fmtPhone(e.target.value), { shouldValidate: true })}
                className="input" placeholder="9999-9999" maxLength={9}
              />
              {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone.message}</p>}
            </div>
            <div>
              <label className="label">Correo electrónico</label>
              <input {...register('email')} type="email" className="input" />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
            </div>
            <div>
              <label className="label">RTN</label>
              <input {...register('rtn')} className="input" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Dirección</label>
              <input {...register('address')} className="input" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Notas</label>
              <textarea {...register('notes')} rows={2} className="input" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" {...register('active')} id="supplier-active" className="w-4 h-4 text-primary-600" />
            <label htmlFor="supplier-active" className="text-sm text-gray-700">Proveedor activo</label>
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
