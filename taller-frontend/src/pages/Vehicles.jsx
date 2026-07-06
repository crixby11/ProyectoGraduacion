import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Edit2, Eye, Car } from 'lucide-react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getVehicles, createVehicle, updateVehicle } from '../api/vehicles'
import { getCustomers } from '../api/customers'
import { VEHICLE_CATALOG, BRANDS } from '../data/vehicleCatalog'
import PageHeader from '../components/ui/PageHeader'
import SearchInput from '../components/ui/SearchInput'
import { Table, Pagination } from '../components/ui/Table'
import Modal from '../components/ui/Modal'

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

export default function Vehicles() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [brand, setBrand] = useState('')
  const [year, setYear] = useState('')
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [brandMode, setBrandMode] = useState('list')
  const [modelMode, setModelMode] = useState('list')

  const resetFilters = () => { setSearch(''); setCustomerId(''); setBrand(''); setYear(''); setPage(1) }
  const hasFilters = search || customerId || brand || year

  const { data, isLoading } = useQuery({
    queryKey: ['vehicles', { search, customerId, brand, year, page }],
    queryFn: () => getVehicles({ search, customer_id: customerId || undefined, brand: brand || undefined, year: year || undefined, page, per_page: 15 }).then((r) => r.data),
    keepPreviousData: true,
  })

  const { data: customersData } = useQuery({
    queryKey: ['customers-all'],
    queryFn: () => getCustomers({ per_page: 500 }).then((r) => r.data.data),
  })

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  })

  const watchedBrand = watch('brand')
  const watchedModel = watch('model')
  const modelsForBrand = VEHICLE_CATALOG[watchedBrand] ?? []
  const showModelSelect = modelsForBrand.length > 0 && modelMode === 'list'

  const save = useMutation({
    mutationFn: (d) => editing ? updateVehicle(editing.id, d) : createVehicle(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicles'] })
      toast.success(editing ? 'Vehículo actualizado' : 'Vehículo creado')
      closeModal()
    },
    onError: (e) => toast.error(e.response?.data?.message ?? 'Error'),
  })


  const openNew = () => {
    setEditing(null)
    reset({})
    setBrandMode('list')
    setModelMode('list')
    setModalOpen(true)
  }

  const openEdit = (v) => {
    setEditing(v)
    reset({ ...v, customer_id: v.customer_id })
    setBrandMode(BRANDS.includes(v.brand) ? 'list' : 'custom')
    setModelMode((VEHICLE_CATALOG[v.brand] ?? []).includes(v.model) ? 'list' : 'custom')
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditing(null)
    reset({})
    setBrandMode('list')
    setModelMode('list')
  }

  const columns = [
    { key: 'plate', label: 'Placa', render: (r) => <Link to={`/vehicles/${r.id}`} className="font-mono font-semibold text-primary-700 hover:underline">{r.plate}</Link> },
    { key: 'vehicle', label: 'Vehículo', render: (r) => `${r.brand} ${r.model} ${r.year ?? ''}` },
    { key: 'color', label: 'Color' },
    { key: 'customer', label: 'Propietario', render: (r) => r.customer?.name ?? '—' },
    { key: 'engine_type', label: 'Motor' },
    {
      key: 'actions', label: '', width: '80px',
      render: (r) => (
        <div className="flex gap-1">
          <Link to={`/vehicles/${r.id}`} className="btn-ghost p-1.5" title="Ver detalle"><Eye size={15} /></Link>
          <button onClick={() => openEdit(r)} className="btn-ghost p-1.5"><Edit2 size={15} /></button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Vehículos"
        icon={Car}
        subtitle={data ? `${data.total} registros` : ''}
        action={<button onClick={openNew} className="btn-primary"><Plus size={16} /> Nuevo vehículo</button>}
      />

      <div className="card">
        <div className="p-4 border-b border-gray-100 space-y-3">
          <div className="flex flex-wrap gap-3">
            <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Buscar por placa, marca, modelo..." className="min-w-56 flex-1" />
            <select
              value={customerId}
              onChange={(e) => { setCustomerId(e.target.value); setPage(1) }}
              className="input max-w-xs"
            >
              <option value="">Todos los propietarios</option>
              {(customersData ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <input
              type="text"
              value={brand}
              onChange={(e) => { setBrand(e.target.value); setPage(1) }}
              placeholder="Marca..."
              className="input w-36"
            />
            <input
              type="number"
              value={year}
              onChange={(e) => { setYear(e.target.value); setPage(1) }}
              placeholder="Año..."
              className="input w-28"
              min="1900"
              max="2099"
            />
            {hasFilters && (
              <button onClick={resetFilters} className="btn-ghost text-sm text-gray-500">
                Limpiar filtros
              </button>
            )}
          </div>
        </div>
        <Table columns={columns} data={data?.data ?? []} loading={isLoading} emptyMessage="No hay vehículos" />
        <Pagination meta={data} onPageChange={setPage} />
      </div>

      <Modal open={modalOpen} onClose={closeModal} title={editing ? 'Editar vehículo' : 'Nuevo vehículo'} size="lg">
        <form onSubmit={handleSubmit((d) => save.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Propietario *</label>
              <select {...register('customer_id')} className="input">
                <option value="">Seleccionar cliente...</option>
                {(customersData ?? []).map((c) => (
                  <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>
                ))}
              </select>
              {errors.customer_id && <p className="mt-1 text-xs text-red-500">{errors.customer_id.message}</p>}
            </div>
            <div>
              <label className="label">Placa *</label>
              <input {...register('plate')} className="input uppercase" placeholder="ABC123" />
              {errors.plate && <p className="mt-1 text-xs text-red-500">{errors.plate.message}</p>}
            </div>
            <div>
              <label className="label">Color</label>
              <input {...register('color')} className="input" placeholder="Blanco" />
            </div>
            <div>
              <label className="label">Marca *</label>
              {brandMode === 'list' ? (
                <>
                  <select
                    value={watchedBrand || ''}
                    onChange={(e) => {
                      if (e.target.value === '__other__') {
                        setBrandMode('custom')
                        setValue('brand', '')
                        setValue('model', '')
                        setModelMode('list')
                      } else {
                        setValue('brand', e.target.value)
                        setValue('model', '')
                        setModelMode('list')
                      }
                    }}
                    className="input"
                  >
                    <option value="">— Seleccionar marca —</option>
                    {BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
                    <option value="__other__">✏ Otra marca...</option>
                  </select>
                  <input type="hidden" {...register('brand')} />
                </>
              ) : (
                <div className="flex gap-2">
                  <input {...register('brand')} className="input flex-1" placeholder="Escribe la marca" />
                  <button type="button" onClick={() => { setBrandMode('list'); setValue('brand', ''); setValue('model', '') }} className="btn-secondary text-xs whitespace-nowrap">
                    Ver lista
                  </button>
                </div>
              )}
              {errors.brand && <p className="mt-1 text-xs text-red-500">{errors.brand.message}</p>}
            </div>
            <div>
              <label className="label">Modelo *</label>
              {showModelSelect ? (
                <>
                  <select
                    value={watchedModel || ''}
                    onChange={(e) => {
                      if (e.target.value === '__other__') {
                        setModelMode('custom')
                        setValue('model', '')
                      } else {
                        setValue('model', e.target.value)
                      }
                    }}
                    className="input"
                  >
                    <option value="">— Seleccionar modelo —</option>
                    {modelsForBrand.map((m) => <option key={m} value={m}>{m}</option>)}
                    <option value="__other__">✏ Otro modelo...</option>
                  </select>
                  <input type="hidden" {...register('model')} />
                </>
              ) : (
                <div className="flex gap-2">
                  <input {...register('model')} className="input flex-1" placeholder="Modelo" />
                  {modelsForBrand.length > 0 && (
                    <button type="button" onClick={() => { setModelMode('list'); setValue('model', '') }} className="btn-secondary text-xs whitespace-nowrap">
                      Ver lista
                    </button>
                  )}
                </div>
              )}
              {errors.model && <p className="mt-1 text-xs text-red-500">{errors.model.message}</p>}
            </div>
            <div>
              <label className="label">Año</label>
              <input {...register('year')} type="number" className="input" placeholder="2020" />
            </div>
            <div>
              <label className="label">Motor</label>
              <input {...register('engine_type')} className="input" placeholder="1.8L DOHC" />
            </div>
            <div>
              <label className="label">VIN</label>
              <input {...register('vin')} className="input" placeholder="1HGCM82633A004352" />
            </div>
            <div>
              <label className="label">Cilindraje</label>
              <input {...register('displacement')} className="input" placeholder="1800cc" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Descripción / Observaciones</label>
              <textarea {...register('description')} rows={2} className="input" />
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
