import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { ArrowLeft, Plus, MessageCircle, ChevronDown, ExternalLink, Printer, Trash2, Edit2, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  getQuote, addQuoteService, updateQuoteService, removeQuoteService,
  addQuotePart, updateQuotePart, removeQuotePart,
  changeQuoteStatus, updateQuote, getQuotePdf, getQuoteWhatsappLink,
} from '../../api/quotes'
import { getServices } from '../../api/services'
import { getInventory } from '../../api/inventory'
import { getEmployees } from '../../api/employees'
import { useConvertQuoteToWorkOrder } from '../../hooks/useConvertQuoteToWorkOrder'
import StatusBadge from '../../components/ui/StatusBadge'
import Modal from '../../components/ui/Modal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { fmtDate, fmtMoney } from '../../utils/date'

const STATUSES = ['pendiente', 'aprobada', 'rechazada']

export default function QuoteDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [svcModal, setSvcModal] = useState(false)
  const [partModal, setPartModal] = useState(false)
  const [editSvcModal, setEditSvcModal] = useState(false)
  const [editPartModal, setEditPartModal] = useState(false)
  const [editingSvc, setEditingSvc] = useState(null)
  const [editingPart, setEditingPart] = useState(null)
  const [statusOpen, setStatusOpen] = useState(false)
  // { kind: 'svc'|'part', id, name }
  const [confirmDel, setConfirmDel] = useState(null)
  const [confirmReject, setConfirmReject] = useState(false)
  const [confirmConvert, setConfirmConvert] = useState(false)

  const statusRef = useRef(null)
  useEffect(() => {
    if (!statusOpen) return
    const handler = (e) => { if (!statusRef.current?.contains(e.target)) setStatusOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [statusOpen])

  const { data: quote, isLoading } = useQuery({
    queryKey: ['quote', id],
    queryFn: () => getQuote(id).then((r) => r.data),
  })

  const { data: servicesCat } = useQuery({ queryKey: ['services-all'], queryFn: () => getServices({ per_page: 100 }).then((r) => r.data.data) })
  const { data: inventoryItems } = useQuery({ queryKey: ['inventory-all'], queryFn: () => getInventory({ per_page: 500 }).then((r) => r.data.data) })
  const { data: employees } = useQuery({ queryKey: ['employees-active'], queryFn: () => getEmployees({ active: true, per_page: 100 }).then((r) => r.data.data) })

  const { register: regSvc, handleSubmit: handleSvc, reset: resetSvc, watch: watchSvc, setValue: setSvcValue } = useForm()
  const { register: regPart, handleSubmit: handlePart, reset: resetPart, watch: watchPart, setValue: setPartValue } = useForm()
  const { register: regDesc, handleSubmit: handleDesc } = useForm()
  const { register: regTax, handleSubmit: handleTax } = useForm()
  const { register: regESvc, handleSubmit: handleESvc, reset: resetESvc } = useForm()
  const { register: regEPart, handleSubmit: handleEPart, reset: resetEPart } = useForm()

  const selectedSvcId = watchSvc('service_id')
  const selectedPartId = watchPart('inventory_id')

  useEffect(() => {
    if (!selectedSvcId || selectedSvcId === 'manual') return
    const svc = servicesCat?.find((s) => String(s.id) === String(selectedSvcId))
    if (svc?.estimated_hours) setSvcValue('hours', svc.estimated_hours)
  }, [selectedSvcId, servicesCat])

  useEffect(() => {
    if (!selectedPartId || selectedPartId === 'manual') return
    const item = inventoryItems?.find((i) => String(i.id) === String(selectedPartId))
    if (item?.sale_price) setPartValue('unit_price', item.sale_price)
  }, [selectedPartId, inventoryItems])

  const editable = quote?.status !== 'convertida'

  const mutAddSvc = useMutation({
    mutationFn: (d) => addQuoteService(id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['quote', id] }); toast.success('Servicio agregado'); setSvcModal(false); resetSvc() },
    onError: (e) => toast.error(e.response?.data?.message ?? 'Error'),
  })

  const mutAddPart = useMutation({
    mutationFn: (d) => addQuotePart(id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['quote', id] }); toast.success('Repuesto agregado'); setPartModal(false); resetPart() },
    onError: (e) => toast.error(e.response?.data?.message ?? 'Error'),
  })

  const mutRemoveSvc = useMutation({
    mutationFn: (svcId) => removeQuoteService(id, svcId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['quote', id] }); toast.success('Servicio eliminado') },
    onError: (e) => toast.error(e.response?.data?.message ?? 'Error'),
  })

  const mutUpdateSvc = useMutation({
    mutationFn: ({ svcId, data }) => updateQuoteService(id, svcId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['quote', id] }); toast.success('Servicio actualizado'); setEditSvcModal(false) },
    onError: (e) => toast.error(e.response?.data?.message ?? 'Error'),
  })

  const mutRemovePart = useMutation({
    mutationFn: (partId) => removeQuotePart(id, partId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['quote', id] }); toast.success('Repuesto eliminado') },
    onError: (e) => toast.error(e.response?.data?.message ?? 'Error'),
  })

  const mutUpdatePart = useMutation({
    mutationFn: ({ partId, data }) => updateQuotePart(id, partId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['quote', id] }); toast.success('Repuesto actualizado'); setEditPartModal(false) },
    onError: (e) => toast.error(e.response?.data?.message ?? 'Error'),
  })

  const mutStatus = useMutation({
    mutationFn: (status) => changeQuoteStatus(id, status),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['quote', id] }); toast.success('Estado actualizado'); setStatusOpen(false) },
    onError: (e) => toast.error(e.response?.data?.message ?? 'Error'),
  })

  const mutUpdateDesc = useMutation({
    mutationFn: (d) => updateQuote(id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['quote', id] }); toast.success('Cotización actualizada') },
    onError: (e) => toast.error(e.response?.data?.message ?? 'Error'),
  })

  const mutUpdateTax = useMutation({
    mutationFn: (d) => updateQuote(id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['quote', id] }); toast.success('Impuesto actualizado') },
    onError: (e) => toast.error(e.response?.data?.message ?? 'Error'),
  })

  const convert = useConvertQuoteToWorkOrder({})

  const downloadPdf = async () => {
    try {
      const res = await getQuotePdf(id)
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `cotizacion-${quote.number}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Error al generar PDF')
    }
  }

  const openWhatsApp = async () => {
    const res = await getQuoteWhatsappLink(id)
    window.open(res.data.url, '_blank')
  }

  if (isLoading) return <div className="flex items-center justify-center py-24 text-gray-400">Cargando...</div>
  if (!quote) return null

  const onSvcSubmit = (d) => {
    const isManual = !d.service_id || d.service_id === 'manual'
    const svc = !isManual ? servicesCat?.find((s) => String(s.id) === String(d.service_id)) : null
    mutAddSvc.mutate({
      service_id: svc?.id ?? undefined,
      employee_id: d.employee_id || undefined,
      service_name: svc?.name ?? d.service_name_manual,
      hours: Number(d.hours),
      hourly_rate: Number(d.hourly_rate ?? 0),
    })
  }

  const onPartSubmit = (d) => {
    const isManual = !d.inventory_id || d.inventory_id === 'manual'
    const item = !isManual ? inventoryItems?.find((i) => String(i.id) === String(d.inventory_id)) : null
    mutAddPart.mutate({
      inventory_id: item?.id ?? undefined,
      part_name: item?.name ?? d.part_name_manual,
      part_sku: item?.sku ?? undefined,
      quantity: Number(d.quantity),
      unit_price: Number(d.unit_price ?? 0),
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start gap-4">
        <button onClick={() => navigate('/quotes')} className="btn-ghost p-2">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{quote.number}</h1>
            <StatusBadge status={quote.status} />
          </div>
          <p className="text-sm text-gray-500 mt-0.5">Emitida: {fmtDate(quote.issued_at)}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {editable && (
            <div className="relative" ref={statusRef}>
              <button onClick={() => setStatusOpen(!statusOpen)} className="btn-secondary">
                Cambiar estado <ChevronDown size={14} />
              </button>
              {statusOpen && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 py-1 min-w-44">
                  {STATUSES.map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        if (s === 'rechazada') { setStatusOpen(false); setConfirmReject(true) }
                        else mutStatus.mutate(s)
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${quote.status === s ? 'font-semibold text-primary-600' : 'text-gray-700'}`}
                    >
                      <StatusBadge status={s} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <button onClick={downloadPdf} className="btn-secondary" title="Descargar cotización en PDF">
            <Printer size={15} /> Imprimir
          </button>

          <button onClick={openWhatsApp} className="btn-secondary">
            <MessageCircle size={15} /> WhatsApp
          </button>

          {quote.status === 'aprobada' && (
            <button onClick={() => setConfirmConvert(true)} disabled={convert.isPending} className="btn-primary">
              <CheckCircle2 size={15} /> {convert.isPending ? 'Convirtiendo...' : 'Convertir a Orden de Trabajo'}
            </button>
          )}

          {quote.status === 'convertida' && quote.work_order_id && (
            <Link to={`/work-orders/${quote.work_order_id}`} className="btn-primary">
              <ExternalLink size={15} /> Ver Orden de Trabajo
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Col izquierda */}
        <div className="space-y-4">
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800">Cliente</h3>
              {quote.customer_id && (
                <Link to={`/customers/${quote.customer_id}`} className="btn-ghost p-1.5 text-primary-600" title="Ver cliente">
                  <ExternalLink size={15} />
                </Link>
              )}
            </div>
            <dl className="space-y-1 text-sm">
              <div><dt className="text-gray-500">Nombre</dt><dd className="font-medium">{quote.customer_name ?? '—'}</dd></div>
              <div><dt className="text-gray-500">Teléfono</dt><dd>{quote.customer_phone ?? '—'}</dd></div>
            </dl>
          </div>

          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800">Vehículo</h3>
              {quote.vehicle_id && (
                <Link to={`/vehicles/${quote.vehicle_id}`} className="btn-ghost p-1.5 text-primary-600" title="Ver vehículo">
                  <ExternalLink size={15} />
                </Link>
              )}
            </div>
            <dl className="space-y-1 text-sm">
              <div><dt className="text-gray-500">Placa</dt><dd className="font-mono font-semibold">{quote.vehicle_plate ?? '—'}</dd></div>
              <div><dt className="text-gray-500">Vehículo</dt><dd>{`${quote.vehicle_brand ?? ''} ${quote.vehicle_model ?? ''} ${quote.vehicle_year ?? ''}`.trim() || '—'}</dd></div>
              <div><dt className="text-gray-500">Color</dt><dd>{quote.vehicle_color ?? '—'}</dd></div>
            </dl>
          </div>

          <div className="card p-4">
            <h3 className="font-semibold text-gray-800 mb-3">Totales estimados</h3>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Servicios</span><span>{fmtMoney(quote.subtotal_services)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Repuestos</span><span>{fmtMoney(quote.subtotal_parts)}</span></div>
              <div className="flex justify-between border-t border-gray-100 pt-1.5 mt-1.5"><span className="text-gray-500">Subtotal</span><span>{fmtMoney(quote.subtotal)}</span></div>
              {quote.discount_amount > 0 && (
                <div className="flex justify-between text-gray-500"><span>Descuento ({quote.discount_percent}%)</span><span>- {fmtMoney(quote.discount_amount)}</span></div>
              )}
              <div className="flex justify-between text-gray-500"><span>Exonerado</span><span>{fmtMoney(quote.exempt_amount)}</span></div>
              <div className="flex justify-between text-gray-500"><span>Gravado 15%</span><span>{fmtMoney(quote.taxed_15_amount)}</span></div>
              <div className="flex justify-between text-gray-500"><span>ISV 15%</span><span>{fmtMoney(quote.tax_15_amount)}</span></div>
              <div className="flex justify-between text-gray-500"><span>Gravado 18%</span><span>{fmtMoney(quote.taxed_18_amount)}</span></div>
              <div className="flex justify-between text-gray-500"><span>ISV 18%</span><span>{fmtMoney(quote.tax_18_amount)}</span></div>
              <div className="flex justify-between font-semibold text-base border-t border-gray-200 pt-1.5 mt-1.5">
                <span>Total</span><span className="text-primary-700">{fmtMoney(quote.total)}</span>
              </div>
            </div>

            {editable && (
              <form
                onSubmit={handleTax((d) => mutUpdateTax.mutate({ discount_percent: Number(d.discount_percent || 0), tax_mode: d.tax_mode }))}
                className="mt-4 pt-4 border-t border-gray-100 space-y-3"
              >
                <div>
                  <label className="label">Descuento %</label>
                  <input {...regTax('discount_percent')} type="number" step="0.01" min="0" max="100" defaultValue={quote.discount_percent} className="input" />
                </div>
                <div>
                  <label className="label">Impuesto</label>
                  <select {...regTax('tax_mode')} defaultValue={quote.tax_mode} className="input">
                    <option value="estandar">Estándar (ISV 15%)</option>
                    <option value="exonerado">Exonerado (0%)</option>
                    <option value="gravado_18">ISV 18%</option>
                  </select>
                </div>
                <button type="submit" disabled={mutUpdateTax.isPending} className="btn-secondary w-full text-sm">
                  {mutUpdateTax.isPending ? 'Guardando...' : 'Actualizar impuesto'}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Col derecha */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-4">
            <h3 className="font-semibold text-gray-800 mb-3">Descripción del trabajo a cotizar</h3>
            <form onSubmit={handleDesc((d) => mutUpdateDesc.mutate(d))} className="space-y-3">
              <textarea {...regDesc('description')} defaultValue={quote.description} rows={3} className="input" disabled={!editable} />
              {editable && (
                <div className="flex justify-end">
                  <button type="submit" disabled={mutUpdateDesc.isPending} className="btn-primary">
                    {mutUpdateDesc.isPending ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Servicios */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800">Servicios / Mano de obra (estimado)</h3>
              {editable && (
                <button onClick={() => { resetSvc(); setSvcModal(true) }} className="btn-secondary text-xs py-1.5">
                  <Plus size={14} /> Agregar
                </button>
              )}
            </div>
            {quote.services?.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No hay servicios agregados</p>
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-100"><th className="text-left py-1.5 text-gray-500 font-medium">Servicio</th><th className="text-right text-gray-500 font-medium">Horas</th><th className="text-right text-gray-500 font-medium">Tarifa</th><th className="text-right text-gray-500 font-medium">Subtotal</th>{editable && <th className="w-16"></th>}</tr></thead>
                <tbody>
                  {quote.services.map((s) => (
                    <tr key={s.id} className="border-b border-gray-50 group">
                      <td className="py-1.5">{s.service_name}<br /><span className="text-xs text-gray-400">{s.employee?.name}</span></td>
                      <td className="text-right">{s.hours}h</td>
                      <td className="text-right">{fmtMoney(s.hourly_rate)}</td>
                      <td className="text-right font-medium">{fmtMoney(s.subtotal)}</td>
                      {editable && (
                        <td className="text-right py-1.5 pl-2">
                          <div className="flex gap-0.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => { setEditingSvc(s); resetESvc({ service_name: s.service_name, employee_id: s.employee_id ? String(s.employee_id) : '', hours: s.hours, hourly_rate: s.hourly_rate }); setEditSvcModal(true) }}
                              className="btn-ghost p-1 text-gray-400 hover:text-primary-600"
                              title="Editar servicio"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => setConfirmDel({ kind: 'svc', id: s.id, name: s.service_name })}
                              disabled={mutRemoveSvc.isPending}
                              className="btn-ghost p-1 text-gray-300 hover:text-red-500"
                              title="Eliminar servicio"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Repuestos */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800">Repuestos (estimado)</h3>
              {editable && (
                <button onClick={() => { resetPart(); setPartModal(true) }} className="btn-secondary text-xs py-1.5">
                  <Plus size={14} /> Agregar
                </button>
              )}
            </div>
            {quote.parts?.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No hay repuestos agregados</p>
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-100"><th className="text-left py-1.5 text-gray-500 font-medium">Repuesto</th><th className="text-right text-gray-500 font-medium">Cant.</th><th className="text-right text-gray-500 font-medium">P. Unit.</th><th className="text-right text-gray-500 font-medium">Subtotal</th>{editable && <th className="w-16"></th>}</tr></thead>
                <tbody>
                  {quote.parts.map((p) => (
                    <tr key={p.id} className="border-b border-gray-50 group">
                      <td className="py-1.5">{p.part_name}<br /><span className="text-xs text-gray-400 font-mono">{p.part_sku}</span></td>
                      <td className="text-right">{p.quantity}</td>
                      <td className="text-right">{fmtMoney(p.unit_price)}</td>
                      <td className="text-right font-medium">{fmtMoney(p.subtotal)}</td>
                      {editable && (
                        <td className="text-right py-1.5 pl-2">
                          <div className="flex gap-0.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => { setEditingPart(p); resetEPart({ part_name: p.part_name, part_sku: p.part_sku ?? '', quantity: p.quantity, unit_price: p.unit_price }); setEditPartModal(true) }}
                              className="btn-ghost p-1 text-gray-400 hover:text-primary-600"
                              title="Editar repuesto"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => setConfirmDel({ kind: 'part', id: p.id, name: p.part_name })}
                              disabled={mutRemovePart.isPending}
                              className="btn-ghost p-1 text-gray-300 hover:text-red-500"
                              title="Eliminar repuesto"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Modal agregar servicio */}
      <Modal open={svcModal} onClose={() => setSvcModal(false)} title="Agregar servicio" size="sm">
        <form onSubmit={handleSvc(onSvcSubmit)} className="space-y-4">
          <div>
            <label className="label">Servicio *</label>
            <select {...regSvc('service_id')} className="input" required>
              <option value="">— Seleccionar servicio —</option>
              {(servicesCat ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}{s.estimated_hours ? ` (${s.estimated_hours}h est.)` : ''}
                </option>
              ))}
              <option value="manual">Otro (escribir manualmente)</option>
            </select>
          </div>
          {selectedSvcId === 'manual' && (
            <div>
              <label className="label">Nombre del servicio *</label>
              <input {...regSvc('service_name_manual')} className="input" placeholder="Ej: Cambio de bujías" required />
            </div>
          )}
          <div>
            <label className="label">Técnico sugerido</label>
            <select {...regSvc('employee_id')} className="input">
              <option value="">Sin asignar</option>
              {(employees ?? []).map((e) => (
                <option key={e.id} value={e.id}>{e.name}{e.specialty ? ` — ${e.specialty}` : ''}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Horas estimadas *</label>
              <input {...regSvc('hours')} type="number" step="0.5" min="0.5" className="input" defaultValue={1} required />
            </div>
            <div>
              <label className="label">Tarifa/hora (L) *</label>
              <input {...regSvc('hourly_rate')} type="number" step="1" min="0" className="input" defaultValue={0} required />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setSvcModal(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={mutAddSvc.isPending} className="btn-primary">{mutAddSvc.isPending ? 'Agregando...' : 'Agregar'}</button>
          </div>
        </form>
      </Modal>

      {/* Modal agregar repuesto */}
      <Modal open={partModal} onClose={() => setPartModal(false)} title="Agregar repuesto" size="sm">
        <form onSubmit={handlePart(onPartSubmit)} className="space-y-4">
          <div>
            <label className="label">Repuesto *</label>
            <select {...regPart('inventory_id')} className="input" required>
              <option value="">— Seleccionar repuesto —</option>
              {(inventoryItems ?? []).map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}{i.sku ? ` [${i.sku}]` : ''}
                </option>
              ))}
              <option value="manual">Otro (no está en inventario)</option>
            </select>
            <p className="mt-1 text-xs text-gray-400">Solo se usa como referencia de precio — el stock no se ve afectado por una cotización.</p>
          </div>
          {selectedPartId === 'manual' && (
            <div>
              <label className="label">Nombre del repuesto *</label>
              <input {...regPart('part_name_manual')} className="input" placeholder="Ej: Filtro de aire genérico" required />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Cantidad *</label>
              <input {...regPart('quantity')} type="number" min="1" className="input" defaultValue={1} required />
            </div>
            <div>
              <label className="label">Precio unitario (L) *</label>
              <input {...regPart('unit_price')} type="number" step="1" min="0" className="input" defaultValue={0} required />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setPartModal(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={mutAddPart.isPending} className="btn-primary">{mutAddPart.isPending ? 'Agregando...' : 'Agregar'}</button>
          </div>
        </form>
      </Modal>

      {/* Modal editar servicio */}
      <Modal open={editSvcModal} onClose={() => setEditSvcModal(false)} title="Editar servicio" size="sm">
        <form onSubmit={handleESvc((d) => mutUpdateSvc.mutate({ svcId: editingSvc?.id, data: { service_name: d.service_name, employee_id: d.employee_id || undefined, hours: Number(d.hours), hourly_rate: Number(d.hourly_rate) } }))} className="space-y-4">
          <div>
            <label className="label">Nombre del servicio *</label>
            <input {...regESvc('service_name')} className="input" required />
          </div>
          <div>
            <label className="label">Técnico</label>
            <select {...regESvc('employee_id')} className="input">
              <option value="">Sin asignar</option>
              {(employees ?? []).map((e) => <option key={e.id} value={e.id}>{e.name}{e.specialty ? ` — ${e.specialty}` : ''}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Horas *</label>
              <input {...regESvc('hours')} type="number" step="0.5" min="0" className="input" required />
            </div>
            <div>
              <label className="label">Tarifa/hora (L) *</label>
              <input {...regESvc('hourly_rate')} type="number" step="1" min="0" className="input" required />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setEditSvcModal(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={mutUpdateSvc.isPending} className="btn-primary">{mutUpdateSvc.isPending ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </form>
      </Modal>

      {/* Modal editar repuesto */}
      <Modal open={editPartModal} onClose={() => setEditPartModal(false)} title="Editar repuesto" size="sm">
        <form onSubmit={handleEPart((d) => mutUpdatePart.mutate({ partId: editingPart?.id, data: { part_name: d.part_name, part_sku: d.part_sku || undefined, quantity: Number(d.quantity), unit_price: Number(d.unit_price) } }))} className="space-y-4">
          <div>
            <label className="label">Nombre del repuesto *</label>
            <input {...regEPart('part_name')} className="input" required />
          </div>
          <div>
            <label className="label">SKU</label>
            <input {...regEPart('part_sku')} className="input font-mono" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Cantidad *</label>
              <input {...regEPart('quantity')} type="number" min="1" className="input" required />
            </div>
            <div>
              <label className="label">Precio unitario (L) *</label>
              <input {...regEPart('unit_price')} type="number" step="1" min="0" className="input" required />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setEditPartModal(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={mutUpdatePart.isPending} className="btn-primary">{mutUpdatePart.isPending ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </form>
      </Modal>

      {/* Confirmación de rechazo */}
      <ConfirmDialog
        open={confirmReject}
        onClose={() => setConfirmReject(false)}
        title="Rechazar cotización"
        message="¿Confirmas que el cliente no aceptó esta cotización?"
        confirmText="Sí, rechazar"
        loadingText="Actualizando..."
        confirmClass="btn-danger"
        loading={mutStatus.isPending}
        onConfirm={() => { mutStatus.mutate('rechazada'); setConfirmReject(false) }}
      />

      {/* Confirmación de conversión a OT */}
      <ConfirmDialog
        open={confirmConvert}
        onClose={() => setConfirmConvert(false)}
        title="Convertir a Orden de Trabajo"
        message="Se creará una nueva OT con los servicios y repuestos cotizados como punto de partida. La cotización quedará como registro histórico y ya no podrá editarse."
        confirmText="Sí, convertir"
        loadingText="Convirtiendo..."
        loading={convert.isPending}
        onConfirm={() => { convert.mutate(quote); setConfirmConvert(false) }}
      />

      {/* Confirmación de eliminación (servicios y repuestos) */}
      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        title={`¿Eliminar ${confirmDel?.kind === 'svc' ? 'servicio' : 'repuesto'}?`}
        message={confirmDel ? `"${confirmDel.name}"` : undefined}
        loading={mutRemoveSvc.isPending || mutRemovePart.isPending}
        onConfirm={() => {
          if (!confirmDel) return
          if (confirmDel.kind === 'svc') mutRemoveSvc.mutate(confirmDel.id)
          else mutRemovePart.mutate(confirmDel.id)
          setConfirmDel(null)
        }}
      />
    </div>
  )
}
