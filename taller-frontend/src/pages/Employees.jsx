import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Edit2, Eye, Wrench } from 'lucide-react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getEmployees, createEmployee, updateEmployee } from '../api/employees'
import { isValidPhone, fmtPhone } from '../utils/hn'
import { fmtMoney } from '../utils/date'
import PageHeader from '../components/ui/PageHeader'
import SearchInput from '../components/ui/SearchInput'
import { Table, Pagination } from '../components/ui/Table'
import Modal from '../components/ui/Modal'

const SPECIALTIES = [
  'Mecánica general',
  'Motor y transmisión',
  'Transmisión automática',
  'Transmisión manual',
  'Frenos y suspensión',
  'Sistema eléctrico',
  'Aire acondicionado',
  'Diagnóstico computarizado',
  'Alineación y balanceo',
  'Carrocería y pintura',
  'Sistema de combustible',
  'Sistema de escape',
  'Mecánica diesel',
  'Soldadura',
  'Llantas y rines',
  'Lubricación y mantenimiento',
]

const schema = z.object({
  first_name:       z.string().min(1, 'Requerido'),
  second_name:      z.string().optional(),
  last_name:        z.string().min(1, 'Requerido'),
  second_last_name: z.string().optional(),
  specialty:        z.string().optional(),
  phone:            z.string().min(1, 'El teléfono es requerido').refine(isValidPhone, 'Teléfono inválido (8 dígitos, ej: 9999-9999)'),
  email:            z.string().email().optional().or(z.literal('')),
  biweekly_salary:  z.coerce.number().min(0, 'Debe ser >= 0'),
  active:           z.boolean().optional(),
  notes:            z.string().optional(),
})


export default function Employees() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('')
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [specialtyMode, setSpecialtyMode] = useState('list')

  const { data, isLoading } = useQuery({
    queryKey: ['employees', { search, activeFilter, page }],
    queryFn: () => getEmployees({ search, active: activeFilter !== '' ? activeFilter : undefined, page, per_page: 15 }).then((r) => r.data),
    keepPreviousData: true,
  })

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  })

  const watchedSpecialty = watch('specialty')

  const save = useMutation({
    mutationFn: (d) => editing ? updateEmployee(editing.id, d) : createEmployee(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] })
      toast.success(editing ? 'Empleado actualizado' : 'Empleado creado')
      closeModal()
    },
    onError: (e) => toast.error(e.response?.data?.message ?? 'Error'),
  })


  const openNew = () => { setEditing(null); reset({ hourly_rate: 0 }); setSpecialtyMode('list'); setModalOpen(true) }
  const openEdit = (e) => { setEditing(e); reset({ ...e, active: !!e.active }); setSpecialtyMode(SPECIALTIES.includes(e.specialty) ? 'list' : 'custom'); setModalOpen(true) }
  const closeModal = () => { setModalOpen(false); setEditing(null); reset({}); setSpecialtyMode('list') }

  const columns = [
    { key: 'name', label: 'Nombre', render: (r) => <Link to={`/employees/${r.id}`} className="font-medium text-primary-700 hover:underline">{r.name}</Link> },
    { key: 'specialty', label: 'Especialidad' },
    { key: 'phone', label: 'Teléfono' },
    { key: 'biweekly_salary', label: 'Salario quincenal', render: (r) => fmtMoney(r.biweekly_salary) },
    {
      key: 'active', label: 'Estado',
      render: (r) => <span className={`badge ${r.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{r.active ? 'Activo' : 'Inactivo'}</span>,
    },
    {
      key: 'actions', label: '', width: '100px',
      render: (r) => (
        <div className="flex gap-1">
          <Link to={`/employees/${r.id}`} className="btn-ghost p-1.5" title="Ver detalle"><Eye size={15} /></Link>
          <button onClick={() => openEdit(r)} className="btn-ghost p-1.5"><Edit2 size={15} /></button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Empleados"
        icon={Wrench}
        subtitle={data ? `${data.total} técnicos` : ''}
        action={<button onClick={openNew} className="btn-primary"><Plus size={16} /> Nuevo empleado</button>}
      />
      <div className="card">
        <div className="p-4 border-b border-gray-100 flex flex-wrap gap-3">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Buscar por nombre o especialidad..." className="flex-1 min-w-48" />
          <select value={activeFilter} onChange={(e) => { setActiveFilter(e.target.value); setPage(1) }} className="input w-auto">
            <option value="">Todos</option>
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
          </select>
        </div>
        <Table columns={columns} data={data?.data ?? []} loading={isLoading} emptyMessage="No hay empleados" />
        <Pagination meta={data} onPageChange={setPage} />
      </div>

      <Modal open={modalOpen} onClose={closeModal} title={editing ? 'Editar empleado' : 'Nuevo empleado'}>
        <form onSubmit={handleSubmit((d) => save.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Primer nombre *</label>
              <input {...register('first_name')} className="input" placeholder="Carlos" />
              {errors.first_name && <p className="mt-1 text-xs text-red-500">{errors.first_name.message}</p>}
            </div>
            <div>
              <label className="label">Segundo nombre</label>
              <input {...register('second_name')} className="input" placeholder="Alberto" />
            </div>
            <div>
              <label className="label">Primer apellido *</label>
              <input {...register('last_name')} className="input" placeholder="Méndez" />
              {errors.last_name && <p className="mt-1 text-xs text-red-500">{errors.last_name.message}</p>}
            </div>
            <div>
              <label className="label">Segundo apellido</label>
              <input {...register('second_last_name')} className="input" placeholder="García" />
            </div>
            <div>
              <label className="label">Especialidad</label>
              {specialtyMode === 'list' ? (
                <>
                  <select
                    value={watchedSpecialty || ''}
                    onChange={(e) => {
                      if (e.target.value === '__other__') {
                        setSpecialtyMode('custom')
                        setValue('specialty', '')
                      } else {
                        setValue('specialty', e.target.value)
                      }
                    }}
                    className="input"
                  >
                    <option value="">— Sin especialidad —</option>
                    {SPECIALTIES.map((s) => <option key={s} value={s}>{s}</option>)}
                    <option value="__other__">✏ Otra especialidad...</option>
                  </select>
                  <input type="hidden" {...register('specialty')} />
                </>
              ) : (
                <div className="flex gap-2">
                  <input {...register('specialty')} className="input flex-1" placeholder="Escribe la especialidad" />
                  <button type="button" onClick={() => { setSpecialtyMode('list'); setValue('specialty', '') }} className="btn-secondary text-xs whitespace-nowrap">
                    Ver lista
                  </button>
                </div>
              )}
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
            </div>
            <div>
              <label className="label">Salario quincenal (L) *</label>
              <input {...register('biweekly_salary')} type="number" step="0.01" className="input" placeholder="0.00" />
              {errors.biweekly_salary && <p className="mt-1 text-xs text-red-500">{errors.biweekly_salary.message}</p>}
            </div>
            {editing && (
              <div className="sm:col-span-2 flex items-center gap-2">
                <input type="checkbox" {...register('active')} id="active" className="w-4 h-4 text-primary-600" />
                <label htmlFor="active" className="text-sm text-gray-700">Empleado activo</label>
              </div>
            )}
            <div className="sm:col-span-2">
              <label className="label">Notas</label>
              <textarea {...register('notes')} rows={2} className="input" />
            </div>
          </div>
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
