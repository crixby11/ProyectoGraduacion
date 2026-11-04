import { useState } from 'react'
import { CalendarRange } from 'lucide-react'

const PRESETS = [
  { value: 'today',        label: 'Hoy' },
  { value: 'yesterday',    label: 'Ayer' },
  { value: 'this_week',    label: 'Esta semana' },
  { value: 'last_week',    label: 'Semana pasada' },
  { value: 'this_month',   label: 'Este mes' },
  { value: 'last_month',   label: 'Mes pasado' },
  { value: 'last_30',      label: 'Últimos 30 días' },
  { value: 'this_quarter', label: 'Este trimestre' },
  { value: 'this_year',    label: 'Este año' },
  { value: 'last_year',    label: 'Año pasado' },
  { value: 'custom',       label: 'Personalizado' },
]

const GROUPS = [
  { value: '',      label: 'Automático' },
  { value: 'day',   label: 'Por día' },
  { value: 'week',  label: 'Por semana' },
  { value: 'month', label: 'Por mes' },
]

const today = () => new Date().toLocaleDateString('en-CA') // YYYY-MM-DD en hora local

/**
 * Selector de período para reportes: atajos (hoy, semana, mes...), rango
 * personalizado y cómo agrupar la gráfica. `info` es el rango que devolvió la API.
 */
export default function RangeFilter({ value, onChange, info }) {
  const [draft, setDraft] = useState({ from: value.from || today(), to: value.to || today() })
  const [showCustom, setShowCustom] = useState(value.preset === 'custom')

  const pick = (preset) => {
    if (preset === 'custom') { setShowCustom(true); return }
    setShowCustom(false)
    onChange({ ...value, preset })
  }

  const applyCustom = (e) => {
    e.preventDefault()
    if (!draft.from || !draft.to || draft.from > draft.to) return
    onChange({ ...value, preset: 'custom', from: draft.from, to: draft.to })
  }

  const invalid = draft.from && draft.to && draft.from > draft.to

  return (
    <div className="card p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {PRESETS.map((p) => {
          const active = p.value === 'custom' ? showCustom : (!showCustom && value.preset === p.value)
          return (
            <button
              key={p.value}
              onClick={() => pick(p.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                active
                  ? 'bg-[#0f1e3d] text-white border-[#0f1e3d]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:text-gray-800'
              }`}
            >
              {p.label}
            </button>
          )
        })}
        <select
          value={value.group}
          onChange={(e) => onChange({ ...value, group: e.target.value })}
          className="input !w-auto !py-1.5 text-xs ml-auto"
          title="Cómo agrupar la gráfica"
        >
          {GROUPS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
        </select>
      </div>

      {showCustom && (
        <form onSubmit={applyCustom} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="label">Desde</label>
            <input type="date" className="input" value={draft.from} max={draft.to || undefined}
              onChange={(e) => setDraft({ ...draft, from: e.target.value })} />
          </div>
          <div>
            <label className="label">Hasta</label>
            <input type="date" className="input" value={draft.to} min={draft.from || undefined}
              onChange={(e) => setDraft({ ...draft, to: e.target.value })} />
          </div>
          <button type="submit" className="btn-primary" disabled={!draft.from || !draft.to || invalid}>
            Aplicar
          </button>
          {invalid && <p className="text-xs text-red-500">La fecha inicial no puede ser mayor que la final.</p>}
        </form>
      )}

      {info && (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
          <CalendarRange size={14} className="text-gray-400" />
          <span className="font-semibold text-gray-700">{info.label}:</span>
          <span>{info.text}</span>
          {info.prev_text && <span className="text-gray-400">· se compara con {info.prev_text}</span>}
        </p>
      )}
    </div>
  )
}
