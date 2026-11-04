/** Filtro inicial de los reportes. */
export const DEFAULT_RANGE = { preset: 'this_month', from: '', to: '', group: '' }

/** Convierte el filtro en los parámetros que espera la API. */
export function rangeParams({ preset, from, to, group }) {
  const params = { preset }
  if (preset === 'custom') Object.assign(params, { from, to })
  if (group) params.group = group
  return params
}
