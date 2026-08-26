import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, Eye, ShoppingCart } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { fmtDate, fmtMoney } from '../../utils/date'
import { getPurchaseOrders } from '../../api/purchaseOrders'
import PageHeader from '../../components/ui/PageHeader'
import SearchInput from '../../components/ui/SearchInput'
import { Table, Pagination } from '../../components/ui/Table'
import StatusBadge from '../../components/ui/StatusBadge'

const STATUS_OPTIONS = ['pendiente', 'recibida', 'cancelada']

export default function PurchaseOrders() {
  const navigate = useNavigate()
  const [search,   setSearch]   = useState('')
  const [status,   setStatus]   = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo,   setDateTo]   = useState('')
  const [page,     setPage]     = useState(1)

  const hasFilters = !!(search || status || dateFrom || dateTo)
  const clearFilters = () => { setSearch(''); setStatus(''); setDateFrom(''); setDateTo(''); setPage(1) }

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-orders', { search, status, dateFrom, dateTo, page }],
    queryFn: () => getPurchaseOrders({
      search,
      status:    status   || undefined,
      date_from: dateFrom || undefined,
      date_to:   dateTo   || undefined,
      page,
      per_page: 15,
    }).then((r) => r.data),
    placeholderData: (prev) => prev,
  })

  const columns = [
    {
      key: 'number', label: 'N° Orden',
      render: (r) => (
        <Link to={`/purchase-orders/${r.id}`} className="font-mono font-semibold text-primary-600 hover:underline">
          {r.number}
        </Link>
      ),
    },
    { key: 'supplier', label: 'Proveedor', render: (r) => r.supplier?.name ?? '—' },
    { key: 'invoice', label: 'N° Factura', render: (r) => r.supplier_invoice_number ?? '—' },
    { key: 'total', label: 'Total', render: (r) => fmtMoney(r.total) },
    { key: 'status', label: 'Estado', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'order_date', label: 'Fecha', render: (r) => fmtDate(r.order_date) },
    {
      key: 'actions', label: '', width: '50px',
      render: (r) => (
        <Link to={`/purchase-orders/${r.id}`} className="btn-ghost p-1.5">
          <Eye size={15} />
        </Link>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Órdenes de Compra"
        icon={ShoppingCart}
        subtitle={data ? `${data.total} órdenes` : ''}
        action={
          <button onClick={() => navigate('/purchase-orders/new')} className="btn-primary">
            <Plus size={16} /> Nueva Orden de Compra
          </button>
        }
      />

      <div className="card">
        <div className="p-4 border-b border-gray-100 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Buscar por N°, proveedor, factura..." className="flex-1 min-w-48" />
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
          emptyMessage="No hay órdenes de compra"
        />
        <Pagination meta={data} onPageChange={setPage} />
      </div>
    </div>
  )
}
