import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { ArrowLeft, CheckCircle2, XCircle, Banknote, Paperclip, Plus, Download, Trash2, Lock, Eye } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  getPurchaseOrder, receivePurchaseOrder, cancelPurchaseOrder,
  getPurchaseOrderFiles, uploadPurchaseOrderFile, deletePurchaseOrderFile,
} from '../../api/purchaseOrders'
import { addSupplierPurchasePayment } from '../../api/supplierPayments'
import StatusBadge from '../../components/ui/StatusBadge'
import Modal from '../../components/ui/Modal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import FileTypeIcon from '../../components/ui/FileTypeIcon'
import FileUploadZone from '../../components/ui/FileUploadZone'
import { fmtDate, fmtMoney, fmtFileSize } from '../../utils/date'
import { packLabel } from '../../utils/inventory'

const TAX_LABELS = { exento: 'Exento', gravado_15: 'Gravado 15%', gravado_18: 'Gravado 18%' }

export default function PurchaseOrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [confirmReceive, setConfirmReceive] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [payModal, setPayModal] = useState(false)
  const [viewingPayment, setViewingPayment] = useState(null)
  const [fileModal, setFileModal] = useState(false)
  const [pendingFile, setPendingFile] = useState(null)
  const [fileDescription, setFileDescription] = useState('')

  const { data: po, isLoading } = useQuery({
    queryKey: ['purchase-order', id],
    queryFn: () => getPurchaseOrder(id).then((r) => r.data),
  })

  const { data: files = [], isLoading: filesLoading } = useQuery({
    queryKey: ['purchase-order-files', id],
    queryFn: () => getPurchaseOrderFiles(id).then((r) => r.data),
    enabled: !!id,
  })

  const { register: regPay, handleSubmit: handlePay, reset: resetPay, formState: { errors: payErrors } } = useForm()

  const mutReceive = useMutation({
    mutationFn: () => receivePurchaseOrder(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-order', id] })
      qc.invalidateQueries({ queryKey: ['inventory-all'] })
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      toast.success('Orden recibida — stock actualizado')
    },
    onError: (e) => toast.error(e.response?.data?.message ?? 'Error'),
  })

  const mutCancel = useMutation({
    mutationFn: () => cancelPurchaseOrder(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['purchase-order', id] }); toast.success('Orden cancelada') },
    onError: (e) => toast.error(e.response?.data?.message ?? 'Error'),
  })

  const mutPay = useMutation({
    mutationFn: (d) => addSupplierPurchasePayment(po.supplier_purchase.id, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-order', id] })
      toast.success('Abono registrado')
      setPayModal(false)
      resetPay()
    },
    onError: (e) => toast.error(e.response?.data?.message ?? 'Error'),
  })

  const uploadFile = useMutation({
    mutationFn: () => {
      const fd = new FormData()
      fd.append('file', pendingFile)
      if (fileDescription.trim()) fd.append('description', fileDescription.trim())
      return uploadPurchaseOrderFile(id, fd)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-order-files', id] })
      toast.success('Archivo subido')
      setFileModal(false)
      setPendingFile(null)
      setFileDescription('')
    },
    onError: (e) => toast.error(e.response?.data?.message ?? 'Error al subir archivo'),
  })

  const removeFile = useMutation({
    mutationFn: (fileId) => deletePurchaseOrderFile(id, fileId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-order-files', id] })
      toast.success('Archivo eliminado')
    },
    onError: () => toast.error('No se pudo eliminar el archivo'),
  })

  if (isLoading) return <div className="flex items-center justify-center py-24 text-gray-400">Cargando...</div>
  if (!po) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start gap-4">
        <button onClick={() => navigate('/purchase-orders')} className="btn-ghost p-2">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{po.number}</h1>
            <StatusBadge status={po.status} />
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            Proveedor:{' '}
            <Link to={`/suppliers/${po.supplier_id}`} className="text-primary-600 hover:underline">{po.supplier?.name}</Link>
            {po.order_date && ` · Fecha: ${fmtDate(po.order_date)}`}
          </p>
        </div>

        {po.status === 'pendiente' && (
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setConfirmCancel(true)} className="btn-secondary text-red-600">
              <XCircle size={15} /> Cancelar orden
            </button>
            <button onClick={() => setConfirmReceive(true)} disabled={mutReceive.isPending} className="btn-primary">
              <CheckCircle2 size={15} /> Marcar como recibida
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Col izquierda */}
        <div className="space-y-4">
          <div className="card p-4">
            <h3 className="font-semibold text-gray-800 mb-3">Datos de la compra</h3>
            <dl className="space-y-1 text-sm">
              <div><dt className="text-gray-500">N° factura proveedor</dt><dd className="font-mono">{po.supplier_invoice_number ?? '—'}</dd></div>
              <div><dt className="text-gray-500">Condición de pago</dt><dd>{po.payment_terms ?? '—'}</dd></div>
              {po.received_at && <div><dt className="text-gray-500">Recibida</dt><dd>{fmtDate(po.received_at)}</dd></div>}
            </dl>
            {po.notes && (
              <p className="mt-3 pt-3 border-t border-gray-100 text-sm text-gray-600 whitespace-pre-wrap">{po.notes}</p>
            )}
          </div>

          <div className="card p-4">
            <h3 className="font-semibold text-gray-800 mb-3">Totales</h3>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{fmtMoney(po.subtotal)}</span></div>
              {Number(po.discount_total) > 0 && (
                <div className="flex justify-between text-gray-500"><span>Descuento</span><span>- {fmtMoney(po.discount_total)}</span></div>
              )}
              {Number(po.exempt_amount) > 0 && (
                <div className="flex justify-between"><span className="text-gray-500">Exento</span><span>{fmtMoney(po.exempt_amount)}</span></div>
              )}
              {Number(po.taxed_15_amount) > 0 && (
                <>
                  <div className="flex justify-between"><span className="text-gray-500">Gravado 15%</span><span>{fmtMoney(po.taxed_15_amount)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">ISV 15%</span><span>{fmtMoney(po.tax_15_amount)}</span></div>
                </>
              )}
              {Number(po.taxed_18_amount) > 0 && (
                <>
                  <div className="flex justify-between"><span className="text-gray-500">Gravado 18%</span><span>{fmtMoney(po.taxed_18_amount)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">ISV 18%</span><span>{fmtMoney(po.tax_18_amount)}</span></div>
                </>
              )}
              <div className="flex justify-between font-semibold text-base border-t border-gray-200 pt-1.5 mt-1.5">
                <span>Total</span><span className="text-primary-700">{fmtMoney(po.total)}</span>
              </div>
            </div>
          </div>

          {po.supplier_purchase && (
            <div className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">Deuda con el proveedor</h3>
                <StatusBadge status={po.supplier_purchase.status} />
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Pagado</span><span className="text-emerald-700">{fmtMoney(po.supplier_purchase.amount_paid)}</span></div>
                <div className="flex justify-between font-semibold"><span className="text-amber-700">Saldo</span><span className="text-amber-700">{fmtMoney(po.supplier_purchase.balance)}</span></div>
              </div>
              {Number(po.supplier_purchase.balance) > 0 && (
                <button
                  onClick={() => { resetPay({ payment_date: new Date().toISOString().slice(0, 10), amount: po.supplier_purchase.balance }); setPayModal(true) }}
                  className="btn-primary w-full text-sm"
                >
                  <Banknote size={14} /> Registrar abono
                </button>
              )}

              {po.supplier_purchase.payments?.length > 0 && (
                <div className="border-t border-gray-100 pt-3 space-y-1.5">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Abonos registrados</p>
                  {po.supplier_purchase.payments.map((pay) => (
                    <div key={pay.id} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg pl-2.5 pr-1 py-1.5">
                      <div>
                        <span className="font-semibold text-emerald-700">{fmtMoney(pay.amount)}</span>
                        <span className="text-xs text-gray-400 ml-2">{fmtDate(pay.payment_date)}</span>
                      </div>
                      <button
                        onClick={() => setViewingPayment(pay)}
                        className="btn-ghost p-1.5 text-gray-400 hover:text-primary-600"
                        title="Ver abono"
                      >
                        <Eye size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Col derecha: productos + archivos */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800">Productos ({po.items?.length ?? 0})</h3>
              <span className="text-xs text-gray-400 flex items-center gap-1"><Lock size={11} /> No editable</span>
            </div>
            {po.items?.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">Sin productos</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-1.5 text-gray-500 font-medium">Producto</th>
                    <th className="text-right text-gray-500 font-medium">Cant.</th>
                    <th className="text-right text-gray-500 font-medium">Costo unit.</th>
                    <th className="text-right text-gray-500 font-medium">Desc.</th>
                    <th className="text-left text-gray-500 font-medium pl-2">Impuesto</th>
                    <th className="text-right text-gray-500 font-medium">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {po.items.map((it) => (
                    <tr key={it.id} className="border-b border-gray-50">
                      <td className="py-1.5">{it.item_name}<br /><span className="text-xs text-gray-400 font-mono">{it.item_sku}</span></td>
                      <td className="text-right">
                        {it.quantity} {packLabel(it.unit, it.units_per_pack)}
                        {it.units_per_pack > 1 && <span className="block text-xs text-gray-400">= {it.quantity * it.units_per_pack} unidades</span>}
                      </td>
                      <td className="text-right">{fmtMoney(it.unit_cost)}</td>
                      <td className="text-right">{Number(it.discount) > 0 ? fmtMoney(it.discount) : '—'}</td>
                      <td className="pl-2 text-xs text-gray-500">{TAX_LABELS[it.tax_type]}</td>
                      <td className="text-right font-medium">{fmtMoney(it.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Archivos: cotización y factura física */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Paperclip size={16} className="text-primary-600" />
                <h3 className="font-semibold text-gray-800">Archivos ({files.length})</h3>
              </div>
              <button onClick={() => { setPendingFile(null); setFileDescription(''); setFileModal(true) }} className="btn-secondary text-xs py-1.5">
                <Plus size={14} /> Subir archivo
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-3 -mt-2">Adjunta la cotización que dio el proveedor y, luego, la factura física de la compra.</p>

            {filesLoading ? (
              <p className="text-sm text-gray-400 py-4 text-center">Cargando...</p>
            ) : !files.length ? (
              <p className="text-sm text-gray-400 py-4 text-center">Sin archivos adjuntos</p>
            ) : (
              <ul className="space-y-2">
                {files.map((f) => (
                  <li key={f.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors group">
                    <FileTypeIcon mime={f.mime_type} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{f.original_name}</p>
                      <p className="text-xs text-gray-400">
                        {fmtFileSize(f.size)}
                        {f.description && <span className="ml-2 text-gray-500">· {f.description}</span>}
                        <span className="ml-2">· {fmtDate(f.created_at?.slice(0, 10))}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a
                        href={f.url}
                        download={f.original_name}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-ghost p-1.5 text-gray-500 hover:text-primary-600"
                        title="Descargar"
                      >
                        <Download size={15} />
                      </a>
                      <button
                        onClick={() => { if (confirm('¿Eliminar este archivo?')) removeFile.mutate(f.id) }}
                        className="btn-ghost p-1.5 text-gray-400 hover:text-red-500"
                        title="Eliminar"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Modal subir archivo */}
      <Modal open={fileModal} onClose={() => setFileModal(false)} title="Subir archivo">
        <div className="space-y-4">
          <FileUploadZone onSelect={setPendingFile} disabled={uploadFile.isPending} />
          <div>
            <label className="label">Descripción (opcional)</label>
            <input
              value={fileDescription}
              onChange={(e) => setFileDescription(e.target.value)}
              className="input"
              placeholder="Cotización del proveedor, factura..."
              maxLength={255}
            />
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={() => setFileModal(false)} className="btn-secondary">Cancelar</button>
            <button
              onClick={() => uploadFile.mutate()}
              disabled={!pendingFile || uploadFile.isPending}
              className="btn-primary"
            >
              {uploadFile.isPending ? 'Subiendo...' : 'Subir'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal ver detalle de abono */}
      <Modal open={!!viewingPayment} onClose={() => setViewingPayment(null)} title="Detalle del abono" size="sm">
        {viewingPayment && (
          <div className="space-y-4">
            <div className="text-center py-2">
              <p className="text-3xl font-bold text-emerald-700">{fmtMoney(viewingPayment.amount)}</p>
              <p className="text-sm text-gray-500">{fmtDate(viewingPayment.payment_date)}</p>
            </div>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Método</dt>
                <dd className="font-medium capitalize">{viewingPayment.method ?? '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Referencia</dt>
                <dd className="font-medium">{viewingPayment.reference ?? '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Registrado por</dt>
                <dd className="font-medium">{viewingPayment.user?.name ?? '—'}</dd>
              </div>
            </dl>
            {viewingPayment.notes && (
              <div className="border-t border-gray-100 pt-3">
                <p className="text-xs text-gray-500 mb-1">Notas</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{viewingPayment.notes}</p>
              </div>
            )}
            <div className="flex justify-end pt-2">
              <button type="button" onClick={() => setViewingPayment(null)} className="btn-secondary">Cerrar</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal registrar abono */}
      <Modal open={payModal} onClose={() => setPayModal(false)} title="Registrar abono">
        <form onSubmit={handlePay((d) => mutPay.mutate(d))} className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
            <Banknote size={16} className="shrink-0" />
            Saldo pendiente: <strong>{fmtMoney(po.supplier_purchase?.balance)}</strong> de {fmtMoney(po.supplier_purchase?.total)}
          </div>
          <div>
            <label className="label">Monto a abonar (L) *</label>
            <input {...regPay('amount')} type="number" step="0.01" className="input" />
            {payErrors.amount && <p className="mt-1 text-xs text-red-500">{payErrors.amount.message}</p>}
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
            <input {...regPay('reference')} className="input" placeholder="N° recibo, voucher..." />
          </div>
          <div>
            <label className="label">Notas</label>
            <textarea {...regPay('notes')} rows={2} className="input" placeholder="Detalles adicionales sobre este abono..." />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setPayModal(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={mutPay.isPending} className="btn-primary">
              {mutPay.isPending ? 'Guardando...' : 'Confirmar abono'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirmación recibir */}
      <ConfirmDialog
        open={confirmReceive}
        onClose={() => setConfirmReceive(false)}
        title="Marcar orden como recibida"
        message="Se sumará el stock de cada producto al inventario. Esta acción no se puede deshacer."
        confirmText="Sí, recibir"
        loadingText="Procesando..."
        loading={mutReceive.isPending}
        onConfirm={() => { mutReceive.mutate(); setConfirmReceive(false) }}
      />

      {/* Confirmación cancelar */}
      <ConfirmDialog
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        title="Cancelar orden de compra"
        message="¿Seguro que deseas cancelar esta orden? No se recibirá stock y se eliminará la deuda pendiente asociada. Si ya tiene pagos registrados, no se podrá cancelar."
        confirmText="Sí, cancelar"
        loadingText="Cancelando..."
        confirmClass="btn-danger"
        loading={mutCancel.isPending}
        onConfirm={() => { mutCancel.mutate(); setConfirmCancel(false) }}
      />
    </div>
  )
}
