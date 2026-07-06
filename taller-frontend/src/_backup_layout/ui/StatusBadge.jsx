const STATUS_STYLES = {
  // OT estados
  recibido:    'bg-blue-100 text-blue-700',
  diagnostico: 'bg-purple-100 text-purple-700',
  en_progreso: 'bg-yellow-100 text-yellow-700',
  listo:       'bg-green-100 text-green-700',
  entregado:   'bg-gray-100 text-gray-700',
  cancelado:   'bg-red-100 text-red-700',
  // Facturas
  pendiente:   'bg-yellow-100 text-yellow-700',
  pagada:      'bg-green-100 text-green-700',
  parcial:     'bg-blue-100 text-blue-700',
  anulada:     'bg-red-100 text-red-700',
  // Citas
  programada:  'bg-blue-100 text-blue-700',
  confirmada:  'bg-green-100 text-green-700',
  completada:  'bg-gray-100 text-gray-700',
}

const STATUS_LABELS = {
  recibido: 'Recibido', diagnostico: 'Diagnóstico', en_progreso: 'En Progreso',
  listo: 'Listo', entregado: 'Entregado', cancelado: 'Cancelado',
  pendiente: 'Pendiente', pagada: 'Pagada', parcial: 'Parcial', anulada: 'Anulada',
  programada: 'Programada', confirmada: 'Confirmada', completada: 'Completada',
}

export default function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-600'
  const label = STATUS_LABELS[status] ?? status
  return <span className={`badge ${style}`}>{label}</span>
}
