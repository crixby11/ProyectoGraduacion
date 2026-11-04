import { useState, useRef, useEffect } from 'react'
import { FileText, FileSpreadsheet, ChevronDown, Loader2, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from './Modal'
import { saveBlob, todayStamp } from '../../utils/download'

const FORMATS = {
  pdf: { label: 'PDF', icon: FileText, mime: 'application/pdf' },
  csv: { label: 'Excel (CSV)', icon: FileSpreadsheet, mime: 'text/csv;charset=utf-8' },
}

// Parser CSV mínimo: comas, comillas dobles y saltos de línea dentro de comillas.
function parseCsv(text) {
  const rows = []
  let row = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++ }
      else if (c === '"') quoted = false
      else cell += c
    } else if (c === '"') quoted = true
    else if (c === ',') { row.push(cell); cell = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(cell); rows.push(row); row = []; cell = ''
    } else cell += c
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row) }
  return rows
}

// Agrupa las filas en secciones separadas por líneas vacías.
// La primera fila de cada sección es su título.
function toSections(rows) {
  const sections = []
  let current = []
  for (const r of rows) {
    const empty = r.every((c) => c.trim() === '')
    if (empty) { if (current.length) sections.push(current); current = [] }
    else current.push(r)
  }
  if (current.length) sections.push(current)
  return sections.map(([title, ...body]) => {
    const keyValue = body.every((r) => r.length <= 2)
    return keyValue
      ? { title: title[0], keyValue: true, rows: body }
      : { title: title[0], keyValue: false, header: body[0] ?? [], rows: body.slice(1) }
  })
}

function CsvPreview({ sections }) {
  return (
    <div className="space-y-6">
      {sections.map((s, i) => (
        <section key={i}>
          <h3 className="text-sm font-semibold text-gray-800 mb-2">{s.title}</h3>
          {s.keyValue ? (
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
              {s.rows.map((r, j) => (
                <div key={j} className="contents">
                  <dt className="text-gray-500">{r[0]}</dt>
                  <dd className="text-gray-800 font-medium">{r[1]}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <div className="overflow-x-auto border border-gray-100 rounded-xl">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    {s.header.map((h, j) => (
                      <th key={j} className="text-left font-semibold text-gray-500 px-3 py-2 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {s.rows.length === 0 ? (
                    <tr><td colSpan={s.header.length || 1} className="px-3 py-3 text-gray-400 text-center">Sin registros</td></tr>
                  ) : s.rows.map((r, j) => (
                    <tr key={j} className="border-t border-gray-100">
                      {s.header.map((_, k) => (
                        <td key={k} className="px-3 py-1.5 text-gray-700 whitespace-nowrap">{r[k]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}
    </div>
  )
}

// Botón "Generar reporte": genera el archivo, lo muestra en una vista previa
// y deja descargarlo como opción.
// onFetch(format) debe devolver el Blob del reporte; format = 'pdf' | 'csv'.
// fileBase es el nombre del archivo sin fecha ni extensión.
export default function ReportMenu({ onFetch, fileBase = 'reporte', title = 'Vista previa del reporte' }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(null)
  const [preview, setPreview] = useState(null) // { format, blob, url?, sections? }
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Libera la URL temporal del PDF al cerrar o cambiar la vista previa.
  useEffect(() => () => { if (preview?.url) URL.revokeObjectURL(preview.url) }, [preview])

  const run = async (format) => {
    setBusy(format)
    try {
      const raw = await onFetch(format)
      const blob = new Blob([raw], { type: FORMATS[format].mime })
      if (format === 'pdf') {
        setPreview({ format, blob, url: URL.createObjectURL(blob) })
      } else {
        let text = await blob.text()
        if (text.charCodeAt(0) === 0xfeff) text = text.slice(1) // quita el BOM
        setPreview({ format, blob, sections: toSections(parseCsv(text)) })
      }
      setOpen(false)
    } catch {
      toast.error('No se pudo generar el reporte')
    } finally {
      setBusy(null)
    }
  }

  const download = () => {
    saveBlob(preview.blob, `${fileBase}-${todayStamp()}.${preview.format}`)
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} disabled={!!busy} className="btn-secondary">
        {busy ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />}
        Generar reporte <ChevronDown size={14} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 py-1 min-w-52">
          {Object.entries(FORMATS).map(([format, { label, icon: Icon }]) => (
            <button
              key={format}
              onClick={() => run(format)}
              disabled={!!busy}
              className="w-full flex items-center gap-2 text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <Icon size={15} className="text-gray-400" /> {label}
            </button>
          ))}
        </div>
      )}

      <Modal
        open={!!preview}
        onClose={() => setPreview(null)}
        title={preview ? `${title} · ${FORMATS[preview.format].label}` : ''}
        size="xl"
      >
        {preview && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button onClick={() => setPreview(null)} className="btn-secondary">Cerrar</button>
              <button onClick={download} className="btn-primary">
                <Download size={15} /> Descargar {FORMATS[preview.format].label}
              </button>
            </div>
            {preview.format === 'pdf' ? (
              <iframe
                src={preview.url}
                title="Vista previa del PDF"
                className="w-full h-[70vh] rounded-xl border border-gray-100"
              />
            ) : (
              <CsvPreview sections={preview.sections} />
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
