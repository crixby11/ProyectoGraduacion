import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Edit2, Eye, Truck, Phone, Mail } from 'lucide-react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getSuppliers, createSupplier, updateSupplier } from '../api/suppliers'
import PageHeader from '../components/ui/PageHeader'
import SearchInput from '../components/ui/SearchInput'
import { Table, Pagination } from '../components/ui/Table'
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


export default function Suppliers() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('')
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['suppliers', { search, activeFilter, page }],
    queryFn: () => getSuppliers({ search, active: activeFilter !== '' ? activeFilter : undefined, page, per_page: 15 }).then((r) => r.data),
    keepPreviousData: true,
  })

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  })

  const save = useMutation({
    mutationFn: (d) => editing ? updateSupplier(editing.id, d) : createSupplier(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      qc.invalidateQueries({ queryKey: ['suppliers-all'] })
      toast.success(editing ? 'Proveedor actualizado' : 'Proveedor creado')
      closeModal()
    },
    onError: (e) => toast.error(e.response?.data?.message ?? 'Error'),
  })


  const openNew = () => { setEditing(null); reset({ active: true }); setModalOpen(true) }
  const openEdit = (s) => { setEditing(s); reset({ ...s, active: !!s.active }); setModalOpen(true) }
  const closeModal = () => { setModalOpen(false); setEditing(null); reset({}) }

  const columns = [
    {
      key: 'name', label: 'Proveedor',
      render: (r) => (
        <div>
          <Link to={`/suppliers/${r.id}`} className="font-medium text-primary-700 hover:underline">{r.name}</Link>
          {r.contact_name && <p className="text-xs text-gray-400">{r.contact_name}</p>}
        </div>
      ),
    },
    {
      key: 'contact', label: 'Contacto',
      render: (r) => (
        <div className="text-xs text-gray-500 space-y-0.5">
          {r.phone && <p className="flex items-center gap-1.5"><Phone size={11} /> {r.phone}</p>}
          {r.email && <p className="flex items-center gap-1.5"><Mail size={11} /> {r.email}</p>}
          {!r.phone && !r.email && '—'}
        </div>
      ),
    },
    { key: 'address', label: 'Dirección', render: (r) => <span className="text-gray-500 text-xs">{r.address ?? '—'}</span> },
    { key: 'inventory_count', label: 'Repuestos', render: (r) => <span className="tabular-nums">{r.inventory_count ?? 0}</span> },
    {
      key: 'active', label: 'Estado',
      render: (r) => <span className={`badge ${r.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{r.active ? 'Activo' : 'Inactivo'}</span>,
    },
    {
      key: 'actions', label: '', width: '80px',
      render: (r) => (
        <div className="flex gap-1">
          <Link to={`/suppliers/${r.id}`} className="btn-ghost p-1.5" title="Ver detalle"><Eye size={15} /></Link>
          <button onClick={() => openEdit(r)} className="btn-ghost p-1.5"><Edit2 size={15} /></button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Proveedores"
        icon={Truck}
        subtitle={data ? `${data.total} proveedores` : ''}
        action={<button onClick={openNew} className="btn-primary"><Plus size={16} /> Nuevo proveedor</button>}
      />
      <div className="card">
        <div className="p-4 border-b border-gray-100 flex flex-wrap gap-3">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Buscar por nombre, contacto, teléfono..." className="flex-1 min-w-48" />
          <select value={activeFilter} onChange={(e) => { setActiveFilter(e.target.value); setPage(1) }} className="input w-auto">
            <option value="">Todos</option>
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
          </select>
        </div>
        <Table columns={columns} data={data?.data ?? []} loading={isLoading} emptyMessage="No hay proveedores registrados" />
        <Pagination meta={data} onPageChange={setPage} />
      </div>

      <Modal open={modalOpen} onClose={closeModal} title={editing ? 'Editar proveedor' : 'Nuevo proveedor'} size="lg">
        <form onSubmit={handleSubmit((d) => save.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Nombre del proveedor *</label>
              <input {...register('name')} className="input" placeholder="Ej: Repuestos García, AutoZone..." />
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
          {editing && (
            <div className="flex items-center gap-2">
              <input type="checkbox" {...register('active')} id="supplier-active" className="w-4 h-4 text-primary-600" />
              <label htmlFor="supplier-active" className="text-sm text-gray-700">Proveedor activo</label>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={closeModal} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={save.isPending} className="btn-primary">
              {save.isPending ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  )
}
