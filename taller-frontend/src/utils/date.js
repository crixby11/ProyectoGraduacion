/** Formato canónico de moneda Lempiras — siempre 2 decimales */
export function fmtMoney(n) {
  return `L ${Number(n ?? 0).toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/**
 * Formatea cualquier valor de fecha que venga del backend de forma segura.
 *
 * Laravel puede devolver campos `date` como:
 *   - "2026-05-24"                    (Y-m-d)
 *   - "2026-05-24T00:00:00.000000Z"   (ISO 8601 con hora UTC)
 *   - "2026-05-24 00:00:00"           (MySQL datetime sin T)
 *   - null / undefined
 *
 * La solución: tomar solo los primeros 10 caracteres ("YYYY-MM-DD")
 * y parsear con hora al mediodía local para evitar el desfase de zona horaria.
 */
export function fmtDate(val, options = { day: '2-digit', month: 'short', year: 'numeric' }) {
  if (!val) return '—'
  const iso = String(val).slice(0, 10) // siempre "YYYY-MM-DD"
  const d = new Date(iso + 'T12:00:00')
  return isNaN(d) ? '—' : d.toLocaleDateString('es-HN', options)
}

/** Solo día/mes/año corto: "24/05/26" */
export function fmtDateShort(val) {
  return fmtDate(val, { day: '2-digit', month: '2-digit', year: '2-digit' })
}

/** Datetime completo (fecha + hora) para campos received_at, created_at, etc. */
export function fmtDateTime(val) {
  if (!val) return '—'
  // Normaliza "YYYY-MM-DD HH:MM:SS" y "...Z" a "YYYY-MM-DDTHH:MM"
  const s = String(val).replace(' ', 'T').slice(0, 16)
  const [datePart, timePart] = s.split('T')
  if (!datePart) return '—'
  // Parsea la fecha al mediodía local para evitar desfase de zona horaria
  const d = new Date(datePart + 'T12:00:00')
  if (isNaN(d)) return '—'
  const dateStr = d.toLocaleDateString('es-HN', { day: '2-digit', month: 'short', year: 'numeric' })
  if (!timePart) return dateStr
  const [h, m] = timePart.split(':').map(Number)
  const ampm = h < 12 ? 'AM' : 'PM'
  const h12  = h % 12 || 12
  return `${dateStr}, ${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

/**
 * Formatea la hora desde un string datetime tipo "2026-05-25T10:30"
 * Extrae directamente la parte HH:MM para evitar conversión UTC.
 * Retorna formato 12h: "10:30 AM"
 */
export function fmtTime(val) {
  if (!val) return '—'
  const timePart = String(val).split('T')[1]
  if (!timePart) return '—'
  const [h, m] = timePart.slice(0, 5).split(':').map(Number)
  if (isNaN(h) || isNaN(m)) return '—'
  const ampm = h < 12 ? 'AM' : 'PM'
  const h12  = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}
