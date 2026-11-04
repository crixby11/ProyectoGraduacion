import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

/**
 * Estado de la vista previa de un PDF generado por la API.
 * open({ title, filename, fetch }) llama a fetch() (debe devolver la respuesta
 * de axios con responseType 'blob') y muestra el resultado en PdfPreviewModal.
 */
export function usePdfPreview() {
  const [preview, setPreview] = useState(null) // { title, filename, loading?, blob?, url? }

  // Libera la URL temporal al cerrar o al abrir otro documento.
  useEffect(() => () => { if (preview?.url) URL.revokeObjectURL(preview.url) }, [preview])

  const open = async ({ title, filename, fetch }) => {
    setPreview({ title, filename, loading: true })
    try {
      const res = await fetch()
      const blob = new Blob([res.data], { type: 'application/pdf' })
      setPreview({ title, filename, blob, url: URL.createObjectURL(blob) })
    } catch {
      toast.error('No se pudo generar el PDF')
      setPreview(null)
    }
  }

  return { preview, open, close: () => setPreview(null) }
}
