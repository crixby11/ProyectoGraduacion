import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Edit2, Settings } from 'lucide-react'
import toast from 'react-hot-toast'
import { getServices, createService, updateService } from '../api/services'
import PageHeader from '../components/ui/PageHeader'
import SearchInput from '../components/ui/SearchInput'
import { Table, Pagination } from '../components/ui/Table'
import Modal from '../components/ui/Modal'

const schema = z.object({
  name: z.string().min(1, 'Requerido'),
  description: z.string().optional(),
  estimated_hours: z.coerce.number().min(0),
  base_price: z.coerce.number().min(0),
  active: z.boolean().optional(),
})

const fmt = (n) => `Lps ${Number(n ?? 0).toLocaleString('es-HN')}`

export default function Services() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('')
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['services', { search, activeFilter, page }],
    queryFn: () => getServices({ search, active: activeFilter !== '' ? activeFilter : undefined, page, per_page: 15 }).then((r) => r.data),
    keepPreviousData: true,
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  })

  const save = useMutation({
    mutationFn: (d) => editing ? updateService(editing.id, d) : createService(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['services'] })
      toast.success(editing ? 'Servicio actualizado' : 'Servicio creado')
      closeModal()
    },
    onError: (e) => toast.error(e.response?.data?.message ?? 'Error'),
  })


  const openNew = () => { setEditing(null); reset({ estimated_hours: 1, base_price: 0 }); setModalOpen(true) }
  const openEdit = (s) => { setEditing(s); reset({ ...s, active: !!s.active }); setModalOpen(true) }
  const closeModal = () => { setModalOpen(false); setEditing(null); reset({}) }

  const columns = [
    { key: 'name', label: 'Servicio', render: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'description', label: 'Descripción', render: (r) => <span className="text-gray-500 text-xs">{r.description}</span> },
    { key: 'estimated_hours', label: 'Horas est.', render: (r) => `${r.estimated_hours}h` },
    { key: 'base_price', label: 'Precio base', render: (r) => fmt(r.base_price) },
    {
      key: 'active', label: 'Estado',
      render: (r) => <span className={`badge ${r.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{r.active ? 'Activo' : 'Inactivo'}</span>,
    },
    {
      key: 'actions', label: '', width: '80px',
      render: (r) => (
        <div className="flex gap-1">
          <button onClick={() => openEdit(r)} className="btn-ghost p-1.5"><Edit2 size={15} /></button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Catálogo de Servicios"
        icon={Settings}
        subtitle={data ? `${data.total} servicios` : ''}
        action={<button onClick={openNew} className="btn-primary"><Plus size={16} /> Nuevo servicio</button>}
      />
      <div className="card">
        <div className="p-4 border-b border-gray-100 flex flex-wrap gap-3">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Buscar servicio..." className="flex-1 min-w-48" />
          <select value={activeFilter} onChange={(e) => { setActiveFilter(e.target.value); setPage(1) }} className="input w-auto">
            <option value="">Todos</option>
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
          </select>
        </div>
        <Table columns={columns} data={data?.data ?? []} loading={isLoading} emptyMessage="No hay servicios" />
        <Pagination meta={data} onPageChange={setPage} />
      </div>

      <Modal open={modalOpen} onClose={closeModal} title={editing ? 'Editar servicio' : 'Nuevo servicio'}>
        <form onSubmit={handleSubmit((d) => save.mutate(d))} className="space-y-4">
          <div>
            <label className="label">Nombre *</label>
            <input {...register('name')} className="input" />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
          </div>
          <div>
            <label className="label">Descripción</label>
            <textarea {...register('description')} rows={2} className="input" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Horas estimadas</label>
              <input {...register('estimated_hours')} type="number" step="0.5" className="input" />
            </div>
            <div>
              <label className="label">Precio base (Lps)</label>
              <input {...register('base_price')} type="number" step="100" className="input" />
            </div>
          </div>
          {editing && (
            <div className="flex items-center gap-2">
              <input type="checkbox" {...register('active')} id="active" className="w-4 h-4 text-primary-600" />
              <label htmlFor="active" className="text-sm text-gray-700">Servicio activo</label>
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
