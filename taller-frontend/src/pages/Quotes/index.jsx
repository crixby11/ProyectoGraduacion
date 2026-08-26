import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Eye, Calculator } from 'lucide-react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { fmtDate, fmtMoney } from '../../utils/date'
import { getQuotes, createQuote } from '../../api/quotes'
import { getCustomers } from '../../api/customers'
import { getVehicles } from '../../api/vehicles'
import { VEHICLE_CATALOG, BRANDS } from '../../data/vehicleCatalog'
import { getServices } from '../../api/services'
import PageHeader from '../../components/ui/PageHeader'
import SearchInput from '../../components/ui/SearchInput'
import { Table, Pagination } from '../../components/ui/Table'
import Modal from '../../components/ui/Modal'
import StatusBadge from '../../components/ui/StatusBadge'
import { isValidPhone, fmtPhone } from '../../utils/hn'

const schema = z.object({
  customer_id: z.coerce.number().min(1, 'Seleccione un cliente').optional().or(z.literal('')),
  vehicle_id: z.coerce.number().min(1, 'Seleccione un vehículo').optional().or(z.literal('')),
  service_type: z.string().optional(),
  description: z.string().optional(),
  customer_name: z.string().optional(),
  customer_phone: z.string().optional().refine(isValidPhone, 'Teléfono inválido (8 dígitos, ej: 9999-9999)'),
  vehicle_plate: z.string().optional(),
  vehicle_brand: z.string().optional(),
  vehicle_model: z.string().optional(),
})

const STATUS_OPTIONS = ['pendiente', 'aprobada', 'rechazada', 'convertida']

export default function Quotes() {
  const qc = useQueryClient()
  const [search,      setSearch]      = useState('')
  const [status,      setStatus]      = useState('')
  const [dateFrom,    setDateFrom]    = useState('')
  const [dateTo,      setDateTo]      = useState('')
  const [page,        setPage]        = useState(1)
  const [modalOpen,   setModalOpen]   = useState(false)
  const [useExisting, setUseExisting] = useState(true)
  const [brandMode,   setBrandMode]   = useState('list')
  const [modelMode,   setModelMode]   = useState('list')

  const hasFilters = !!(search || status || dateFrom || dateTo)
  const clearFilters = () => { setSearch(''); setStatus(''); setDateFrom(''); setDateTo(''); setPage(1) }

  const { data, isLoading } = useQuery({
    queryKey: ['quotes', { search, status, dateFrom, dateTo, page }],
    queryFn: () => getQuotes({
      search,
      status:    status   || undefined,
      date_from: dateFrom || undefined,
      date_to:   dateTo   || undefined,
      page,
      per_page: 15,
    }).then((r) => r.data),
    placeholderData: (prev) => prev,
  })

  const { data: customers } = useQuery({ queryKey: ['customers-all'], queryFn: () => getCustomers({ per_page: 500 }).then((r) => r.data.data) })
  const { data: servicesCat } = useQuery({ queryKey: ['services-all'], queryFn: () => getServices({ per_page: 100 }).then((r) => r.data.data) })

  const { register, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm({ resolver: zodResolver(schema) })
  const selectedCustomerId = watch('customer_id')
  const watchedBrand = watch('vehicle_brand')
  const modelsForBrand = VEHICLE_CATALOG[watchedBrand] ?? []
  const showModelSelect = modelsForBrand.length > 0 && modelMode === 'list'

  const { data: filteredVehicles = [], isFetching: fetchingVehicles } = useQuery({
    queryKey: ['vehicles-by-customer', selectedCustomerId],
    queryFn:  () => getVehicles({ customer_id: selectedCustomerId, per_page: 100 }).then((r) => r.data.data),
    enabled:  !!selectedCustomerId && useExisting && modalOpen,
  })

  useEffect(() => { setValue('vehicle_id', '') }, [selectedCustomerId, setValue])

  const create = useMutation({
    mutationFn: (d) => createQuote(d),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['quotes'] })
      toast.success(`Cotización ${res.data.number} creada`)
      setModalOpen(false)
      reset({})
    },
    onError: (e) => toast.error(e.response?.data?.message ?? 'Error'),
  })

  const columns = [
    {
      key: 'number', label: 'N° Cotización',
      render: (r) => (
        <Link to={`/quotes/${r.id}`} className="font-mono font-semibold text-primary-600 hover:underline">
          {r.number}
        </Link>
      ),
    },
    { key: 'customer', label: 'Cliente', render: (r) => r.customer_name ?? '—' },
    { key: 'vehicle', label: 'Vehículo', render: (r) => `${r.vehicle_plate ?? ''} ${r.vehicle_brand ?? ''} ${r.vehicle_model ?? ''}`.trim() || '—' },
    { key: 'total', label: 'Total estimado', render: (r) => fmtMoney(r.total) },
    { key: 'status', label: 'Estado', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'issued_at', label: 'Fecha', render: (r) => fmtDate(r.issued_at) },
    {
      key: 'actions', label: '', width: '50px',
      render: (r) => (
        <Link to={`/quotes/${r.id}`} className="btn-ghost p-1.5">
          <Eye size={15} />
        </Link>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Cotizaciones"
        icon={Calculator}
        subtitle={data ? `${data.total} cotizaciones` : ''}
        action={
          <button
            onClick={() => { reset({}); setBrandMode('list'); setModelMode('list'); setUseExisting(true); setModalOpen(true) }}
            className="btn-primary"
          >
            <Plus size={16} /> Nueva Cotización
          </button>
        }
      />

      <div className="card">
        <div className="p-4 border-b border-gray-100 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Buscar por N°, cliente, placa..." className="flex-1 min-w-48" />
            <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} className="input w-auto">
              <option value="">Todos los estados</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
            <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1) }} className="input w-auto text-xs py-1.5" />
            <span className="text-gray-300 text-xs">—</span>
            <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1) }} className="input w-auto text-xs py-1.5" />
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="ml-auto text-xs text-gray-400 hover:text-red-500 border border-gray-200 hover:border-red-300 px-3 py-1.5 rounded-full transition-colors"
              >
                ✕ Limpiar filtros
              </button>
            )}
          </div>
        </div>
        <Table
          columns={columns}
          data={data?.data ?? []}
          loading={isLoading}
          emptyMessage="No hay cotizaciones"
        />
        <Pagination meta={data} onPageChange={setPage} />
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nueva Cotización" size="lg">
        <form onSubmit={handleSubmit((d) => create.mutate(d))} className="space-y-4">
          <div className="flex gap-4 pb-2 border-b border-gray-100">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" checked={useExisting} onChange={() => setUseExisting(true)} />
              <span>Cliente existente</span>
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" checked={!useExisting} onChange={() => { setUseExisting(false); setBrandMode('list'); setModelMode('list') }} />
              <span>Datos manuales</span>
            </label>
          </div>

          {useExisting ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Cliente</label>
                <select {...register('customer_id')} className="input">
                  <option value="">Seleccionar...</option>
                  {(customers ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Vehículo</label>
                <select {...register('vehicle_id')} className="input" disabled={fetchingVehicles}>
                  {!selectedCustomerId ? (
                    <option value="">Selecciona un cliente primero...</option>
                  ) : fetchingVehicles ? (
                    <option value="">Cargando vehículos...</option>
                  ) : filteredVehicles.length === 0 ? (
                    <option value="">Este cliente no tiene vehículos registrados</option>
                  ) : (
                    <>
                      <option value="">Seleccionar...</option>
                      {filteredVehicles.map((v) => <option key={v.id} value={v.id}>{v.plate} — {v.brand} {v.model}</option>)}
                    </>
                  )}
                </select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Nombre cliente</label>
                <input {...register('customer_name')} className="input" />
              </div>
              <div>
                <label className="label">Teléfono</label>
                <input
                  {...register('customer_phone')}
                  onChange={(e) => setValue('customer_phone', fmtPhone(e.target.value), { shouldValidate: true })}
                  className="input" placeholder="9999-9999" maxLength={9}
                />
                {errors.customer_phone && <p className="mt-1 text-xs text-red-500">{errors.customer_phone.message}</p>}
              </div>
              <div>
                <label className="label">Placa</label>
                <input {...register('vehicle_plate')} className="input uppercase" />
              </div>
              <div>
                <label className="label">Marca</label>
                {brandMode === 'list' ? (
                  <>
                    <select value={watchedBrand || ''} onChange={(e) => { if (e.target.value === '__other__') { setBrandMode('custom'); setValue('vehicle_brand', ''); setValue('vehicle_model', ''); setModelMode('list') } else { setValue('vehicle_brand', e.target.value); setValue('vehicle_model', ''); setModelMode('list') } }} className="input">
                      <option value="">— Seleccionar marca —</option>
                      {BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
                      <option value="__other__">✏ Otra marca...</option>
                    </select>
                    <input type="hidden" {...register('vehicle_brand')} />
                  </>
                ) : (
                  <div className="flex gap-2">
                    <input {...register('vehicle_brand')} className="input flex-1" placeholder="Escribe la marca" />
                    <button type="button" onClick={() => { setBrandMode('list'); setValue('vehicle_brand', ''); setValue('vehicle_model', '') }} className="btn-secondary text-xs whitespace-nowrap">Ver lista</button>
                  </div>
                )}
              </div>
              <div>
                <label className="label">Modelo</label>
                {showModelSelect ? (
                  <>
                    <select value={watch('vehicle_model') || ''} onChange={(e) => { if (e.target.value === '__other__') { setModelMode('custom'); setValue('vehicle_model', '') } else { setValue('vehicle_model', e.target.value) } }} className="input">
                      <option value="">— Seleccionar modelo —</option>
                      {modelsForBrand.map((m) => <option key={m} value={m}>{m}</option>)}
                      <option value="__other__">✏ Otro modelo...</option>
                    </select>
                    <input type="hidden" {...register('vehicle_model')} />
                  </>
                ) : (
                  <div className="flex gap-2">
                    <input {...register('vehicle_model')} className="input flex-1" placeholder="Modelo" />
                    {modelsForBrand.length > 0 && <button type="button" onClick={() => { setModelMode('list'); setValue('vehicle_model', '') }} className="btn-secondary text-xs whitespace-nowrap">Ver lista</button>}
                  </div>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="label">Tipo de servicio</label>
            <select {...register('service_type')} className="input">
              <option value="">— Seleccionar tipo —</option>
              {(servicesCat ?? []).map((s) => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Descripción del trabajo a cotizar</label>
            <textarea {...register('description')} rows={3} className="input" placeholder="Describe lo que el cliente pide cotizar..." />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={create.isPending} className="btn-primary">
              {create.isPending ? 'Creando...' : 'Crear Cotización'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
