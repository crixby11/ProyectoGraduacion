/**
 * Utilidades de validación y formato para Honduras
 */

/** Teléfono válido: 8 dígitos, con o sin prefijo +504 */
export function isValidPhone(v) {
  if (!v || !v.trim()) return true
  const d = v.replace(/\D/g, '')
  return d.length === 8 || (d.length === 11 && d.startsWith('504'))
}

/** Cédula válida: XXXX-XXXX-XXXXX */
export function isValidCedula(v) {
  if (!v || !v.trim()) return true
  return /^\d{4}-\d{4}-\d{5}$/.test(v.trim())
}

/** Formatea automáticamente: 88001234 → 8800-1234 */
export function fmtPhone(raw) {
  const d = (raw || '').replace(/\D/g, '').slice(0, 8)
  return d.length > 4 ? `${d.slice(0, 4)}-${d.slice(4)}` : d
}

/** Formatea automáticamente: 08011990 → 0801-1990-XXXXX */
export function fmtCedula(raw) {
  const d = (raw || '').replace(/\D/g, '').slice(0, 13)
  if (d.length > 8) return `${d.slice(0, 4)}-${d.slice(4, 8)}-${d.slice(8)}`
  if (d.length > 4) return `${d.slice(0, 4)}-${d.slice(4)}`
  return d
}
