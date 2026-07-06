const STATUS_CONFIG = {
  // OT estados
  recibido:    { label: 'Recibido',    dot: 'bg-blue-500',   pill: 'bg-blue-50   text-blue-700   ring-blue-200' },
  diagnostico: { label: 'Diagnóstico', dot: 'bg-purple-500', pill: 'bg-purple-50 text-purple-700 ring-purple-200' },
  en_progreso: { label: 'En Progreso', dot: 'bg-amber-500',  pill: 'bg-amber-50  text-amber-700  ring-amber-200' },
  listo:       { label: 'Listo',       dot: 'bg-green-500',  pill: 'bg-green-50  text-green-700  ring-green-200' },
  entregado:   { label: 'Entregado',   dot: 'bg-gray-400',   pill: 'bg-gray-100  text-gray-600   ring-gray-200' },
  cancelado:   { label: 'Cancelado',   dot: 'bg-red-500',    pill: 'bg-red-50    text-red-700    ring-red-200' },
  // Facturas
  pendiente:   { label: 'Pendiente',   dot: 'bg-amber-500',  pill: 'bg-amber-50  text-amber-700  ring-amber-200' },
  pagada:      { label: 'Pagada',      dot: 'bg-green-500',  pill: 'bg-green-50  text-green-700  ring-green-200' },
  parcial:     { label: 'Parcial',     dot: 'bg-blue-500',   pill: 'bg-blue-50   text-blue-700   ring-blue-200' },
  anulada:     { label: 'Anulada',     dot: 'bg-red-500',    pill: 'bg-red-50    text-red-700    ring-red-200' },
  // Citas
  programada:  { label: 'Programada',   dot: 'bg-blue-500',   pill: 'bg-blue-50   text-blue-700   ring-blue-200' },
  confirmada:  { label: 'Confirmada',   dot: 'bg-green-500',  pill: 'bg-green-50  text-green-700  ring-green-200' },
  completada:  { label: 'Completada',   dot: 'bg-gray-400',   pill: 'bg-gray-100  text-gray-600   ring-gray-200' },
  no_presente: { label: 'No presente',  dot: 'bg-orange-500', pill: 'bg-orange-50 text-orange-700 ring-orange-200' },
}

export default function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? {
    label: status ?? '—',
    dot: 'bg-gray-400',
    pill: 'bg-gray-100 text-gray-600 ring-gray-200',
  }
  return (
    <span className={`badge ring-1 ${cfg.pill}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}
