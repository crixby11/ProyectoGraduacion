import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Edit2, TrendingUp, AlertTriangle, Clock, ArrowDownCircle, ArrowUpCircle, Package } from 'lucide-react'
import toast from 'react-hot-toast'
import { getInventory, createInventoryItem, updateInventoryItem, adjustInventory, getCategories, getInventoryMovements } from '../api/inventory'
import { getSuppliers } from '../api/suppliers'
import { fmtMoney } from '../utils/date'
import PageHeader from '../components/ui/PageHeader'
import SearchInput from '../components/ui/SearchInput'
import { Table, Pagination } from '../components/ui/Table'
import Modal from '../components/ui/Modal'

const CATEGORIES = [
  'Aceites y lubricantes',
  'Filtros',
  'Frenos',
  'Suspensión',
  'Motor',
  'Transmisión',
  'Sistema eléctrico',
  'Baterías',
  'Correas y cadenas',
  'Refrigeración',
  'Dirección',
  'Sistema de escape',
  'Encendido',
  'Sistema de combustible',
  'Llantas y rines',
  'Carrocería',
  'Iluminación',
  'Aire acondicionado',
  'Rodamientos y retenes',
]

const schema = z.object({
  name: z.string().min(1, 'Requerido'),
  sku: z.string().optional(),
  brand: z.string().optional(),
  supplier_id: z.coerce.number().optional().or(z.literal('')),
  category: z.string().optional(),
  description: z.string().optional(),
  stock: z.coerce.number().min(0),
  min_stock: z.coerce.number().min(0),
  cost: z.coerce.number().min(0),
  sale_price: z.coerce.number().min(0),
  unit: z.string().optional(),
  active: z.boolean().optional(),
})

const adjustSchema = z.object({
  type: z.enum(['entrada', 'salida']),
  quantity: z.coerce.number().min(1),
  reason: z.string().optional(),
})


export default function Inventory() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [supplierFilter, setSupplierFilter] = useState('')
  const [activeFilter, setActiveFilter] = useState('')
  const [lowStock, setLowStock] = useState(false)
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [adjustModal, setAdjustModal] = useState(null)
  const [editing, setEditing] = useState(null)
  const [categoryMode, setCategoryMode] = useState('list')
  const [historyModal, setHistoryModal] = useState(null)
  const [historyPage, setHistoryPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['inventory', { search, categoryFilter, supplierFilter, activeFilter, lowStock, page }],
    queryFn: () => getInventory({
      search,
      category: categoryFilter || undefined,
      supplier_id: supplierFilter || undefined,
      low_stock: lowStock || undefined,
      active: activeFilter !== '' ? activeFilter : undefined,
      page,
      per_page: 15,
    }).then((r) => r.data),
    keepPreviousData: true,
  })

  const { data: categoriesData } = useQuery({
    queryKey: ['inventory-categories'],
    queryFn: () => getCategories().then((r) => r.data),
  })

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers-all'],
    queryFn: () => getSuppliers({ active: true, per_page: 200 }).then((r) => r.data.data),
  })

  const { data: movementsData, isLoading: movementsLoading } = useQuery({
    queryKey: ['inventory-movements', historyModal?.id, historyPage],
    queryFn: () => getInventoryMovements(historyModal.id, { page: historyPage, per_page: 20 }).then((r) => r.data),
    enabled: !!historyModal?.id,
    keepPreviousData: true,
  })

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({ resolver: zodResolver(schema) })
  const watchedCategory = watch('category')
  const {
    register: regAdj, handleSubmit: handleAdj, reset: resetAdj,
    formState: { errors: adjErrors },
  } = useForm({ resolver: zodResolver(adjustSchema) })

  const save = useMutation({
    mutationFn: (d) => editing ? updateInventoryItem(editing.id, d) : createInventoryItem(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] })
      toast.success(editing ? 'Repuesto actualizado' : 'Repuesto creado')
      closeModal()
    },
    onError: (e) => toast.error(e.response?.data?.message ?? 'Error'),
  })

  const adjust = useMutation({
    mutationFn: (d) => adjustInventory(adjustModal.id, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] })
      qc.invalidateQueries({ queryKey: ['inventory-movements', adjustModal.id] })
      toast.success('Stock ajustado')
      setAdjustModal(null)
      resetAdj()
    },
    onError: (e) => toast.error(e.response?.data?.message ?? 'Error'),
  })


  const openNew = () => { setEditing(null); reset({ stock: 0, min_stock: 5, cost: 0, sale_price: 0, unit: 'unidad', active: true }); setCategoryMode('list'); setModalOpen(true) }
  const openEdit = (item) => { setEditing(item); reset({ ...item, active: !!item.active }); setCategoryMode(CATEGORIES.includes(item.category) ? 'list' : 'custom'); setModalOpen(true) }
  const closeModal = () => { setModalOpen(false); setEditing(null); reset({}); setCategoryMode('list') }

  const columns = [
    {
      key: 'name', label: 'Repuesto',
      render: (r) => (
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium">{r.name}</p>
            {!r.active && (
              <span className="inline-flex items-center text-xs font-medium bg-red-50 text-red-600 ring-1 ring-red-200 rounded px-1.5 py-0.5">
                Inactivo
              </span>
            )}
          </div>
          {r.sku && <p className="text-xs text-gray-400 font-mono">{r.sku}</p>}
        </div>
      ),
    },
    { key: 'brand', label: 'Marca' },
    { key: 'supplier', label: 'Proveedor', render: (r) => r.supplier?.name ?? <span className="text-gray-300">—</span> },
    { key: 'category', label: 'Categoría' },
    {
      key: 'stock', label: 'Stock',
      render: (r) => (
        <div className="flex items-center gap-1.5">
          {r.stock <= r.min_stock && <AlertTriangle size={14} className="text-yellow-500" />}
          <span className={`font-semibold ${r.stock <= r.min_stock ? 'text-yellow-600' : 'text-gray-900'}`}>
            {r.stock} {r.unit}
          </span>
          <span className="text-xs text-gray-400">(mín: {r.min_stock})</span>
        </div>
      ),
    },
    { key: 'sale_price', label: 'Precio venta', render: (r) => fmtMoney(r.sale_price) },
    {
      key: 'actions', label: '', width: '140px',
      render: (r) => (
        <div className="flex gap-1">
          <button onClick={() => { setAdjustModal(r); resetAdj({ type: 'entrada', quantity: 1 }) }} className="btn-ghost p-1.5 text-green-600" title="Ajustar stock">
            <TrendingUp size={15} />
          </button>
          <button onClick={() => { setHistoryModal(r); setHistoryPage(1) }} className="btn-ghost p-1.5 text-gray-500" title="Ver historial">
            <Clock size={15} />
          </button>
          <button onClick={() => openEdit(r)} className="btn-ghost p-1.5"><Edit2 size={15} /></button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Inventario"
        icon={Package}
        subtitle={data ? `${data.total} productos` : ''}
        action={<button onClick={openNew} className="btn-primary"><Plus size={16} /> Nuevo repuesto</button>}
      />
      <div className="card">
        <div className="p-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Buscar por nombre, SKU, marca..." className="flex-1 min-w-48" />
          <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1) }} className="input w-auto">
            <option value="">Todas las categorías</option>
            {(categoriesData ?? []).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={supplierFilter} onChange={(e) => { setSupplierFilter(e.target.value); setPage(1) }} className="input w-auto">
            <option value="">Todos los proveedores</option>
            {(suppliers ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={activeFilter} onChange={(e) => { setActiveFilter(e.target.value); setPage(1) }} className="input w-auto">
            <option value="">Activos e inactivos</option>
            <option value="1">Solo activos</option>
            <option value="0">Solo inactivos</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer whitespace-nowrap">
            <input type="checkbox" checked={lowStock} onChange={(e) => { setLowStock(e.target.checked); setPage(1) }} className="w-4 h-4 text-yellow-500" />
            Stock bajo
          </label>
        </div>
        <Table columns={columns} data={data?.data ?? []} loading={isLoading} emptyMessage="No hay repuestos" />
        <Pagination meta={data} onPageChange={setPage} />
      </div>

      {/* Modal crear/editar */}
      <Modal open={modalOpen} onClose={closeModal} title={editing ? 'Editar repuesto' : 'Nuevo repuesto'} size="lg">
        <form onSubmit={handleSubmit((d) => save.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Nombre *</label>
              <input {...register('name')} className="input" />
              {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
            </div>
            <div>
              <label className="label">SKU</label>
              <input {...register('sku')} className="input font-mono" />
            </div>
            <div>
              <label className="label">Marca</label>
              <input {...register('brand')} className="input" />
            </div>
            <div>
              <label className="label">Proveedor</label>
              <select {...register('supplier_id')} className="input">
                <option value="">— Sin proveedor —</option>
                {(suppliers ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Categoría</label>
              {categoryMode === 'list' ? (
                <>
                  <select
                    value={watchedCategory || ''}
                    onChange={(e) => {
                      if (e.target.value === '__other__') {
                        setCategoryMode('custom')
                        setValue('category', '')
                      } else {
                        setValue('category', e.target.value)
                      }
                    }}
                    className="input"
                  >
                    <option value="">— Sin categoría —</option>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    <option value="__other__">✏ Otra categoría...</option>
                  </select>
                  <input type="hidden" {...register('category')} />
                </>
              ) : (
                <div className="flex gap-2">
                  <input {...register('category')} className="input flex-1" placeholder="Escribe la categoría" />
                  <button type="button" onClick={() => { setCategoryMode('list'); setValue('category', '') }} className="btn-secondary text-xs whitespace-nowrap">
                    Ver lista
                  </button>
                </div>
              )}
            </div>
            <div>
              <label className="label">Unidad</label>
              <input {...register('unit')} className="input" placeholder="unidad, litro, par..." />
            </div>
            <div>
              <label className="label">Stock actual</label>
              <input {...register('stock')} type="number" className="input" />
            </div>
            <div>
              <label className="label">Stock mínimo</label>
              <input {...register('min_stock')} type="number" className="input" />
            </div>
            <div>
              <label className="label">Costo (L)</label>
              <input {...register('cost')} type="number" step="100" className="input" />
            </div>
            <div>
              <label className="label">Precio de venta (L)</label>
              <input {...register('sale_price')} type="number" step="100" className="input" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Descripción</label>
              <textarea {...register('description')} rows={2} className="input" />
            </div>
            <div className="sm:col-span-2 flex items-center gap-2">
              <input type="checkbox" {...register('active')} id="inv-active" className="w-4 h-4 text-primary-600" />
              <label htmlFor="inv-active" className="text-sm text-gray-700">Repuesto activo</label>
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

      {/* Modal historial de movimientos */}
      <Modal open={!!historyModal} onClose={() => setHistoryModal(null)} title={`Historial — ${historyModal?.name}`} size="lg">
        {movementsLoading ? (
          <div className="py-10 text-center text-gray-400 text-sm">Cargando...</div>
        ) : (movementsData?.data ?? []).length === 0 ? (
          <div className="py-10 text-center text-gray-400 text-sm">Sin movimientos registrados</div>
        ) : (
          <div className="space-y-3">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs text-gray-500 uppercase tracking-wide">
                    <th className="pb-2 pr-4">Fecha</th>
                    <th className="pb-2 pr-4">Tipo</th>
                    <th className="pb-2 pr-4 text-right">Cant.</th>
                    <th className="pb-2 pr-4 text-right">Antes</th>
                    <th className="pb-2 pr-4 text-right">Después</th>
                    <th className="pb-2 pr-4">Motivo</th>
                    <th className="pb-2">Usuario</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(movementsData?.data ?? []).map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="py-2 pr-4 text-gray-500 whitespace-nowrap">
                        {new Date(m.created_at).toLocaleDateString('es-HN', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                        <span className="block text-xs text-gray-400">
                          {new Date(m.created_at).toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>
                      <td className="py-2 pr-4">
                        {m.type === 'entrada' ? (
                          <span className="inline-flex items-center gap-1 text-green-700 font-medium">
                            <ArrowDownCircle size={14} className="text-green-500" /> Entrada
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-700 font-medium">
                            <ArrowUpCircle size={14} className="text-red-500" /> Salida
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-4 text-right font-semibold">{m.quantity}</td>
                      <td className="py-2 pr-4 text-right text-gray-500">{m.stock_before}</td>
                      <td className="py-2 pr-4 text-right font-medium">{m.stock_after}</td>
                      <td className="py-2 pr-4 text-gray-600 max-w-[140px] truncate">{m.reason ?? <span className="text-gray-300">—</span>}</td>
                      <td className="py-2 text-gray-500 text-xs">{m.user?.name ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {movementsData?.last_page > 1 && (
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <span className="text-xs text-gray-500">Página {movementsData.current_page} de {movementsData.last_page}</span>
                <div className="flex gap-2">
                  <button disabled={historyPage <= 1} onClick={() => setHistoryPage((p) => p - 1)} className="btn-secondary text-xs py-1 px-3 disabled:opacity-40">Anterior</button>
                  <button disabled={historyPage >= movementsData.last_page} onClick={() => setHistoryPage((p) => p + 1)} className="btn-secondary text-xs py-1 px-3 disabled:opacity-40">Siguiente</button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal ajuste de stock */}
      <Modal open={!!adjustModal} onClose={() => setAdjustModal(null)} title={`Ajustar stock — ${adjustModal?.name}`} size="sm">
        <form onSubmit={handleAdj((d) => adjust.mutate(d))} className="space-y-4">
          <div className="text-center py-2">
            <p className="text-3xl font-bold text-gray-900">{adjustModal?.stock}</p>
            <p className="text-sm text-gray-500">unidades actuales</p>
          </div>
          <div>
            <label className="label">Tipo de movimiento</label>
            <select {...regAdj('type')} className="input">
              <option value="entrada">Entrada (agregar)</option>
              <option value="salida">Salida (restar)</option>
            </select>
          </div>
          <div>
            <label className="label">Cantidad</label>
            <input {...regAdj('quantity')} type="number" min="1" className="input" />
            {adjErrors.quantity && <p className="mt-1 text-xs text-red-500">{adjErrors.quantity.message}</p>}
          </div>
          <div>
            <label className="label">Motivo</label>
            <input {...regAdj('reason')} className="input" placeholder="Compra, merma, devolución..." />
          </div>
          <p className="text-xs text-gray-400">
            Para registrar una compra a proveedor (con su deuda y comprobantes), usa <strong>Órdenes de Compra</strong>. Este ajuste solo mueve cantidades.
          </p>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setAdjustModal(null)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={adjust.isPending} className="btn-primary">
              {adjust.isPending ? 'Guardando...' : 'Confirmar ajuste'}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  )
}
