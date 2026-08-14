import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Edit2, Car, Eye, X, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getCustomers, createCustomer, updateCustomer } from '../api/customers'
import PageHeader from '../components/ui/PageHeader'
import SearchInput from '../components/ui/SearchInput'
import { Table, Pagination } from '../components/ui/Table'
import Modal from '../components/ui/Modal'
import { isValidPhone, isValidCedula, fmtPhone, fmtCedula } from '../utils/hn'

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

export default function Customers() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('')
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const hasFilters = activeFilter !== ''

  const resetFilters = () => {
    setSearch('')
    setActiveFilter('')
    setPage(1)
  }

  const { data, isLoading } = useQuery({
    queryKey: ['customers', { search, activeFilter, page }],
    queryFn: () => getCustomers({
      search,
      page,
      per_page: 15,
      ...(activeFilter !== '' && { active: activeFilter }),
    }).then((r) => r.data),
    keepPreviousData: true,
  })

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  })

  const save = useMutation({
    mutationFn: (d) => editing ? updateCustomer(editing.id, d) : createCustomer(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] })
      toast.success(editing ? 'Cliente actualizado' : 'Cliente creado')
      closeModal()
    },
    onError: (e) => toast.error(e.response?.data?.message ?? 'Error'),
  })


  const openNew = () => { setEditing(null); reset({}); setModalOpen(true) }
  const openEdit = (c) => { setEditing(c); reset(c); setModalOpen(true) }
  const closeModal = () => { setModalOpen(false); setEditing(null); reset({}) }

  const columns = [
    {
      key: 'name', label: 'Nombre',
      render: (r) => (
        <Link to={`/customers/${r.id}`} className="font-medium text-primary-700 hover:underline">{r.name}</Link>
      ),
    },
    { key: 'phone', label: 'Teléfono' },
    { key: 'email', label: 'Email' },
    { key: 'address', label: 'Dirección' },
    {
      key: 'vehicles_count',
      label: 'Vehículos',
      render: (r) => (
        <Link to={`/vehicles?customer_id=${r.id}`} className="flex items-center gap-1 text-primary-600 hover:underline">
          <Car size={14} />
          <span>{r.vehicles?.length ?? 0}</span>
        </Link>
      ),
    },
    {
      key: 'actions',
      label: '',
      width: '80px',
      render: (r) => (
        <div className="flex gap-1">
          <Link to={`/customers/${r.id}`} className="btn-ghost p-1.5" title="Ver detalle"><Eye size={15} /></Link>
          <button onClick={() => openEdit(r)} className="btn-ghost p-1.5"><Edit2 size={15} /></button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Clientes"
        icon={Users}
        subtitle={data ? `${data.total} registros` : ''}
        action={
          <button onClick={openNew} className="btn-primary">
            <Plus size={16} /> Nuevo cliente
          </button>
        }
      />

      <div className="card">
        <div className="p-4 border-b border-gray-100 flex flex-wrap gap-3 items-center">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Buscar por nombre, teléfono o email..." className="w-64" />
          <select
            value={activeFilter}
            onChange={(e) => { setActiveFilter(e.target.value); setPage(1) }}
            className="input w-40 py-1.5"
          >
            <option value="">Todos los estados</option>
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
          </select>
          {hasFilters && (
            <button onClick={resetFilters} className="btn-ghost text-xs flex items-center gap-1 text-gray-500">
              <X size={13} /> Limpiar filtros
            </button>
          )}
        </div>
        <Table columns={columns} data={data?.data ?? []} loading={isLoading} emptyMessage="No hay clientes" />
        <Pagination meta={data} onPageChange={setPage} />
      </div>

      <Modal open={modalOpen} onClose={closeModal} title={editing ? 'Editar cliente' : 'Nuevo cliente'}>
        <form onSubmit={handleSubmit((d) => save.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Primer nombre *</label>
              <input {...register('first_name')} className="input" placeholder="Juan" />
              {errors.first_name && <p className="mt-1 text-xs text-red-500">{errors.first_name.message}</p>}
            </div>
            <div>
              <label className="label">Segundo nombre</label>
              <input {...register('second_name')} className="input" placeholder="Carlos" />
            </div>
            <div>
              <label className="label">Primer apellido *</label>
              <input {...register('last_name')} className="input" placeholder="Pérez" />
              {errors.last_name && <p className="mt-1 text-xs text-red-500">{errors.last_name.message}</p>}
            </div>
            <div>
              <label className="label">Segundo apellido</label>
              <input {...register('second_last_name')} className="input" placeholder="López" />
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
              <label className="label">Email</label>
              <input {...register('email')} type="email" className="input" placeholder="correo@email.com" />
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
              <input {...register('address')} className="input" placeholder="San José, Costa Rica" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Notas</label>
              <textarea {...register('notes')} rows={2} className="input" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={closeModal} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={isSubmitting || save.isPending} className="btn-primary">
              {save.isPending ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  )
}
