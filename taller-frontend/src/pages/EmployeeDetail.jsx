import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  ArrowLeft, Edit2, ClipboardList, Phone, Mail, Wrench, Plus, Gift,
  Paperclip, FileText, Image, File, Trash2, Download, BarChart2,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { fmtDate } from '../utils/date'
import { isValidPhone, fmtPhone } from '../utils/hn'
import toast from 'react-hot-toast'
import {
  getEmployee, updateEmployee, createEmployeeBonus, updateEmployeeBonus,
  getEmployeeFiles, uploadEmployeeFile, deleteEmployeeFile, getEmployeeStat,
} from '../api/employees'
import Modal from '../components/ui/Modal'
import StatusBadge from '../components/ui/StatusBadge'
import FileUploadZone from '../components/ui/FileUploadZone'

const schema = z.object({
  first_name:       z.string().min(1, 'Requerido'),
  second_name:      z.string().optional(),
  last_name:        z.string().min(1, 'Requerido'),
  second_last_name: z.string().optional(),
  specialty:        z.string().optional(),
  phone:            z.string().min(1, 'El teléfono es requerido').refine(isValidPhone, 'Teléfono inválido (8 dígitos, ej: 9999-9999)'),
  email:            z.string().email('Email inválido').optional().or(z.literal('')),
  biweekly_salary:  z.coerce.number().min(0, 'Debe ser >= 0'),
  active:           z.boolean().optional(),
  notes:            z.string().optional(),
})

const bonusSchema = z.object({
  work_order_id: z.string().optional(),
  amount:        z.coerce.number().min(0.01, 'Debe ser > 0'),
  description:   z.string().optional(),
  bonus_month:   z.string().regex(/^\d{4}-\d{2}$/, 'Selecciona un mes'),
})

const fmt  = (n) => `Lps ${Number(n ?? 0).toLocaleString('es-HN')}`
const fmtH = (n) => `${Number(n ?? 0).toFixed(1)} h`
const currentMonth = () => new Date().toISOString().slice(0, 7)

function StatTooltip({ active, payload, label, money }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs min-w-[130px]">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
            <span className="text-gray-500">{p.name}</span>
          </span>
          <span className="font-bold text-gray-800">{money ? fmt(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  )
}

const MONTHS_ES  = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const MONTHS_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const fmtMonth = (yyyyMm) => {
  if (!yyyyMm) return '—'
  const [y, m] = yyyyMm.slice(0, 7).split('-')
  return `${MONTHS_ES[parseInt(m, 10) - 1]} ${y}`
}
const fmtMonthShort = (yyyyMm) => {
  if (!yyyyMm) return ''
  const [y, m] = yyyyMm.slice(0, 7).split('-')
  return `${MONTHS_SHORT[parseInt(m, 10) - 1]} ${y.slice(2)}`
}

const fmtFileSize = (bytes) => {
  if (!bytes) return '0 B'
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`
  if (bytes >= 1024)    return `${(bytes / 1024).toFixed(0)} KB`
  return `${bytes} B`
}

function FileTypeIcon({ mime }) {
  if (!mime) return <File size={20} className="text-gray-400 shrink-0" />
  if (mime.startsWith('image/'))
    return <Image size={20} className="text-blue-400 shrink-0" />
  if (mime === 'application/pdf')
    return <FileText size={20} className="text-red-400 shrink-0" />
  if (mime.includes('word') || mime.includes('document'))
    return <FileText size={20} className="text-blue-500 shrink-0" />
  if (mime.includes('sheet') || mime.includes('excel') || mime.includes('csv'))
    return <FileText size={20} className="text-green-500 shrink-0" />
  return <File size={20} className="text-gray-400 shrink-0" />
}

export default function EmployeeDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)
  const [bonusOpen, setBonusOpen] = useState(false)
  const [editingBonus, setEditingBonus] = useState(null)
  const [fileOpen, setFileOpen] = useState(false)
  const [pendingFile, setPendingFile] = useState(null)
  const [fileDescription, setFileDescription] = useState('')

  const { data: employee, isLoading } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => getEmployee(id).then((r) => r.data),
  })

  const { data: files = [], isLoading: filesLoading } = useQuery({
    queryKey: ['employee-files', id],
    queryFn: () => getEmployeeFiles(id).then((r) => r.data),
    enabled: !!id,
  })

  const [statMonths, setStatMonths] = useState(6)
  const { data: stats } = useQuery({
    queryKey: ['employee-stat', id, statMonths],
    queryFn: () => getEmployeeStat(id, { months: statMonths }).then((r) => r.data),
    enabled: !!id,
  })

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm({ resolver: zodResolver(schema) })
  const { register: regB, handleSubmit: handleB, reset: resetB, formState: { errors: errB } } = useForm({
    resolver: zodResolver(bonusSchema),
  })

  const save = useMutation({
    mutationFn: (d) => updateEmployee(id, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employee', id] })
      qc.invalidateQueries({ queryKey: ['employees'] })
      toast.success('Empleado actualizado')
      setEditOpen(false)
    },
    onError: (e) => toast.error(e.response?.data?.message ?? 'Error'),
  })

  const saveBonus = useMutation({
    mutationFn: (d) => {
      const payload = { ...d, work_order_id: d.work_order_id || undefined }
      return editingBonus
        ? updateEmployeeBonus(id, editingBonus.id, payload)
        : createEmployeeBonus(id, payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employee', id] })
      toast.success(editingBonus ? 'Bono actualizado' : 'Bono registrado')
      setBonusOpen(false)
      setEditingBonus(null)
      resetB()
    },
    onError: (e) => toast.error(e.response?.data?.message ?? 'Error'),
  })

  const uploadFile = useMutation({
    mutationFn: () => {
      const fd = new FormData()
      fd.append('file', pendingFile)
      if (fileDescription.trim()) fd.append('description', fileDescription.trim())
      return uploadEmployeeFile(id, fd)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employee-files', id] })
      toast.success('Archivo subido')
      setFileOpen(false)
      setPendingFile(null)
      setFileDescription('')
    },
    onError: (e) => toast.error(e.response?.data?.message ?? 'Error al subir archivo'),
  })

  const removeFile = useMutation({
    mutationFn: (fileId) => deleteEmployeeFile(id, fileId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employee-files', id] })
      toast.success('Archivo eliminado')
    },
    onError: () => toast.error('No se pudo eliminar el archivo'),
  })

  const openNewBonus = () => {
    setEditingBonus(null)
    resetB({ bonus_month: currentMonth() })
    setBonusOpen(true)
  }

  const openEditBonus = (b) => {
    setEditingBonus(b)
    resetB({
      amount:        b.amount,
      bonus_month:   (b.bonus_month ?? '').slice(0, 7),
      description:   b.description ?? '',
      work_order_id: b.work_order_id ? String(b.work_order_id) : '',
    })
    setBonusOpen(true)
  }

  if (isLoading) return <div className="flex items-center justify-center py-24 text-gray-400">Cargando...</div>
  if (!employee) return null

  const workOrders = employee.work_orders ?? []
  const bonuses = employee.bonuses ?? []
  const totalBonuses = bonuses.reduce((sum, b) => sum + Number(b.amount), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-4">
        <button onClick={() => navigate('/employees')} className="btn-ghost p-2">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{employee.name}</h1>
            <span className={`badge text-xs ${employee.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {employee.active ? 'Activo' : 'Inactivo'}
            </span>
          </div>
          <p className="text-sm text-gray-500">{employee.specialty ?? 'Sin especialidad asignada'}</p>
        </div>
        <button onClick={() => { reset({ ...employee, active: employee.active }); setEditOpen(true) }} className="btn-secondary">
          <Edit2 size={15} /> Editar
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna izquierda */}
        <div className="space-y-4">
          {/* Info */}
          <div className="card p-4">
            <h3 className="font-semibold text-gray-800 mb-3">Información</h3>
            <dl className="space-y-3 text-sm">
              {employee.phone && (
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-gray-400 shrink-0" />
                  <div>
                    <dt className="text-gray-500 text-xs">Teléfono</dt>
                    <dd className="font-medium">{employee.phone}</dd>
                  </div>
                </div>
              )}
              {employee.email && (
                <div className="flex items-center gap-2">
                  <Mail size={14} className="text-gray-400 shrink-0" />
                  <div>
                    <dt className="text-gray-500 text-xs">Email</dt>
                    <dd>{employee.email}</dd>
                  </div>
                </div>
              )}
              {employee.specialty && (
                <div className="flex items-center gap-2">
                  <Wrench size={14} className="text-gray-400 shrink-0" />
                  <div>
                    <dt className="text-gray-500 text-xs">Especialidad</dt>
                    <dd className="font-medium">{employee.specialty}</dd>
                  </div>
                </div>
              )}
              <div className="pt-1 border-t border-gray-100">
                <dt className="text-gray-500">Salario quincenal</dt>
                <dd className="text-lg font-semibold text-primary-700">{fmt(employee.biweekly_salary)}</dd>
              </div>
              {employee.notes && (
                <div className="pt-1 border-t border-gray-100">
                  <dt className="text-gray-500">Notas</dt>
                  <dd className="text-gray-700 mt-1">{employee.notes}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Estadísticas */}
          <div className="card p-4">
            <h3 className="font-semibold text-gray-800 mb-3">Resumen</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Total de OTs</dt>
                <dd className="font-semibold">{workOrders.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">En proceso</dt>
                <dd className="font-semibold text-yellow-600">
                  {workOrders.filter((wo) => ['recibido', 'diagnostico', 'en_progreso', 'listo'].includes(wo.status)).length}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Completadas</dt>
                <dd className="font-semibold text-green-600">
                  {workOrders.filter((wo) => wo.status === 'entregado').length}
                </dd>
              </div>
              <div className="flex justify-between pt-1 border-t border-gray-100">
                <dt className="text-gray-500">Bonos recibidos</dt>
                <dd className="font-semibold text-primary-700">{fmt(totalBonuses)}</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Columna derecha */}
        <div className="lg:col-span-2 space-y-4">
          {/* Órdenes de trabajo */}
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <ClipboardList size={16} className="text-primary-600" />
              <h3 className="font-semibold text-gray-800">Órdenes de trabajo ({workOrders.length})</h3>
            </div>
            {!workOrders.length ? (
              <p className="text-sm text-gray-400 py-4 text-center">Sin órdenes de trabajo asignadas</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-500 font-medium">
                    <th className="text-left py-1.5">N° OT</th>
                    <th className="text-left py-1.5">Cliente / Vehículo</th>
                    <th className="text-left py-1.5">Tipo</th>
                    <th className="text-left py-1.5">Estado</th>
                    <th className="text-right py-1.5">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {workOrders.map((wo) => (
                    <tr key={wo.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2">
                        <Link to={`/work-orders/${wo.id}`} className="font-mono text-primary-600 hover:underline font-semibold">
                          {wo.number}
                        </Link>
                      </td>
                      <td className="py-2 text-gray-600">
                        {wo.customer_id ? (
                          <Link to={`/customers/${wo.customer_id}`} className="hover:underline text-primary-600">
                            {wo.customer_name ?? '—'}
                          </Link>
                        ) : (
                          <span>{wo.customer_name ?? '—'}</span>
                        )}
                        {wo.vehicle_plate && (
                          <div className="text-xs font-mono mt-0.5">
                            {wo.vehicle_id ? (
                              <Link to={`/vehicles/${wo.vehicle_id}`} className="text-primary-400 hover:underline">
                                {wo.vehicle_plate} {wo.vehicle_brand} {wo.vehicle_model}
                              </Link>
                            ) : (
                              <span className="text-gray-400">{wo.vehicle_plate} {wo.vehicle_brand} {wo.vehicle_model}</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-2 text-gray-600">{wo.service_type ?? '—'}</td>
                      <td className="py-2"><StatusBadge status={wo.status} /></td>
                      <td className="py-2 text-right font-medium">{fmt(wo.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Bonos */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Gift size={16} className="text-primary-600" />
                <h3 className="font-semibold text-gray-800">Bonos ({bonuses.length})</h3>
              </div>
              <button onClick={openNewBonus} className="btn-secondary text-xs py-1.5">
                <Plus size={14} /> Agregar bono
              </button>
            </div>
            {!bonuses.length ? (
              <p className="text-sm text-gray-400 py-4 text-center">Sin bonos registrados</p>
            ) : (
              <div className="space-y-4">
                {(() => {
                  // Agrupar por mes (YYYY-MM)
                  const groups = {}
                  bonuses.forEach((b) => {
                    const key = (b.bonus_month ?? '').slice(0, 7)
                    if (!groups[key]) groups[key] = []
                    groups[key].push(b)
                  })
                  return Object.entries(groups).map(([monthKey, items]) => {
                    const monthTotal = items.reduce((s, b) => s + Number(b.amount), 0)
                    return (
                      <div key={monthKey}>
                        {/* Encabezado del mes */}
                        <div className="flex items-center justify-between px-1 mb-2">
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                            {fmtMonth(monthKey)}
                          </span>
                          <span className="text-xs font-semibold text-primary-700">{fmt(monthTotal)}</span>
                        </div>
                        {/* Filas del mes */}
                        <div className="rounded-xl border border-gray-100 overflow-hidden">
                          <table className="w-full text-sm">
                            <tbody>
                              {items.map((b, i) => (
                                <tr key={b.id} className={`hover:bg-primary-50/40 ${i < items.length - 1 ? 'border-b border-gray-50' : ''}`}>
                                  <td className="py-2 px-3 text-gray-700">{b.description || <span className="text-gray-400">Sin descripción</span>}</td>
                                  <td className="py-2 px-3">
                                    {b.work_order ? (
                                      <Link to={`/work-orders/${b.work_order.id}`} className="font-mono text-xs text-primary-600 hover:underline">
                                        {b.work_order.number}
                                      </Link>
                                    ) : <span className="text-gray-300 text-xs">—</span>}
                                  </td>
                                  <td className="py-2 px-3 text-right font-semibold text-primary-700 whitespace-nowrap">{fmt(b.amount)}</td>
                                  <td className="py-2 pr-2 w-8">
                                    <button onClick={() => openEditBonus(b)} className="btn-ghost p-1 text-gray-400 hover:text-primary-600" title="Editar">
                                      <Edit2 size={13} />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )
                  })
                })()}
                {/* Total general */}
                <div className="flex justify-between items-center pt-2 border-t border-gray-200 px-1">
                  <span className="text-sm text-gray-500 font-medium">Total bonos</span>
                  <span className="font-bold text-primary-700">{fmt(totalBonuses)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Estadísticas individuales */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart2 size={16} className="text-primary-600" />
            <h3 className="font-semibold text-gray-800">Estadísticas</h3>
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {[{ v: 6, l: '6 meses' }, { v: 12, l: '12 meses' }].map(({ v, l }) => (
              <button
                key={v}
                onClick={() => setStatMonths(v)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  statMonths === v ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* KPI mini-cards */}
        {stats && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              {[
                { label: 'OTs atendidas',   value: stats.totals?.ot_count ?? 0,       color: 'text-blue-600',   bg: 'bg-blue-50' },
                { label: 'Horas trabajadas', value: fmtH(stats.totals?.total_hours),   color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: 'Ingresos totales', value: fmt(stats.totals?.total_revenue),  color: 'text-primary-700', bg: 'bg-primary-50' },
                { label: 'Total bonos',      value: fmt(stats.total_bonuses),           color: 'text-violet-600',  bg: 'bg-violet-50' },
              ].map((k) => (
                <div key={k.label} className={`rounded-xl p-3 ${k.bg}`}>
                  <p className="text-xs text-gray-500 mb-0.5">{k.label}</p>
                  <p className={`text-base font-bold tabular-nums ${k.color}`}>{k.value}</p>
                </div>
              ))}
            </div>

            {/* Gráficas */}
            {(() => {
              const revenueData = stats.series.map((s) => ({
                month:   fmtMonthShort(s.month),
                revenue: Number(s.revenue),
                hours:   Number(s.hours),
                bonuses: Number(s.bonuses),
              }))
              return (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {/* Ingresos por mes */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Ingresos por mes</p>
                    <ResponsiveContainer width="100%" height={180}>
                      <AreaChart data={revenueData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={50}
                          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                        <Tooltip content={<StatTooltip money />} />
                        <Area type="monotone" dataKey="revenue" name="Ingresos"
                          stroke="#3b82f6" strokeWidth={2} fill="url(#gRev)" dot={{ r: 3 }} activeDot={{ r: 5 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Horas por mes */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Horas trabajadas por mes</p>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={revenueData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={35} />
                        <Tooltip content={<StatTooltip />} />
                        <Bar dataKey="hours" name="Horas" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )
            })()}
          </>
        )}
      </div>

      {/* Archivos */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Paperclip size={16} className="text-primary-600" />
            <h3 className="font-semibold text-gray-800">Archivos ({files.length})</h3>
          </div>
          <button onClick={() => { setPendingFile(null); setFileDescription(''); setFileOpen(true) }} className="btn-secondary text-xs py-1.5">
            <Plus size={14} /> Subir archivo
          </button>
        </div>

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

      {/* Modal subir archivo */}
      <Modal open={fileOpen} onClose={() => setFileOpen(false)} title="Subir archivo">
        <div className="space-y-4">
          <FileUploadZone onSelect={setPendingFile} disabled={uploadFile.isPending} />
          <div>
            <label className="label">Descripción (opcional)</label>
            <input
              value={fileDescription}
              onChange={(e) => setFileDescription(e.target.value)}
              className="input"
              placeholder="Contrato, certificado, identificación..."
              maxLength={255}
            />
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={() => setFileOpen(false)} className="btn-secondary">Cancelar</button>
            <button
              onClick={() => uploadFile.mutate()}
              disabled={!pendingFile || uploadFile.isPending}
              className="btn-primary"
            >
              {uploadFile.isPending ? 'Subiendo...' : 'Subir archivo'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal agregar / editar bono */}
      <Modal open={bonusOpen} onClose={() => { setBonusOpen(false); setEditingBonus(null); resetB() }} title={editingBonus ? 'Editar bono' : 'Agregar bono'}>
        <form onSubmit={handleB((d) => saveBonus.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Mes *</label>
              <input {...regB('bonus_month')} type="month" className="input" max={currentMonth()} />
              {errB.bonus_month && <p className="mt-1 text-xs text-red-500">{errB.bonus_month.message}</p>}
            </div>
            <div>
              <label className="label">Monto (Lps) *</label>
              <input {...regB('amount')} type="number" step="0.01" min="0.01" className="input" placeholder="0.00" />
              {errB.amount && <p className="mt-1 text-xs text-red-500">{errB.amount.message}</p>}
            </div>
            <div className="sm:col-span-2">
              <label className="label">Descripción / Motivo</label>
              <input {...regB('description')} className="input" placeholder="Bono por productividad, horas extra..." />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Orden de trabajo (opcional)</label>
              <select {...regB('work_order_id')} className="input">
                <option value="">Sin orden de trabajo</option>
                {workOrders.map((wo) => (
                  <option key={wo.id} value={wo.id}>
                    {wo.number} — {wo.customer_name ?? ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setBonusOpen(false); setEditingBonus(null); resetB() }} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={saveBonus.isPending} className="btn-primary">
              {saveBonus.isPending ? 'Guardando...' : editingBonus ? 'Actualizar bono' : 'Guardar bono'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal editar empleado */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Editar empleado">
        <form onSubmit={handleSubmit((d) => save.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Primer nombre *</label>
              <input {...register('first_name')} className="input" />
              {errors.first_name && <p className="mt-1 text-xs text-red-500">{errors.first_name.message}</p>}
            </div>
            <div>
              <label className="label">Segundo nombre</label>
              <input {...register('second_name')} className="input" />
            </div>
            <div>
              <label className="label">Primer apellido *</label>
              <input {...register('last_name')} className="input" />
              {errors.last_name && <p className="mt-1 text-xs text-red-500">{errors.last_name.message}</p>}
            </div>
            <div>
              <label className="label">Segundo apellido</label>
              <input {...register('second_last_name')} className="input" />
            </div>
            <div>
              <label className="label">Especialidad</label>
              <input {...register('specialty')} className="input" placeholder="Motor y transmisión" />
            </div>
            <div>
              <label className="label">Teléfono</label>
              <input
                {...register('phone')}
                onChange={(e) => setValue('phone', fmtPhone(e.target.value), { shouldValidate: true })}
                className="input" placeholder="9999-9999" maxLength={9}
              />
              {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone.message}</p>}
            </div>
            <div>
              <label className="label">Email</label>
              <input {...register('email')} type="email" className="input" />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
            </div>
            <div>
              <label className="label">Salario quincenal (Lps) *</label>
              <input {...register('biweekly_salary')} type="number" step="0.01" className="input" placeholder="0.00" />
              {errors.biweekly_salary && <p className="mt-1 text-xs text-red-500">{errors.biweekly_salary.message}</p>}
            </div>
            <div className="sm:col-span-2 flex items-center gap-2">
              <input type="checkbox" {...register('active')} id="active-detail" className="w-4 h-4 text-primary-600" />
              <label htmlFor="active-detail" className="text-sm text-gray-700">Empleado activo</label>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Notas</label>
              <textarea {...register('notes')} rows={2} className="input" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setEditOpen(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={save.isPending} className="btn-primary">
              {save.isPending ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
