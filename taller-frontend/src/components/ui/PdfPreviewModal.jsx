import { useRef } from 'react'
import { Download, Printer, Loader2 } from 'lucide-react'
import Modal from './Modal'
import { saveBlob } from '../../utils/download'

/** Vista previa de un PDF con opciones de imprimir y descargar. Se usa con usePdfPreview. */
export default function PdfPreviewModal({ preview, onClose }) {
  const frame = useRef(null)

  const print = () => {
    try {
      frame.current.contentWindow.focus()
      frame.current.contentWindow.print()
    } catch {
      // Algunos navegadores no permiten imprimir el visor embebido: se abre en otra pestaña.
      window.open(preview.url, '_blank')
    }
  }

  return (
    <Modal open={!!preview} onClose={onClose} title={preview?.title ?? ''} size="lg">
      {preview?.loading ? (
        <div className="flex flex-col items-center justify-center gap-2 py-24 text-sm text-gray-400">
          <Loader2 size={22} className="animate-spin" /> Generando documento...
        </div>
      ) : preview?.url && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button onClick={onClose} className="btn-secondary">Cerrar</button>
            <button onClick={print} className="btn-secondary">
              <Printer size={15} /> Imprimir
            </button>
            <button onClick={() => saveBlob(preview.blob, preview.filename)} className="btn-primary">
              <Download size={15} /> Descargar
            </button>
          </div>
          <iframe
            ref={frame}
            src={preview.url}
            title={preview.title}
            className="w-full h-[72vh] rounded-xl border border-gray-100 bg-gray-50"
          />
        </div>
      )}
    </Modal>
  )
}
