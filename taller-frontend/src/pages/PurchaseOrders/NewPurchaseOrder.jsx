import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { ArrowLeft, Plus, Trash2, Edit2, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import { createPurchaseOrder } from '../../api/purchaseOrders'
import { getSuppliers } from '../../api/suppliers'
import { getInventory } from '../../api/inventory'
import Modal from '../../components/ui/Modal'
import { fmtMoney } from '../../utils/date'
import { UNIT_OPTIONS, isVariablePack, packSize, packLabel, stockUnitLabel } from '../../utils/inventory'

const PAYMENT_TERMS = ['Contado', 'Crédito 15 días', 'Crédito 30 días', 'Crédito 45 días', 'Crédito 60 días']

const TAX_LABELS = { exento: 'Exento', gravado_15: 'Gravado 15%', gravado_18: 'Gravado 18%' }

function round2(n) { return Math.round(n * 100) / 100 }

function computeTotals(items) {
  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_cost, 0)
  const discount_total = items.reduce((s, i) => s + Number(i.discount || 0), 0)
  const taxableBase = (type) => items
    .filter((i) => i.tax_type === type)
    .reduce((s, i) => s + (i.quantity * i.unit_cost - Number(i.discount || 0)), 0)
  const exempt_amount = taxableBase('exento')
  const taxed_15_amount = taxableBase('gravado_15')
  const taxed_18_amount = taxableBase('gravado_18')
  const tax_15_amount = round2(taxed_15_amount * 0.15)
  const tax_18_amount = round2(taxed_18_amount * 0.18)
  const total = exempt_amount + taxed_15_amount + tax_15_amount + taxed_18_amount + tax_18_amount
  return { subtotal, discount_total, exempt_amount, taxed_15_amount, tax_15_amount, taxed_18_amount, tax_18_amount, total }
}

export default function NewPurchaseOrder() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [items, setItems] = useState([])
  const [itemModal, setItemModal] = useState(false)
  const [editingIndex, setEditingIndex] = useState(null)
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { order_date: new Date().toISOString().slice(0, 10) },
  })

  const { data: suppliers } = useQuery({ queryKey: ['suppliers-all'], queryFn: () => getSuppliers({ per_page: 500, active: true }).then((r) => r.data.data) })
  const { data: inventoryItems } = useQuery({ queryKey: ['inventory-all'], queryFn: () => getInventory({ per_page: 500 }).then((r) => r.data.data) })

  const { register: regItem, handleSubmit: handleItem, reset: resetItem, watch: watchItem } = useForm({
    defaultValues: { tax_type: 'gravado_15', quantity: 1, discount: 0 },
  })
  const selectedInvId = watchItem('inventory_id')
  const selectedInv = selectedInvId && selectedInvId !== 'manual'
    ? inventoryItems?.find((i) => String(i.id) === String(selectedInvId))
    : null
  const watchQty = Number(watchItem('quantity') || 0)
  const manualUnit = watchItem('unit_manual') || 'unidad'
  const manualPack = watchItem('pack_manual')
  // Empaque efectivo de la línea: el configurado en el repuesto, o el que se elija si es producto nuevo
  const linePack = selectedInv
    ? { unit: selectedInv.unit, perPack: selectedInv.units_per_pack }
    : { unit: manualUnit, perPack: packSize(manualUnit, manualPack) }
  const linePackSize = packSize(linePack.unit, linePack.perPack)

  const totals = computeTotals(items)

  const openAdd = () => { setEditingIndex(null); resetItem({ tax_type: 'gravado_15', quantity: 1, discount: 0, unit_manual: '' }); setItemModal(true) }
  const openEdit = (idx) => {
    const it = items[idx]
    setEditingIndex(idx)
    resetItem({
      inventory_id: it.inventory_id ? String(it.inventory_id) : 'manual',
      item_name_manual: it.item_name, item_sku_manual: it.item_sku, unit_manual: it.unit ?? 'unidad', pack_manual: it.units_per_pack,
      quantity: it.quantity, unit_cost: it.unit_cost, discount: it.discount, tax_type: it.tax_type,
    })
    setItemModal(true)
  }

  const onItemSubmit = (d) => {
    const isManual = !d.inventory_id || d.inventory_id === 'manual'
    const inv = !isManual ? inventoryItems?.find((i) => String(i.id) === String(d.inventory_id)) : null
    const line = {
      inventory_id: inv?.id ?? null,
      item_name: inv?.name ?? d.item_name_manual,
      item_sku: inv?.sku ?? d.item_sku_manual ?? null,
      unit: inv?.unit ?? d.unit_manual ?? 'unidad',
      units_per_pack: inv ? inv.units_per_pack : packSize(d.unit_manual ?? 'unidad', d.pack_manual),
      quantity: Number(d.quantity),
      unit_cost: Number(d.unit_cost),
      discount: Number(d.discount ?? 0),
      tax_type: d.tax_type,
    }
    line.subtotal = round2(line.quantity * line.unit_cost - line.discount)

    if (editingIndex !== null) {
      setItems((prev) => prev.map((it, i) => (i === editingIndex ? line : it)))
    } else {
      setItems((prev) => [...prev, line])
    }
    setItemModal(false)
  }

  const removeItem = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx))

  const onHeaderSubmit = async (header) => {
    if (items.length === 0) {
      toast.error('Agrega al menos un producto a la orden')
      return
    }
    setSaving(true)
    try {
      const poRes = await createPurchaseOrder({
        ...header,
        items: items.map((it) => ({
          inventory_id: it.inventory_id ?? undefined,
          item_name: it.item_name,
          item_sku: it.item_sku ?? undefined,
          unit: it.unit ?? undefined,
          units_per_pack: it.units_per_pack ?? undefined,
          quantity: it.quantity,
          unit_cost: it.unit_cost,
          discount: it.discount,
          tax_type: it.tax_type,
        })),
      })
      const po = poRes.data

      qc.invalidateQueries({ queryKey: ['purchase-orders'] })
      toast.success(`Orden ${po.number} creada con ${items.length} producto(s)`)
      navigate(`/purchase-orders/${po.id}`)
    } catch (e) {
      toast.error(e.response?.data?.message ?? 'Error al crear la orden')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/purchase-orders')} className="btn-ghost p-2">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Nueva Orden de Compra</h1>
      </div>

      <form onSubmit={handleSubmit(onHeaderSubmit)} className="space-y-6">
        {/* Datos de la compra */}
        <div className="card p-4">
          <h3 className="font-semibold text-gray-800 mb-3">Datos de la compra</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Proveedor *</label>
              <select {...register('supplier_id', { required: true })} className="input" required>
                <option value="">Seleccionar...</option>
                {(suppliers ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              {errors.supplier_id && <p className="mt-1 text-xs text-red-500">Selecciona un proveedor</p>}
            </div>
            <div>
              <label className="label">N° de factura del proveedor</label>
              <input {...register('supplier_invoice_number')} className="input" placeholder="Ej: 014-002-01-0007412" />
            </div>
            <div>
              <label className="label">Condición de pago *</label>
              <select {...register('payment_terms', { required: true })} className="input" required>
                <option value="">Seleccionar...</option>
                {PAYMENT_TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              {errors.payment_terms && <p className="mt-1 text-xs text-red-500">Selecciona una condición de pago</p>}
            </div>
            <div>
              <label className="label">Fecha</label>
              <input {...register('order_date')} type="date" className="input" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Notas</label>
              <textarea {...register('notes')} rows={2} className="input" />
            </div>
          </div>
        </div>

        {/* Productos */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800">Productos ({items.length})</h3>
            <button type="button" onClick={openAdd} className="btn-secondary text-xs py-1.5">
              <Plus size={14} /> Agregar producto
            </button>
          </div>
          {items.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">Agrega los productos de la factura antes de guardar la orden</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-1.5 text-gray-500 font-medium">Producto</th>
                  <th className="text-right text-gray-500 font-medium">Cant.</th>
                  <th className="text-right text-gray-500 font-medium">Costo por empaque</th>
                  <th className="text-right text-gray-500 font-medium">Desc.</th>
                  <th className="text-left text-gray-500 font-medium pl-2">Impuesto</th>
                  <th className="text-right text-gray-500 font-medium">Subtotal</th>
                  <th className="w-16"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={idx} className="border-b border-gray-50 group">
                    <td className="py-1.5">{it.item_name}<br /><span className="text-xs text-gray-400 font-mono">{it.item_sku}</span></td>
                    <td className="text-right">
                      {it.quantity} {packLabel(it.unit, it.units_per_pack)}
                      {it.units_per_pack > 1 && <span className="block text-xs text-gray-400">= {it.quantity * it.units_per_pack} unidades</span>}
                    </td>
                    <td className="text-right">{fmtMoney(it.unit_cost)}</td>
                    <td className="text-right">{Number(it.discount) > 0 ? fmtMoney(it.discount) : '—'}</td>
                    <td className="pl-2 text-xs text-gray-500">{TAX_LABELS[it.tax_type]}</td>
                    <td className="text-right font-medium">{fmtMoney(it.subtotal)}</td>
                    <td className="text-right py-1.5 pl-2">
                      <div className="flex gap-0.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button type="button" onClick={() => openEdit(idx)} className="btn-ghost p-1 text-gray-400 hover:text-primary-600" title="Editar">
                          <Edit2 size={13} />
                        </button>
                        <button type="button" onClick={() => removeItem(idx)} className="btn-ghost p-1 text-gray-300 hover:text-red-500" title="Eliminar">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Totales — calculados automáticamente, no editables */}
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Lock size={14} className="text-gray-400" />
            <h3 className="font-semibold text-gray-800">Totales</h3>
            <span className="text-xs text-gray-400">calculados automáticamente a partir de los productos</span>
          </div>
          <div className="max-w-sm ml-auto space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{fmtMoney(totals.subtotal)}</span></div>
            {totals.discount_total > 0 && (
              <div className="flex justify-between text-gray-500"><span>Descuento</span><span>- {fmtMoney(totals.discount_total)}</span></div>
            )}
            {totals.exempt_amount > 0 && (
              <div className="flex justify-between"><span className="text-gray-500">Exento</span><span>{fmtMoney(totals.exempt_amount)}</span></div>
            )}
            {totals.taxed_15_amount > 0 && (
              <>
                <div className="flex justify-between"><span className="text-gray-500">Gravado 15%</span><span>{fmtMoney(totals.taxed_15_amount)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">ISV 15%</span><span>{fmtMoney(totals.tax_15_amount)}</span></div>
              </>
            )}
            {totals.taxed_18_amount > 0 && (
              <>
                <div className="flex justify-between"><span className="text-gray-500">Gravado 18%</span><span>{fmtMoney(totals.taxed_18_amount)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">ISV 18%</span><span>{fmtMoney(totals.tax_18_amount)}</span></div>
              </>
            )}
            <div className="flex justify-between font-semibold text-base border-t border-gray-200 pt-1.5 mt-1.5">
              <span>Total</span><span className="text-primary-700">{fmtMoney(totals.total)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <p className="text-xs text-gray-400 mr-auto flex items-center gap-1.5">
            <Lock size={12} /> Revisa bien los datos: una vez guardada, la orden no se puede modificar.
          </p>
          <button type="button" onClick={() => navigate('/purchase-orders')} className="btn-secondary">Cancelar</button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Guardando...' : 'Guardar Orden de Compra'}
          </button>
        </div>
      </form>

      {/* Modal agregar/editar producto (local, antes de guardar) */}
      <Modal open={itemModal} onClose={() => setItemModal(false)} title={editingIndex !== null ? 'Editar producto' : 'Agregar producto'} size="sm">
        <form onSubmit={handleItem(onItemSubmit)} className="space-y-4">
          <div>
            <label className="label">Producto *</label>
            <select {...regItem('inventory_id')} className="input" required>
              <option value="">— Seleccionar producto —</option>
              {(inventoryItems ?? []).map((i) => (
                <option key={i.id} value={i.id}>{i.name}{i.sku ? ` [${i.sku}]` : ''} — Stock: {i.stock} {stockUnitLabel(i.unit)}</option>
              ))}
              <option value="manual">Producto nuevo (no está en inventario)</option>
            </select>
            {selectedInv && (
              <p className={`mt-1.5 text-xs ${Number(selectedInv.stock) <= Number(selectedInv.min_stock) ? 'text-amber-600 font-medium' : 'text-gray-500'}`}>
                Stock actual: {selectedInv.stock} {stockUnitLabel(selectedInv.unit)} · Mínimo: {selectedInv.min_stock}
                {Number(selectedInv.stock) <= Number(selectedInv.min_stock) && ' · Stock bajo'}
              </p>
            )}
          </div>
          {(selectedInv || selectedInvId === 'manual') && linePackSize > 1 && (
            <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-sm text-blue-800">
              Se compra por <b>{packLabel(linePack.unit, linePack.perPack)}</b>
              {watchQty > 0 && <> · {watchQty} × {linePackSize} = <b>{watchQty * linePackSize} unidades</b> al inventario</>}
            </div>
          )}
          {selectedInvId === 'manual' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="label">Nombre del producto *</label>
                <input {...regItem('item_name_manual')} className="input" placeholder="Ej: Filtro de aceite" required />
              </div>
              <div>
                <label className="label">Código / SKU</label>
                <input {...regItem('item_sku_manual')} className="input" />
              </div>
              <div>
                <label className="label">Unidad de compra *</label>
                <select {...regItem('unit_manual')} className="input" required>
                  <option value="">Seleccionar...</option>
                  {UNIT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              {isVariablePack(manualUnit) && (
                <div>
                  <label className="label">Unidades por {manualUnit} *</label>
                  <input {...regItem('pack_manual')} type="number" min="1" className="input" placeholder="Ej: 24" required />
                </div>
              )}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Cantidad{selectedInv || selectedInvId === 'manual' ? ` (${packLabel(linePack.unit, linePack.perPack)})` : ''} *</label>
              <input {...regItem('quantity')} type="number" min="1" className="input" required />
            </div>
            <div>
              <label className="label">{linePackSize > 1 ? 'Precio por empaque (L) *' : 'Precio unitario (L) *'}</label>
              <input {...regItem('unit_cost')} type="number" step="0.01" min="0" className="input" required />
            </div>
            <div>
              <label className="label">Descuento (L)</label>
              <input {...regItem('discount')} type="number" step="0.01" min="0" className="input" />
            </div>
            <div>
              <label className="label">Impuesto *</label>
              <select {...regItem('tax_type')} className="input" required>
                <option value="exento">Exento</option>
                <option value="gravado_15">Gravado 15%</option>
                <option value="gravado_18">Gravado 18%</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setItemModal(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">{editingIndex !== null ? 'Guardar cambios' : 'Agregar a la orden'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
