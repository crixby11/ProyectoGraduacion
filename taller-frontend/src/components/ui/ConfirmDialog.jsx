import Modal from './Modal'
import { AlertTriangle } from 'lucide-react'

export default function ConfirmDialog({
  open, onClose, onConfirm,
  title = '¿Confirmar?', message, loading,
  confirmText = 'Eliminar', loadingText = 'Procesando...',
  confirmClass = 'btn-danger',
}) {
  return (
    <Modal open={open} onClose={onClose} title=" " size="sm">
      <div className="text-center py-2">
        <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
          <AlertTriangle size={24} className="text-red-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        {message && <p className="text-sm text-gray-500 mb-6">{message}</p>}
        <div className="flex gap-3 justify-center">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button onClick={onConfirm} disabled={loading} className={confirmClass}>
            {loading ? loadingText : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  )
}
