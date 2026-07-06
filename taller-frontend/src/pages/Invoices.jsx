import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Download, MessageCircle, ClipboardList, AlertCircle, CheckCircle2, Clock, FileDown, FileText } from 'lucide-react'
import { fmtDate, fmtDateTime } from '../utils/date'
import toast from 'react-hot-toast'
import { getInvoices, getInvoicePdf, getWhatsappLink } from '../api/invoices'
import PageHeader from '../components/ui/PageHeader'
import SearchInput from '../components/ui/SearchInput'
import { Table, Pagination } from '../components/ui/Table'
import StatusBadge from '../components/ui/StatusBadge'

const exportCsv = (rows) => {
  const headers = ['N° Factura', 'OT', 'Cliente', 'Fecha', 'Subtotal', 'Descuento', 'Impuesto', 'Total', 'Pagado', 'Saldo', 'Estado']
  const lines = rows.map((r) => [
    r.number,
    r.work_order?.number ?? '',
    r.customer?.name ?? r.work_order?.customer_name ?? '',
    fmtDateTime(r.issued_at),
    Number(r.subtotal ?? 0).toFixed(2),
    Number(r.discount_amount ?? 0).toFixed(2),
    Number(r.tax_amount ?? 0).toFixed(2),
    Number(r.total ?? 0).toFixed(2),
    Number(r.amount_paid ?? 0).toFixed(2),
    Number(r.balance ?? 0).toFixed(2),
    r.status,
  ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
  const blob = new Blob(['﻿' + [headers.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `facturas-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const fmt = (n) => `Lps ${Number(n ?? 0).toLocaleString('es-HN', { minimumFractionDigits: 2 })}`
const fmtShort = (n) => `Lps ${Number(n ?? 0).toLocaleString('es-HN', { minimumFractionDigits: 0 })}`

const STATUS_OPTIONS = ['pendiente', 'parcial', 'pagada', 'anulada']

export default function Invoices() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', { search, status, dateFrom, dateTo, page }],
    queryFn: () => getInvoices({
      search,
      status: status || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      page,
      per_page: 15,
    }).then((r) => r.data),
    keepPreviousData: true,
  })

  const downloadPdf = async (invoice) => {
    try {
      const res = await getInvoicePdf(invoice.id)
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `factura-${invoice.number}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Error al generar PDF')
    }
  }

  const openWhatsApp = async (invoice) => {
    const res = await getWhatsappLink(invoice.id)
    window.open(res.data.url, '_blank')
  }

  const summary = data?.summary ?? {}

  const columns = [
    {
      key: 'number',
      label: 'N° Factura',
      render: (r) => <span className="font-mono font-semibold">{r.number}</span>,
    },
    {
      key: 'work_order',
      label: 'OT',
      render: (r) => r.work_order ? (
        <Link to={`/work-orders/${r.work_order_id}`} className="text-primary-600 hover:underline font-mono text-sm">
          {r.work_order.number}
        </Link>
      ) : '—',
    },
    {
      key: 'customer',
      label: 'Cliente',
      render: (r) => {
        const name = r.customer?.name ?? r.work_order?.customer_name ?? '—'
        return r.customer?.id
          ? <Link to={`/customers/${r.customer.id}`} className="hover:underline text-gray-800">{name}</Link>
          : <span>{name}</span>
      },
    },
    {
      key: 'issued_at',
      label: 'Fecha',
      render: (r) => fmtDateTime(r.issued_at),
    },
    {
      key: 'total',
      label: 'Total',
      render: (r) => <span className="font-semibold">{fmtShort(r.total)}</span>,
    },
    {
      key: 'balance',
      label: 'Saldo',
      render: (r) => (
        <span className={Number(r.balance) > 0 ? 'text-red-600 font-semibold' : 'text-gray-400'}>
          {fmtShort(r.balance)}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Estado',
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: 'actions',
      label: '',
      width: '80px',
      render: (r) => (
        <div className="flex gap-1">
          <button onClick={() => downloadPdf(r)} className="btn-ghost p-1.5" title="Descargar PDF">
            <Download size={15} />
          </button>
          <button onClick={() => openWhatsApp(r)} className="btn-ghost p-1.5 text-green-600" title="Enviar WhatsApp">
            <MessageCircle size={15} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Facturación"
        icon={FileText}
        subtitle={data ? `${data.total} facturas` : ''}
        action={
          <button onClick={() => exportCsv(data?.data ?? [])} className="btn-secondary" title="Exportar página actual a CSV">
            <FileDown size={16} /> CSV
          </button>
        }
      />

      {/* Tarjetas de resumen */}
      {data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-1">
              <ClipboardList size={16} className="text-gray-400" />
              <span className="text-xs text-gray-500">Total facturas</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{summary.total_count ?? 0}</p>
            <p className="text-xs text-gray-400 mt-0.5">{fmtShort(summary.total_amount)}</p>
          </div>

          <div
            className={`card p-4 cursor-pointer transition-all hover:shadow-md ${status === 'pendiente' ? 'ring-2 ring-red-400' : ''}`}
            onClick={() => { setStatus(status === 'pendiente' ? '' : 'pendiente'); setPage(1) }}
          >
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle size={16} className="text-red-400" />
              <span className="text-xs text-gray-500">Por cobrar (pendiente)</span>
            </div>
            <p className="text-xl font-bold text-red-600">{fmtShort(summary.pending_balance)}</p>
            <p className="text-xs text-gray-400 mt-0.5">Clic para filtrar</p>
          </div>

          <div
            className={`card p-4 cursor-pointer transition-all hover:shadow-md ${status === 'parcial' ? 'ring-2 ring-yellow-400' : ''}`}
            onClick={() => { setStatus(status === 'parcial' ? '' : 'parcial'); setPage(1) }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Clock size={16} className="text-yellow-500" />
              <span className="text-xs text-gray-500">Saldo parcial</span>
            </div>
            <p className="text-xl font-bold text-yellow-600">{fmtShort(summary.partial_balance)}</p>
            <p className="text-xs text-gray-400 mt-0.5">{summary.uncollected_count ?? 0} facturas abiertas</p>
          </div>

          <div
            className={`card p-4 cursor-pointer transition-all hover:shadow-md ${status === 'pagada' ? 'ring-2 ring-green-400' : ''}`}
            onClick={() => { setStatus(status === 'pagada' ? '' : 'pagada'); setPage(1) }}
          >
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 size={16} className="text-green-500" />
              <span className="text-xs text-gray-500">Cobrado (saldo total)</span>
            </div>
            <p className="text-xl font-bold text-green-600">
              {fmtShort(Number(summary.total_amount ?? 0) - Number(summary.total_balance ?? 0))}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">Clic para ver pagadas</p>
          </div>
        </div>
      )}

      <div className="card">
        {/* Filtros */}
        <div className="p-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1) }}
            placeholder="Buscar por N°, OT, cliente..."
            className="flex-1 min-w-48"
          />
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1) }}
            className="input w-auto"
          >
            <option value="">Todos los estados</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
            className="input w-auto text-sm"
            title="Desde"
          />
          <span className="text-gray-400 text-sm">—</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
            className="input w-auto text-sm"
            title="Hasta"
          />
          {(status || dateFrom || dateTo) && (
            <button
              onClick={() => { setStatus(''); setDateFrom(''); setDateTo(''); setPage(1) }}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Limpiar filtros ✕
            </button>
          )}
        </div>

        <Table
          columns={columns}
          data={data?.data ?? []}
          loading={isLoading}
          emptyMessage="No hay facturas"
        />
        <Pagination meta={data} onPageChange={setPage} />
      </div>
    </div>
  )
}