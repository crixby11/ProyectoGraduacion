import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { ArrowLeft, Plus, FileText, MessageCircle, ChevronDown, ExternalLink, Car, CreditCard, StickyNote, Send, Printer, Trash2, Download, Edit2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { getWorkOrder, addService, updateService, addPart, updatePart, removeService, removePart, changeStatus, updateWorkOrder, getNotes, addNote, getWorkOrderPdf } from '../../api/workOrders'
import { getInvoicePdf } from '../../api/invoices'
import { getVehicles } from '../../api/vehicles'
import { VEHICLE_CATALOG, BRANDS } from '../../data/vehicleCatalog'
import { getServices } from '../../api/services'
import { getInventory } from '../../api/inventory'
import { getEmployees } from '../../api/employees'
import { generateInvoice, getWhatsappLink, updateInvoice } from '../../api/invoices'
import { getPayments, createPayment } from '../../api/payments'
import StatusBadge from '../../components/ui/StatusBadge'
import Modal from '../../components/ui/Modal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'

import { fmtDate, fmtDateTime, fmtMoney } from '../../utils/date'

const STATUSES = ['recibido', 'diagnostico', 'en_progreso', 'listo', 'entregado', 'cancelado']

export default function WorkOrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [svcModal, setSvcModal] = useState(false)
  const [partModal, setPartModal] = useState(false)
  const [editSvcModal, setEditSvcModal] = useState(false)
  const [editPartModal, setEditPartModal] = useState(false)
  const [editingSvc, setEditingSvc] = useState(null)
  const [editingPart, setEditingPart] = useState(null)
  const [vehicleModal, setVehicleModal] = useState(false)
  const [paymentModal, setPaymentModal] = useState(false)
  const [statusOpen,   setStatusOpen]   = useState(false)
  const [brandMode,    setBrandMode]    = useState('list')
  const [modelMode,    setModelMode]    = useState('list')
  // { kind: 'svc'|'part', id, name, hasInventory? }
  const [confirmDel,    setConfirmDel]    = useState(null)
  // 'entregado' | 'cancelado' | null
  const [confirmStatus, setConfirmStatus] = useState(null)

  // Ref para cerrar el dropdown de estado al hacer click afuera
  const statusRef = useRef(null)
  useEffect(() => {
    if (!statusOpen) return
    const handler = (e) => { if (!statusRef.current?.contains(e.target)) setStatusOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [statusOpen])

  const { data: wo, isLoading } = useQuery({
    queryKey: ['work-order', id],
    queryFn: () => getWorkOrder(id).then((r) => r.data),
  })

  const { data: servicesCat } = useQuery({ queryKey: ['services-all'], queryFn: () => getServices({ per_page: 100 }).then((r) => r.data.data) })
  const { data: inventoryItems } = useQuery({ queryKey: ['inventory-all'], queryFn: () => getInventory({ per_page: 500 }).then((r) => r.data.data) })
  const { data: employees } = useQuery({ queryKey: ['employees-active'], queryFn: () => getEmployees({ active: true, per_page: 100 }).then((r) => r.data.data) })
  const { data: customerVehicles } = useQuery({
    queryKey: ['vehicles-customer', wo?.customer_id],
    queryFn: () => getVehicles({ customer_id: wo.customer_id, per_page: 100 }).then((r) => r.data.data),
    enabled: !!wo && !wo.vehicle_id,
  })

  const { data: invoicePayments } = useQuery({
    queryKey: ['payments', wo?.invoice?.id],
    queryFn: () => getPayments({ invoice_id: wo.invoice.id }).then((r) => r.data.data),
    enabled: !!wo?.invoice?.id,
  })

  const { data: notes } = useQuery({
    queryKey: ['work-order-notes', id],
    queryFn: () => getNotes(id).then((r) => r.data),
    enabled: !!id,
    refetchInterval: 30_000,   // auto-refresh cada 30 s para trabajo colaborativo
  })

  const { register: regSvc, handleSubmit: handleSvc, reset: resetSvc, watch: watchSvc, setValue: setSvcValue } = useForm()
  const { register: regPart, handleSubmit: handlePart, reset: resetPart, watch: watchPart, setValue: setPartValue } = useForm()
  const { register: regEdit, handleSubmit: handleEdit } = useForm()
  const { register: regVeh, handleSubmit: handleVeh, reset: resetVeh, watch: watchVeh, setValue: setVehValue } = useForm()
  const { register: regPay, handleSubmit: handlePay, reset: resetPay } = useForm()
  const { register: regInv, handleSubmit: handleInv } = useForm()
  const { register: regNote, handleSubmit: handleNote, reset: resetNote, watch: watchNote } = useForm()
  const { register: regESvc, handleSubmit: handleESvc, reset: resetESvc } = useForm()
  const { register: regEPart, handleSubmit: handleEPart, reset: resetEPart } = useForm()

  const selectedSvcId = watchSvc('service_id')
  const selectedPartId = watchPart('inventory_id')

  // Auto-relleno al seleccionar servicio del catálogo
  useEffect(() => {
    if (!selectedSvcId || selectedSvcId === 'manual') return
    const svc = servicesCat?.find((s) => String(s.id) === String(selectedSvcId))
    if (svc?.estimated_hours) setSvcValue('hours', svc.estimated_hours)
  }, [selectedSvcId, servicesCat])

  // Auto-relleno precio al seleccionar repuesto del inventario
  useEffect(() => {
    if (!selectedPartId || selectedPartId === 'manual') return
    const item = inventoryItems?.find((i) => String(i.id) === String(selectedPartId))
    if (item?.sale_price) setPartValue('unit_price', item.sale_price)
  }, [selectedPartId, inventoryItems])

  const selectedVehicleId = watchVeh('vehicle_id')
  const watchedVehicleBrand = watchVeh('vehicle_brand')
  const watchedVehicleModel = watchVeh('vehicle_model')
  const isExistingVehicle = selectedVehicleId && selectedVehicleId !== 'manual'
  const modelsForBrand = VEHICLE_CATALOG[watchedVehicleBrand] ?? []
  const showModelSelect = modelsForBrand.length > 0 && modelMode === 'list'

  useEffect(() => {
    if (!selectedVehicleId || selectedVehicleId === 'manual') return
    const v = customerVehicles?.find((v) => String(v.id) === String(selectedVehicleId))
    if (v) {
      setVehValue('vehicle_plate', v.plate ?? '')
      setVehValue('vehicle_brand', v.brand ?? '')
      setVehValue('vehicle_model', v.model ?? '')
      setVehValue('vehicle_year', v.year ?? '')
      setVehValue('vehicle_color', v.color ?? '')
    }
  }, [selectedVehicleId, customerVehicles])

  const mutAddSvc = useMutation({
    mutationFn: (d) => addService(id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['work-order', id] }); toast.success('Servicio agregado'); setSvcModal(false); resetSvc() },
    onError: (e) => toast.error(e.response?.data?.message ?? 'Error'),
  })


  const mutAddPart = useMutation({
    mutationFn: (d) => addPart(id, d),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['work-order', id] })
      qc.invalidateQueries({ queryKey: ['inventory-all'] })
      toast.success('Repuesto agregado')
      setPartModal(false)
      resetPart()
      // Alerta si el stock cae al mínimo tras descontar
      const { inventory_id, quantity, part_name } = res.data
      if (inventory_id) {
        const item = inventoryItems?.find(i => i.id === inventory_id)
        if (item) {
          const newStock = item.stock - quantity
          if (newStock <= item.min_stock) {
            toast(`⚠️ Stock bajo — ${part_name}: quedan ${newStock} unidad${newStock !== 1 ? 'es' : ''}`, {
              duration: 7000,
              style: { background: '#fef3c7', color: '#78350f', fontWeight: '500' },
            })
          }
        }
      }
    },
    onError: (e) => toast.error(e.response?.data?.message ?? 'Error'),
  })

  const mutRemoveSvc = useMutation({
    mutationFn: (svcId) => removeService(id, svcId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['work-order', id] }); toast.success('Servicio eliminado') },
    onError: (e) => toast.error(e.response?.data?.message ?? 'Error'),
  })

  const mutUpdateSvc = useMutation({
    mutationFn: ({ svcId, data }) => updateService(id, svcId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['work-order', id] }); toast.success('Servicio actualizado'); setEditSvcModal(false) },
    onError: (e) => toast.error(e.response?.data?.message ?? 'Error'),
  })

  const mutRemovePart = useMutation({
    mutationFn: (partId) => removePart(id, partId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['work-order', id] }); toast.success('Repuesto eliminado') },
    onError: (e) => toast.error(e.response?.data?.message ?? 'Error'),
  })

  const mutUpdatePart = useMutation({
    mutationFn: ({ partId, data }) => updatePart(id, partId, data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['work-order', id] })
      qc.invalidateQueries({ queryKey: ['inventory-all'] })
      toast.success('Repuesto actualizado')
      setEditPartModal(false)
      // Alerta si la cantidad aumentó y stock cae al mínimo
      const woPart = res.data
      if (editingPart?.inventory_id && woPart.quantity > editingPart.quantity) {
        const item = inventoryItems?.find(i => i.id === editingPart.inventory_id)
        if (item) {
          const newStock = item.stock - (woPart.quantity - editingPart.quantity)
          if (newStock <= item.min_stock) {
            toast(`⚠️ Stock bajo — ${woPart.part_name}: quedan ${newStock} unidad${newStock !== 1 ? 'es' : ''}`, {
              duration: 7000,
              style: { background: '#fef3c7', color: '#78350f', fontWeight: '500' },
            })
          }
        }
      }
    },
    onError: (e) => toast.error(e.response?.data?.message ?? 'Error'),
  })


  const mutStatus = useMutation({
    mutationFn: (status) => changeStatus(id, status),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['work-order', id] }); toast.success('Estado actualizado'); setStatusOpen(false) },
  })

  const mutUpdate = useMutation({
    mutationFn: (d) => updateWorkOrder(id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['work-order', id] }); toast.success('OT actualizada') },
    onError: (e) => toast.error(e.response?.data?.message ?? 'Error'),
  })

  const mutAddPayment = useMutation({
    mutationFn: (d) => createPayment({ ...d, invoice_id: wo.invoice.id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['work-order', id] })
      qc.invalidateQueries({ queryKey: ['payments', wo.invoice.id] })
      toast.success('Pago registrado')
      setPaymentModal(false)
      resetPay()
    },
    onError: (e) => toast.error(e.response?.data?.message ?? 'Error'),
  })

  const mutUpdateInvoice = useMutation({
    mutationFn: (d) => updateInvoice(wo.invoice.id, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['work-order', id] })
      qc.invalidateQueries({ queryKey: ['payments', wo.invoice.id] })
      toast.success('Factura actualizada')
    },
    onError: (e) => toast.error(e.response?.data?.message ?? 'Error'),
  })

  const mutLinkVehicle = useMutation({
    mutationFn: (d) => updateWorkOrder(id, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['work-order', id] })
      toast.success('Vehículo vinculado')
      setVehicleModal(false)
      resetVeh()
    },
    onError: (e) => toast.error(e.response?.data?.message ?? 'Error'),
  })

  const onVehSubmit = (d) => {
    const isManual = !d.vehicle_id || d.vehicle_id === 'manual'
    mutLinkVehicle.mutate({
      vehicle_id: isManual ? undefined : Number(d.vehicle_id),
      vehicle_plate: d.vehicle_plate || undefined,
      vehicle_brand: d.vehicle_brand || undefined,
      vehicle_model: d.vehicle_model || undefined,
      vehicle_year: d.vehicle_year || undefined,
      vehicle_color: d.vehicle_color || undefined,
    })
  }

  const mutAddNote = useMutation({
    mutationFn: (d) => addNote(id, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['work-order-notes', id] })
      resetNote()
    },
    onError: (e) => toast.error(e.response?.data?.message ?? 'Error'),
  })

  const mutGenInvoice = useMutation({
    mutationFn: () => generateInvoice(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['work-order', id] }); toast.success('Factura generada') },
    onError: (e) => toast.error(e.response?.data?.message ?? 'Error'),
  })

  const downloadOtPdf = async () => {
    try {
      const res = await getWorkOrderPdf(id)
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `OT-${wo.number}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Error al generar PDF')
    }
  }

  const openWhatsApp = async () => {
    if (wo?.invoice) {
      const res = await getWhatsappLink(wo.invoice.id)
      window.open(res.data.url, '_blank')
    }
  }

  const downloadInvoicePdf = async () => {
    try {
      const res = await getInvoicePdf(wo.invoice.id)
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `factura-${wo.invoice.number}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Error al generar PDF de factura')
    }
  }

  if (isLoading) return <div className="flex items-center justify-center py-24 text-gray-400">Cargando...</div>
  if (!wo) return null

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
        <button onClick={() => navigate('/work-orders')} className="btn-ghost p-2">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{wo.number}</h1>
            <StatusBadge status={wo.status} />
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            Recibido: {fmtDateTime(wo.received_at)}
            {wo.promised_at && ` · Entrega: ${fmtDate(wo.promised_at)}`}
          </p>
        </div>

        {/* Acciones */}
        <div className="flex flex-wrap gap-2">
          {/* Cambiar estado */}
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
                      if (s === 'entregado' || s === 'cancelado') {
                        setStatusOpen(false)
                        setConfirmStatus(s)
                      } else {
                        mutStatus.mutate(s)
                      }
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${wo.status === s ? 'font-semibold text-primary-600' : 'text-gray-700'}`}
                  >
                    <StatusBadge status={s} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <button onClick={downloadOtPdf} className="btn-secondary" title="Descargar OT en PDF">
            <Printer size={15} /> Imprimir OT
          </button>

          {!wo.invoice ? (
            <button onClick={() => mutGenInvoice.mutate()} disabled={mutGenInvoice.isPending} className="btn-primary">
              <FileText size={15} /> Generar factura
            </button>
          ) : (
            <button onClick={openWhatsApp} className="btn-secondary">
              <MessageCircle size={15} /> WhatsApp
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Col izquierda: Info cliente/vehículo */}
        <div className="space-y-4">
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800">Cliente</h3>
              {wo.customer_id && (
                <Link to={`/customers/${wo.customer_id}`} className="btn-ghost p-1.5 text-primary-600" title="Ver cliente">
                  <ExternalLink size={15} />
                </Link>
              )}
            </div>
            <dl className="space-y-1 text-sm">
              <div><dt className="text-gray-500">Nombre</dt><dd className="font-medium">{wo.customer_name ?? '—'}</dd></div>
              <div><dt className="text-gray-500">Teléfono</dt><dd>{wo.customer_phone ?? '—'}</dd></div>
            </dl>
          </div>

          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800">Vehículo</h3>
              {wo.vehicle_id ? (
                <Link to={`/vehicles/${wo.vehicle_id}`} className="btn-ghost p-1.5 text-primary-600" title="Ver vehículo">
                  <ExternalLink size={15} />
                </Link>
              ) : (
                <button onClick={() => { resetVeh(); setBrandMode('list'); setModelMode('list'); setVehicleModal(true) }} className="btn-secondary text-xs py-1 px-2 flex items-center gap-1">
                  <Car size={13} /> Agregar vehículo
                </button>
              )}
            </div>
            <dl className="space-y-1 text-sm">
              <div><dt className="text-gray-500">Placa</dt><dd className="font-mono font-semibold">{wo.vehicle_plate ?? '—'}</dd></div>
              <div><dt className="text-gray-500">Vehículo</dt><dd>{`${wo.vehicle_brand ?? ''} ${wo.vehicle_model ?? ''} ${wo.vehicle_year ?? ''}`.trim() || '—'}</dd></div>
              <div><dt className="text-gray-500">Color</dt><dd>{wo.vehicle_color ?? '—'}</dd></div>
              <div><dt className="text-gray-500">Motor</dt><dd>{wo.vehicle_engine ?? '—'}</dd></div>
              <div><dt className="text-gray-500">VIN</dt><dd className="font-mono text-xs">{wo.vehicle_vin ?? '—'}</dd></div>
            </dl>
          </div>

          {/* Totales */}
          <div className="card p-4">
            <h3 className="font-semibold text-gray-800 mb-3">Totales</h3>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Servicios</span><span>{fmtMoney(wo.subtotal_services)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Repuestos</span><span>{fmtMoney(wo.subtotal_parts)}</span></div>
              <div className="flex justify-between font-semibold text-base border-t border-gray-200 pt-1.5 mt-1.5">
                <span>Total</span><span className="text-primary-700">{fmtMoney(wo.total)}</span>
              </div>
            </div>
          </div>

          {/* Factura */}
          {wo.invoice && (
            <div className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">Factura {wo.invoice.number}</h3>
                <div className="flex items-center gap-1">
                  <StatusBadge status={wo.invoice.status} />
                  <button onClick={downloadInvoicePdf} className="btn-ghost p-1.5 ml-1" title="Descargar PDF de factura">
                    <Download size={14} />
                  </button>
                </div>
              </div>

              {/* Descuento e impuesto */}
              <form onSubmit={handleInv((d) => mutUpdateInvoice.mutate(d))} className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label text-xs">Descuento %</label>
                  <input {...regInv('discount_percent')} type="number" step="0.1" min="0" max="100" defaultValue={wo.invoice.discount_percent ?? 0} className="input text-sm" />
                </div>
                <div>
                  <label className="label text-xs">Impuesto %</label>
                  <input {...regInv('tax_percent')} type="number" step="0.1" min="0" max="100" defaultValue={wo.invoice.tax_percent ?? 0} className="input text-sm" />
                </div>
                <div className="col-span-2">
                  <button type="submit" disabled={mutUpdateInvoice.isPending} className="btn-secondary text-xs w-full">
                    {mutUpdateInvoice.isPending ? 'Aplicando...' : 'Aplicar descuento/impuesto'}
                  </button>
                </div>
              </form>

              {/* Resumen de montos */}
              <div className="space-y-1 text-sm border-t border-gray-100 pt-2">
                {wo.invoice.discount_amount > 0 && (
                  <div className="flex justify-between text-gray-500"><span>Descuento</span><span>- {fmtMoney(wo.invoice.discount_amount)}</span></div>
                )}
                {wo.invoice.tax_amount > 0 && (
                  <div className="flex justify-between text-gray-500"><span>Impuesto</span><span>{fmtMoney(wo.invoice.tax_amount)}</span></div>
                )}
                <div className="flex justify-between font-semibold text-primary-700"><span>Total factura</span><span>{fmtMoney(wo.invoice.total)}</span></div>
              </div>

              {/* Pagos registrados */}
              {(invoicePayments ?? []).length > 0 && (
                <div className="border-t border-gray-100 pt-2 space-y-1">
                  {invoicePayments.map((p) => (
                    <div key={p.id} className="flex justify-between text-sm">
                      <span className="text-gray-500 capitalize">{p.method} <span className="text-xs text-gray-400">{fmtDate(p.payment_date)}</span></span>
                      <span className="text-green-600 font-medium">{fmtMoney(p.amount)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-between font-semibold text-sm border-t border-gray-200 pt-2">
                <span className={wo.invoice.balance > 0 ? 'text-red-600' : 'text-green-600'}>
                  {wo.invoice.balance > 0 ? 'Saldo pendiente' : 'Pagado'}
                </span>
                <span className={wo.invoice.balance > 0 ? 'text-red-600' : 'text-green-600'}>
                  {fmtMoney(wo.invoice.balance)}
                </span>
              </div>

              {wo.invoice.balance > 0 && (
                <button onClick={() => { resetPay({ payment_date: new Date().toISOString().slice(0, 10), method: 'efectivo' }); setPaymentModal(true) }} className="btn-primary w-full text-sm">
                  <CreditCard size={14} /> Registrar pago
                </button>
              )}
            </div>
          )}
        </div>

        {/* Col derecha: Servicios + Repuestos + Diagnóstico */}
        <div className="lg:col-span-2 space-y-4">
          {/* Diagnóstico */}
          <div className="card p-4">
            <h3 className="font-semibold text-gray-800 mb-3">Diagnóstico y trabajo</h3>
            <form onSubmit={handleEdit((d) => mutUpdate.mutate(d))} className="space-y-3">
              <div>
                <label className="label">Problema reportado</label>
                <textarea {...regEdit('problem')} defaultValue={wo.problem} rows={2} className="input" />
              </div>
              <div>
                <label className="label">Revisión / diagnóstico</label>
                <textarea {...regEdit('inspection')} defaultValue={wo.inspection} rows={2} className="input" />
              </div>
              <div>
                <label className="label">Solución aplicada</label>
                <textarea {...regEdit('solution')} defaultValue={wo.solution} rows={2} className="input" />
              </div>
              <div>
                <label className="label">Comentarios</label>
                <textarea {...regEdit('comments')} defaultValue={wo.comments} rows={2} className="input" />
              </div>
              <div className="flex justify-end">
                <button type="submit" disabled={mutUpdate.isPending} className="btn-primary">
                  {mutUpdate.isPending ? 'Guardando...' : 'Guardar notas'}
                </button>
              </div>
            </form>
          </div>

          {/* Servicios */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800">Servicios / Mano de obra</h3>
              <button onClick={() => { resetSvc({ employee_id: wo.employee_id ? String(wo.employee_id) : '' }); setSvcModal(true) }} className="btn-secondary text-xs py-1.5">
                <Plus size={14} /> Agregar
              </button>
            </div>
            {wo.services?.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No hay servicios agregados</p>
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-100"><th className="text-left py-1.5 text-gray-500 font-medium">Servicio</th><th className="text-right text-gray-500 font-medium">Horas</th><th className="text-right text-gray-500 font-medium">Tarifa</th><th className="text-right text-gray-500 font-medium">Subtotal</th><th className="w-16"></th></tr></thead>
                <tbody>
                  {wo.services.map((s) => (
                    <tr key={s.id} className="border-b border-gray-50 group">
                      <td className="py-1.5">{s.service_name}<br /><span className="text-xs text-gray-400">{s.employee?.name}</span></td>
                      <td className="text-right">{s.hours}h</td>
                      <td className="text-right">{fmtMoney(s.hourly_rate)}</td>
                      <td className="text-right font-medium">{fmtMoney(s.subtotal)}</td>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Repuestos */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800">Repuestos utilizados</h3>
              <button onClick={() => { resetPart(); setPartModal(true) }} className="btn-secondary text-xs py-1.5">
                <Plus size={14} /> Agregar
              </button>
            </div>
            {wo.parts?.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No hay repuestos agregados</p>
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-100"><th className="text-left py-1.5 text-gray-500 font-medium">Repuesto</th><th className="text-right text-gray-500 font-medium">Cant.</th><th className="text-right text-gray-500 font-medium">P. Unit.</th><th className="text-right text-gray-500 font-medium">Subtotal</th><th className="w-16"></th></tr></thead>
                <tbody>
                  {wo.parts.map((p) => (
                    <tr key={p.id} className="border-b border-gray-50 group">
                      <td className="py-1.5">{p.part_name}<br /><span className="text-xs text-gray-400 font-mono">{p.part_sku}</span></td>
                      <td className="text-right">{p.quantity}</td>
                      <td className="text-right">{fmtMoney(p.unit_price)}</td>
                      <td className="text-right font-medium">{fmtMoney(p.subtotal)}</td>
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
                            onClick={() => setConfirmDel({ kind: 'part', id: p.id, name: p.part_name, hasInventory: !!p.inventory_id })}
                            disabled={mutRemovePart.isPending}
                            className="btn-ghost p-1 text-gray-300 hover:text-red-500"
                            title="Eliminar repuesto"
                          >
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
        </div>
      </div>

      {/* Bitácora de notas */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-4">
          <StickyNote size={17} className="text-gray-500" />
          <h3 className="font-semibold text-gray-800">Bitácora interna</h3>
          {notes?.length > 0 && <span className="text-xs text-gray-400 ml-auto">{notes.length} nota{notes.length !== 1 ? 's' : ''}</span>}
        </div>

        {/* Lista de notas */}
        {(notes ?? []).length === 0 ? (
          <p className="text-sm text-gray-400 py-2 mb-4">Sin notas. Agrega comentarios internos sobre el progreso de esta OT.</p>
        ) : (
          <div className="space-y-3 mb-4">
            {(notes ?? []).map((n) => (
              <div key={n.id} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold shrink-0">
                  {n.user?.name?.charAt(0)?.toUpperCase() ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span className="text-sm font-medium text-gray-800">{n.user?.name ?? 'Sistema'}</span>
                    <span className="text-xs text-gray-400">
                      {new Date(n.created_at).toLocaleDateString('es-HN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      {' '}
                      {new Date(n.created_at).toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{n.body}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Formulario nueva nota */}
        <form
          onSubmit={handleNote((d) => mutAddNote.mutate(d))}
          className="flex gap-2 items-end border-t border-gray-100 pt-4"
        >
          <div className="flex-1">
            <textarea
              {...regNote('body', { required: true })}
              rows={2}
              className="input resize-none"
              placeholder="Escribe una nota interna (ej: esperando repuesto, revisé frenos delanteros)..."
            />
          </div>
          <button
            type="submit"
            disabled={mutAddNote.isPending || !watchNote('body')}
            className="btn-primary h-10 px-4 shrink-0 disabled:opacity-50"
          >
            {mutAddNote.isPending ? '...' : <Send size={16} />}
          </button>
        </form>
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
            <label className="label">Técnico asignado</label>
            <select {...regSvc('employee_id')} className="input">
              <option value="">Sin asignar</option>
              {(employees ?? []).map((e) => (
                <option key={e.id} value={e.id}>{e.name}{e.specialty ? ` — ${e.specialty}` : ''}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Horas trabajadas *</label>
              <input {...regSvc('hours')} type="number" step="0.5" min="0.5" className="input" defaultValue={1} required />
            </div>
            <div>
              <label className="label">Tarifa/hora (Lps) *</label>
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
                  {i.name}{i.sku ? ` [${i.sku}]` : ''} — Stock: {i.stock} {i.unit}
                </option>
              ))}
              <option value="manual">Otro (no está en inventario)</option>
            </select>
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
              <label className="label">Precio unitario (Lps) *</label>
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
              <label className="label">Tarifa/hora (Lps) *</label>
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
          {editingPart?.inventory_id && (
            <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">El cambio de cantidad ajustará el stock en inventario automáticamente.</p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Cantidad *</label>
              <input {...regEPart('quantity')} type="number" min="1" className="input" required />
            </div>
            <div>
              <label className="label">Precio unitario (Lps) *</label>
              <input {...regEPart('unit_price')} type="number" step="1" min="0" className="input" required />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setEditPartModal(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={mutUpdatePart.isPending} className="btn-primary">{mutUpdatePart.isPending ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </form>
      </Modal>

      {/* Modal agregar vehículo */}
      <Modal open={vehicleModal} onClose={() => { setVehicleModal(false); resetVeh(); setBrandMode('list'); setModelMode('list') }} title="Agregar vehículo" size="sm">
        <form onSubmit={handleVeh(onVehSubmit)} className="space-y-4">

          {(customerVehicles ?? []).length > 0 && (
            <div>
              <label className="label">Vehículo registrado del cliente</label>
              <select {...regVeh('vehicle_id')} className="input">
                <option value="manual">— Registrar vehículo nuevo —</option>
                {customerVehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plate} — {v.brand} {v.model} {v.year ?? ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Placa *</label>
              <input {...regVeh('vehicle_plate')} className="input uppercase" placeholder="AAA-000" required />
            </div>
            <div>
              <label className="label">Año</label>
              <input {...regVeh('vehicle_year')} className="input" placeholder="2024" type="number" min="1950" max="2030" />
            </div>
          </div>

          {isExistingVehicle ? (
            <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
              Marca, modelo y color se tomarán del vehículo seleccionado.
            </p>
          ) : (
            <>
              {/* Marca */}
              <div>
                <label className="label">Marca</label>
                {brandMode === 'list' ? (
                  <>
                    <select
                      value={watchedVehicleBrand || ''}
                      onChange={(e) => {
                        if (e.target.value === '__other__') {
                          setBrandMode('custom')
                          setVehValue('vehicle_brand', '')
                          setVehValue('vehicle_model', '')
                          setModelMode('list')
                        } else {
                          setVehValue('vehicle_brand', e.target.value)
                          setVehValue('vehicle_model', '')
                          setModelMode('list')
                        }
                      }}
                      className="input"
                    >
                      <option value="">— Seleccionar marca —</option>
                      {BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
                      <option value="__other__">✏ Otra marca...</option>
                    </select>
                    <input type="hidden" {...regVeh('vehicle_brand')} />
                  </>
                ) : (
                  <div className="flex gap-2">
                    <input {...regVeh('vehicle_brand')} className="input flex-1" placeholder="Escribe la marca" autoFocus />
                    <button
                      type="button"
                      onClick={() => { setBrandMode('list'); setVehValue('vehicle_brand', ''); setVehValue('vehicle_model', '') }}
                      className="btn-secondary text-xs whitespace-nowrap"
                    >
                      Ver lista
                    </button>
                  </div>
                )}
              </div>

              {/* Modelo */}
              <div>
                <label className="label">Modelo</label>
                {showModelSelect ? (
                  <>
                    <select
                      value={watchedVehicleModel || ''}
                      onChange={(e) => {
                        if (e.target.value === '__other__') {
                          setModelMode('custom')
                          setVehValue('vehicle_model', '')
                        } else {
                          setVehValue('vehicle_model', e.target.value)
                        }
                      }}
                      className="input"
                    >
                      <option value="">— Seleccionar modelo —</option>
                      {modelsForBrand.map((m) => <option key={m} value={m}>{m}</option>)}
                      <option value="__other__">✏ Otro modelo...</option>
                    </select>
                    <input type="hidden" {...regVeh('vehicle_model')} />
                  </>
                ) : (
                  <div className="flex gap-2">
                    <input {...regVeh('vehicle_model')} className="input flex-1" placeholder="Modelo" />
                    {modelsForBrand.length > 0 && (
                      <button
                        type="button"
                        onClick={() => { setModelMode('list'); setVehValue('vehicle_model', '') }}
                        className="btn-secondary text-xs whitespace-nowrap"
                      >
                        Ver lista
                      </button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          <div>
            <label className="label">Color</label>
            <input {...regVeh('vehicle_color')} className="input" placeholder="Blanco" />
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => { setVehicleModal(false); resetVeh(); setBrandMode('list'); setModelMode('list') }} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={mutLinkVehicle.isPending} className="btn-primary">
              {mutLinkVehicle.isPending ? 'Guardando...' : 'Vincular vehículo'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirmación de cambio a estado final */}
      <ConfirmDialog
        open={!!confirmStatus}
        onClose={() => setConfirmStatus(null)}
        title={confirmStatus === 'entregado' ? 'Marcar como entregado' : 'Cancelar orden de trabajo'}
        message={confirmStatus === 'entregado'
          ? 'Confirma que el vehículo fue entregado al cliente. Esto cerrará la orden.'
          : '¿Seguro que deseas cancelar esta orden? Esta acción es difícil de revertir.'}
        confirmText={confirmStatus === 'entregado' ? 'Sí, entregar' : 'Sí, cancelar OT'}
        loadingText="Actualizando..."
        confirmClass={confirmStatus === 'cancelado' ? 'btn-danger' : 'btn-primary'}
        loading={mutStatus.isPending}
        onConfirm={() => { mutStatus.mutate(confirmStatus); setConfirmStatus(null) }}
      />

      {/* Confirmación de eliminación (servicios y repuestos) */}
      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        title={`¿Eliminar ${confirmDel?.kind === 'svc' ? 'servicio' : 'repuesto'}?`}
        message={
          confirmDel
            ? `"${confirmDel.name}"${confirmDel.hasInventory ? ' — el stock volverá al inventario automáticamente.' : ''}`
            : undefined
        }
        loading={mutRemoveSvc.isPending || mutRemovePart.isPending}
        onConfirm={() => {
          if (!confirmDel) return
          if (confirmDel.kind === 'svc')  mutRemoveSvc.mutate(confirmDel.id)
          else                             mutRemovePart.mutate(confirmDel.id)
          setConfirmDel(null)
        }}
      />

      {/* Modal registrar pago */}
      <Modal open={paymentModal} onClose={() => { setPaymentModal(false); resetPay() }} title="Registrar pago" size="sm">
        <form onSubmit={handlePay((d) => mutAddPayment.mutate(d))} className="space-y-4">
          <div className="flex justify-between text-sm bg-gray-50 rounded-lg p-3">
            <span className="text-gray-500">Saldo pendiente</span>
            <span className="font-semibold text-red-600">{fmtMoney(wo?.invoice?.balance)}</span>
          </div>
          <div>
            <label className="label">Método de pago *</label>
            <select {...regPay('method')} className="input" required>
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Monto (Lps) *</label>
              <input {...regPay('amount')} type="number" step="0.01" min="0.01" max={wo?.invoice?.balance} className="input" required />
            </div>
            <div>
              <label className="label">Fecha *</label>
              <input {...regPay('payment_date')} type="date" className="input" required />
            </div>
          </div>
          <div>
            <label className="label">Referencia</label>
            <input {...regPay('reference')} className="input" placeholder="N° transferencia, recibo..." />
          </div>
          <div>
            <label className="label">Notas</label>
            <input {...regPay('notes')} className="input" />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => { setPaymentModal(false); resetPay() }} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={mutAddPayment.isPending} className="btn-primary">
              {mutAddPayment.isPending ? 'Registrando...' : 'Registrar pago'}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  )
}
