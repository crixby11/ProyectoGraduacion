import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Banknote, CreditCard, ArrowLeftRight, MoreHorizontal, Download, DollarSign } from 'lucide-react'
import { fmtDate, fmtMoney } from '../utils/date'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getPayments, createPayment } from '../api/payments'
import { getInvoices } from '../api/invoices'
import PageHeader from '../components/ui/PageHeader'
import { Table, Pagination } from '../components/ui/Table'
import Modal from '../components/ui/Modal'

const schema = z.object({
  invoice_id: z.coerce.number().min(1, 'Seleccione una factura'),
  method: z.enum(['efectivo', 'transferencia', 'tarjeta', 'otro']),
  amount: z.coerce.number().min(0.01, 'Monto requerido'),
  payment_date: z.string().min(1, 'Fecha requerida'),
  reference: z.string().optional(),
  notes: z.string().optional(),
})


const METHOD_LABELS = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  tarjeta: 'Tarjeta',
  otro: 'Otro',
}

const METHOD_ICONS = {
  efectivo: Banknote,
  transferencia: ArrowLeftRight,
  tarjeta: CreditCard,
  otro: MoreHorizontal,
}

const exportCsv = (rows) => {
  const headers = ['Fecha', 'Factura', 'OT', 'Cliente', 'Método', 'Monto (Lps)', 'Referencia']
  const lines = rows.map((r) => [
    r.payment_date,
    r.invoice?.number ?? '',
    r.work_order?.number ?? '',
    r.customer?.name ?? '',
    r.method,
    Number(r.amount).toFixed(2),
    r.reference ?? '',
  ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
  const blob = new Blob(['﻿' + [headers.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `pagos-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const today = () => new Date().toISOString().slice(0, 10)
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10)

const QUICK_PERIODS = [
  { label: 'Hoy', from: today(), to: today() },
  { label: 'Esta semana', from: daysAgo(6), to: today() },
  { label: 'Este mes', from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10), to: today() },
  { label: 'Todo', from: '', to: '' },
]

export default function Payments() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [method, setMethod] = useState('')
  const [activePeriod, setActivePeriod] = useState('Todo')

  const applyPeriod = (p) => {
    setActivePeriod(p.label)
    setDateFrom(p.from)
    setDateTo(p.to)
    setPage(1)
  }

  const { data, isLoading } = useQuery({
    queryKey: ['payments-page', { page, dateFrom, dateTo, method }],
    queryFn: () => getPayments({
      page,
      per_page: 20,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      method: method || undefined,
    }).then((r) => r.data),
    keepPreviousData: true,
  })

  const { data: pendingInvoices } = useQuery({
    queryKey: ['invoices-pending-partial'],
    queryFn: async () => {
      const [pend, part] = await Promise.all([
        getInvoices({ status: 'pendiente', per_page: 200 }).then((r) => r.data.data),
        getInvoices({ status: 'parcial', per_page: 200 }).then((r) => r.data.data),
      ])
      return [...pend, ...part].sort((a, b) => a.number.localeCompare(b.number))
    },
    enabled: modalOpen,
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { method: 'efectivo', payment_date: today() },
  })

  const save = useMutation({
    mutationFn: (d) => createPayment(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments-page'] })
      qc.invalidateQueries({ queryKey: ['invoices'] })
      toast.success('Pago registrado')
      setModalOpen(false)
      reset()
    },
    onError: (e) => toast.error(e.response?.data?.message ?? 'Error'),
  })

  const summary = data?.summary ?? {}
  const byMethod = summary.by_method ?? {}

  const columns = [
    {
      key: 'payment_date',
      label: 'Fecha',
      render: (r) => fmtDate(r.payment_date),
    },
    {
      key: 'invoice',
      label: 'Factura',
      render: (r) => r.invoice ? <span className="font-mono text-sm">{r.invoice.number}</span> : '—',
    },
    {
      key: 'work_order',
      label: 'OT',
      render: (r) => r.work_order ? (
        <Link to={`/work-orders/${r.work_order.id}`} className="font-mono text-primary-600 hover:underline text-sm">
          {r.work_order.number}
        </Link>
      ) : '—',
    },
    { key: 'customer', label: 'Cliente', render: (r) => r.customer?.name ?? '—' },
    {
      key: 'method',
      label: 'Método',
      render: (r) => {
        const Icon = METHOD_ICONS[r.method] ?? MoreHorizontal
        return (
          <span className="inline-flex items-center gap-1.5 text-sm">
            <Icon size={14} className="text-gray-400" />
            {METHOD_LABELS[r.method] ?? r.method}
          </span>
        )
      },
    },
    {
      key: 'amount',
      label: 'Monto',
      render: (r) => <span className="font-semibold text-green-600">{fmtMoney(r.amount)}</span>,
    },
    { key: 'reference', label: 'Referencia', render: (r) => <span className="text-gray-400 text-xs font-mono">{r.reference ?? '—'}</span> },
  ]

  return (
    <div>
      <PageHeader
        title="Pagos"
        icon={DollarSign}
        subtitle={data ? `${data.total} registros` : ''}
        action={
          <div className="flex gap-2">
            <button onClick={() => exportCsv(data?.data ?? [])} className="btn-secondary" title="Exportar CSV">
              <Download size={16} /> CSV
            </button>
            <button onClick={() => setModalOpen(true)} className="btn-primary"><Plus size={16} /> Registrar pago</button>
          </div>
        }
      />

      {/* Resumen por método */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {['efectivo', 'transferencia', 'tarjeta', 'otro'].map((m) => {
            const Icon = METHOD_ICONS[m]
            const val = Number(byMethod[m] ?? 0)
            return (
              <div
                key={m}
                onClick={() => { setMethod(method === m ? '' : m); setPage(1) }}
                className={`card p-4 cursor-pointer transition-all ${method === m ? 'ring-2 ring-primary-500' : 'hover:shadow-md'}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon size={16} className="text-gray-400" />
                  <span className="text-xs text-gray-500 capitalize">{METHOD_LABELS[m]}</span>
                </div>
                <p className="text-lg font-bold text-gray-900">{fmtMoney(val)}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* Total del período */}
      {data && (
        <div className="card p-4 mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-500">Período:</span>
            {QUICK_PERIODS.map((p) => (
              <button
                key={p.label}
                onClick={() => applyPeriod(p)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${activePeriod === p.label ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-200 text-gray-600 hover:border-primary-300'}`}
              >
                {p.label}
              </button>
            ))}
            {/* Personalizado */}
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setActivePeriod(''); setPage(1) }}
              className="input w-auto text-xs py-1"
            />
            <span className="text-gray-400 text-xs">—</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setActivePeriod(''); setPage(1) }}
              className="input w-auto text-xs py-1"
            />
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Total cobrado{method ? ` (${METHOD_LABELS[method]})` : ''}</p>
            <p className="text-2xl font-bold text-green-600">{fmtMoney(summary.total ?? 0)}</p>
          </div>
        </div>
      )}

      <div className="card">
        <Table columns={columns} data={data?.data ?? []} loading={isLoading} emptyMessage="No hay pagos en el período seleccionado" />
        <Pagination meta={data} onPageChange={setPage} />
      </div>

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); reset() }} title="Registrar pago">
        <form onSubmit={handleSubmit((d) => save.mutate(d))} className="space-y-4">
          <div>
            <label className="label">Factura *</label>
            <select {...register('invoice_id')} className="input">
              <option value="">Seleccionar factura...</option>
              {(pendingInvoices ?? []).map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.number} — Saldo: {fmtMoney(inv.balance)}
                  {inv.work_order ? ` (${inv.work_order.number})` : ''}
                </option>
              ))}
            </select>
            {errors.invoice_id && <p className="mt-1 text-xs text-red-500">{errors.invoice_id.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Método *</label>
              <select {...register('method')} className="input">
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <div>
              <label className="label">Monto (Lps) *</label>
              <input {...register('amount')} type="number" step="0.01" min="0.01" className="input" />
              {errors.amount && <p className="mt-1 text-xs text-red-500">{errors.amount.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Fecha *</label>
              <input {...register('payment_date')} type="date" className="input" />
              {errors.payment_date && <p className="mt-1 text-xs text-red-500">{errors.payment_date.message}</p>}
            </div>
            <div>
              <label className="label">Referencia</label>
              <input {...register('reference')} className="input" placeholder="N° transferencia, recibo..." />
            </div>
          </div>
          <div>
            <label className="label">Notas</label>
            <textarea {...register('notes')} rows={2} className="input" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setModalOpen(false); reset() }} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={save.isPending} className="btn-primary">
              {save.isPending ? 'Guardando...' : 'Registrar pago'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}