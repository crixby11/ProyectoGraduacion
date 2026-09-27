import { useState, useRef, useEffect } from 'react'
import { FileText, FileSpreadsheet, ChevronDown, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

// Botón "Generar reporte" con las opciones PDF y Excel (CSV).
// onGenerate(format) debe descargar el archivo; format = 'pdf' | 'csv'.
export default function ReportMenu({ onGenerate }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(null)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const run = async (format) => {
    setBusy(format)
    try {
      await onGenerate(format)
      setOpen(false)
    } catch {
      toast.error('No se pudo generar el reporte')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} disabled={!!busy} className="btn-secondary">
        {busy ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />}
        Generar reporte <ChevronDown size={14} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 py-1 min-w-52">
          <button onClick={() => run('pdf')} disabled={!!busy} className="w-full flex items-center gap-2 text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            <FileText size={15} className="text-gray-400" /> Descargar PDF
          </button>
          <button onClick={() => run('csv')} disabled={!!busy} className="w-full flex items-center gap-2 text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            <FileSpreadsheet size={15} className="text-gray-400" /> Descargar Excel (CSV)
          </button>
        </div>
      )}
    </div>
  )
}
