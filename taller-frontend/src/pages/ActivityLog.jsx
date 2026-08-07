import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { History, LogIn } from 'lucide-react'
import { getActivityLogs, getActivityLogNames } from '../api/activityLogs'
import { fmtDateTime } from '../utils/date'
import PageHeader from '../components/ui/PageHeader'
import { Table, Pagination } from '../components/ui/Table'

const LOG_NAME_LABELS = {
  clientes: 'Clientes',
  vehiculos: 'Vehículos',
  empleados: 'Empleados',
  servicios: 'Servicios',
  inventario: 'Inventario',
  ordenes_trabajo: 'Órdenes de trabajo',
  facturas: 'Facturas',
  pagos: 'Pagos',
  citas: 'Citas',
  configuracion: 'Configuración',
  autenticacion: 'Autenticación',
}

const EVENT_CFG = {
  created: { label: 'Creado',      pill: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  updated: { label: 'Actualizado', pill: 'bg-blue-50 text-blue-700 ring-blue-200' },
  deleted: { label: 'Eliminado',   pill: 'bg-red-50 text-red-700 ring-red-200' },
}

const humanize = (field) =>
  field.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())

const formatValue = (v) => {
  if (v === null || v === undefined || v === '') return '(vacío)'
  if (typeof v === 'boolean') return v ? 'Sí' : 'No'
  return String(v)
}

function ChangeSummary({ activity }) {
  if (activity.log_name === 'autenticacion') {
    const ip = activity.properties?.ip
    return ip ? <span className="text-xs text-gray-400">IP: {ip}</span> : null
  }

  const attrs = activity.properties?.attributes
  const old   = activity.properties?.old
  if (!attrs || typeof attrs !== 'object') return <span className="text-gray-300">—</span>

  const fields = Object.keys(attrs)
  if (fields.length === 0) return <span className="text-gray-300">—</span>

  const shown = fields.slice(0, 2)
  const rest  = fields.length - shown.length

  return (
    <div className="text-xs text-gray-500 space-y-0.5">
      {shown.map((f) => (
        <div key={f} className="truncate max-w-xs">
          <span className="font-medium text-gray-600">{humanize(f)}:</span>{' '}
          {old && f in old ? (
            <>
              <span className="line-through text-gray-400">{formatValue(old[f])}</span>
              {' → '}
              <span className="text-gray-700">{formatValue(attrs[f])}</span>
            </>
          ) : (
            <span className="text-gray-700">{formatValue(attrs[f])}</span>
          )}
        </div>
      ))}
      {rest > 0 && <div className="text-gray-400">+{rest} campo{rest !== 1 ? 's' : ''} más</div>}
    </div>
  )
}

export default function ActivityLog() {
  const [page, setPage]       = useState(1)
  const [logName, setLogName] = useState('')
  const [event, setEvent]     = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]     = useState('')
  const [search, setSearch]     = useState('')

  const { data: logNames } = useQuery({
    queryKey: ['activity-log-names'],
    queryFn:  () => getActivityLogNames().then((r) => r.data),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['activity-logs', { page, logName, event, dateFrom, dateTo, search }],
    queryFn: () => getActivityLogs({
      page,
      log_name:  logName || undefined,
      event:     event || undefined,
      date_from: dateFrom || undefined,
      date_to:   dateTo || undefined,
      search:    search || undefined,
    }).then((r) => r.data),
    placeholderData: (prev) => prev,
  })

  const columns = [
    {
      key: 'created_at',
      label: 'Fecha',
      width: 150,
      render: (row) => <span className="text-gray-600 whitespace-nowrap">{fmtDateTime(row.created_at)}</span>,
    },
    {
      key: 'causer',
      label: 'Usuario',
      width: 140,
      render: (row) => (
        <span className="font-medium text-gray-700">{row.causer?.name ?? 'Sistema'}</span>
      ),
    },
    {
      key: 'log_name',
      label: 'Categoría',
      width: 140,
      render: (row) => (
        <span className="badge ring-1 bg-gray-50 text-gray-600 ring-gray-200">
          {LOG_NAME_LABELS[row.log_name] ?? row.log_name ?? '—'}
        </span>
      ),
    },
    {
      key: 'event',
      label: 'Evento',
      width: 110,
      render: (row) => {
        const cfg = EVENT_CFG[row.event]
        if (!cfg) return <span className="text-xs text-gray-500">{row.description}</span>
        return <span className={`badge ring-1 ${cfg.pill}`}>{cfg.label}</span>
      },
    },
    {
      key: 'detail',
      label: 'Detalle',
      render: (row) => <ChangeSummary activity={row} />,
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader
        title="Auditoría"
        icon={History}
        subtitle="Historial de actividad y cambios del sistema"
      />

      {/* Filtros */}
      <div className="card p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="label">Categoría</label>
          <select
            value={logName}
            onChange={(e) => { setLogName(e.target.value); setPage(1) }}
            className="input w-auto"
          >
            <option value="">Todas</option>
            {(logNames ?? []).map((ln) => (
              <option key={ln} value={ln}>{LOG_NAME_LABELS[ln] ?? ln}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Evento</label>
          <select
            value={event}
            onChange={(e) => { setEvent(e.target.value); setPage(1) }}
            className="input w-auto"
          >
            <option value="">Todos</option>
            <option value="created">Creado</option>
            <option value="updated">Actualizado</option>
            <option value="deleted">Eliminado</option>
          </select>
        </div>

        <div>
          <label className="label">Desde</label>
          <input
            type="date" value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
            className="input w-auto"
          />
        </div>

        <div>
          <label className="label">Hasta</label>
          <input
            type="date" value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
            className="input w-auto"
          />
        </div>

        <div className="flex-1 min-w-[180px]">
          <label className="label">Buscar</label>
          <input
            type="text" value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Buscar en descripción..."
            className="input"
          />
        </div>

        {(logName || event || dateFrom || dateTo || search) && (
          <button
            type="button"
            onClick={() => { setLogName(''); setEvent(''); setDateFrom(''); setDateTo(''); setSearch(''); setPage(1) }}
            className="btn-secondary"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* Tabla */}
      <div className="card">
        <Table
          columns={columns}
          data={data?.data ?? []}
          loading={isLoading}
          emptyMessage="No hay actividad registrada"
        />
        <Pagination meta={data} onPageChange={setPage} />
      </div>

      <p className="text-xs text-gray-400 flex items-center gap-1.5">
        <LogIn size={12} /> Los registros de auditoría no se pueden editar ni eliminar desde el sistema.
      </p>
    </div>
  )
}
