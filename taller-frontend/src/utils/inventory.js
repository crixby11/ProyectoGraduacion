// Presentaciones en que se compra un repuesto. El stock siempre se cuenta en
// unidades sueltas; 'fixed' es la cantidad que trae la presentación, y las de
// 'variable' (caja, ristra) se configuran por repuesto.
export const UNIT_OPTIONS = [
  { value: 'unidad', label: 'Unidad', fixed: 1 },
  { value: 'par', label: 'Par (2)', fixed: 2 },
  { value: 'docena', label: 'Docena (12)', fixed: 12 },
  { value: 'caja', label: 'Caja', variable: true },
  { value: 'ristra', label: 'Ristra', variable: true },
  { value: 'litro', label: 'Litro', fixed: 1 },
  { value: 'galon', label: 'Galón', fixed: 1 },
]

const NAMES = { unidad: 'Unidad', par: 'Par', docena: 'Docena', caja: 'Caja', ristra: 'Ristra', litro: 'Litro', galon: 'Galón' }

export const isVariablePack = (unit) => UNIT_OPTIONS.find((o) => o.value === unit)?.variable === true

// Unidades sueltas que trae una presentación (fijas se ignoran si no vienen del usuario).
export function packSize(unit, perPack) {
  const opt = UNIT_OPTIONS.find((o) => o.value === unit)
  if (opt?.fixed) return opt.fixed
  if (opt?.variable) return Math.max(1, Number(perPack) || 1)
  return 1
}

// "Caja (24)", "Docena (12)", "Unidad".
export function packLabel(unit, perPack) {
  const name = NAMES[unit] ?? unit ?? 'Unidad'
  const n = packSize(unit, perPack)
  return n > 1 ? `${name} (${n})` : name
}

// Unidad en que se expresa el stock: empaques se cuentan en unidades sueltas,
// litro/galón/unidad se cuentan en sí mismos. Dato viejo de texto libre se muestra tal cual.
export function stockUnitLabel(unit) {
  return ['par', 'docena', 'caja', 'ristra'].includes(unit) ? 'unidades' : (unit ?? 'unidad')
}
