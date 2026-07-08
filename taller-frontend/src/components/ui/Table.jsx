import { ChevronLeft, ChevronRight, InboxIcon } from 'lucide-react'

export function Table({ columns, data, loading, emptyMessage = 'Sin resultados', rowClassName }) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
        <svg className="animate-spin w-7 h-7 text-primary-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        <span className="text-sm">Cargando...</span>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-gray-100 bg-gray-50/70">
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                style={col.width ? { width: col.width } : {}}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-16 text-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                    <InboxIcon size={24} strokeWidth={1.5} className="text-gray-300" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-500">{emptyMessage}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Los registros aparecerán aquí cuando existan</p>
                  </div>
                </div>
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr
                key={row.id ?? i}
                className={`
                  hover:bg-primary-50/40 transition-colors duration-100
                  ${rowClassName ? rowClassName(row) : ''}
                `}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-gray-700 align-middle">
                    {col.render ? col.render(row) : (row[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

export function Pagination({ meta, onPageChange }) {
  if (!meta || meta.last_page <= 1) return null

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
      <p className="text-xs text-gray-500">
        Mostrando <span className="font-semibold text-gray-700">{meta.from}–{meta.to}</span> de{' '}
        <span className="font-semibold text-gray-700">{meta.total}</span> registros
      </p>
      <div className="flex items-center gap-1">
        <button
          disabled={meta.current_page === 1}
          onClick={() => onPageChange(meta.current_page - 1)}
          className="p-1.5 rounded-lg hover:bg-white hover:shadow-sm text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft size={16} />
        </button>
        {Array.from({ length: meta.last_page }, (_, i) => i + 1)
          .filter(p => Math.abs(p - meta.current_page) <= 2)
          .map((p) => (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${
                p === meta.current_page
                  ? 'bg-[#0f1e3d] text-white shadow-sm'
                  : 'text-gray-600 hover:bg-white hover:shadow-sm'
              }`}
            >
              {p}
            </button>
          ))}
        <button
          disabled={meta.current_page === meta.last_page}
          onClick={() => onPageChange(meta.current_page + 1)}
          className="p-1.5 rounded-lg hover:bg-white hover:shadow-sm text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
