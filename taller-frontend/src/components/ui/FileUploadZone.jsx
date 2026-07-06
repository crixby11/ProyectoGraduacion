import { useRef, useState } from 'react'
import { Upload, X } from 'lucide-react'

const ACCEPT = '.jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv'
const MAX_MB = 10

export default function FileUploadZone({ onSelect, disabled }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [pending, setPending] = useState(null)

  const validate = (file) => {
    if (file.size > MAX_MB * 1024 * 1024) {
      return `El archivo supera los ${MAX_MB} MB`
    }
    return null
  }

  const pick = (file) => {
    if (!file) return
    const err = validate(file)
    if (err) { alert(err); return }
    setPending(file)
    onSelect(file)
  }

  const clear = () => {
    setPending(null)
    if (inputRef.current) inputRef.current.value = ''
    onSelect(null)
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    if (disabled) return
    const file = e.dataTransfer.files[0]
    pick(file)
  }

  if (pending) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-primary-200 bg-primary-50 text-sm">
        <Upload size={16} className="text-primary-500 shrink-0" />
        <span className="flex-1 truncate text-primary-800 font-medium">{pending.name}</span>
        <span className="text-primary-500 shrink-0">{(pending.size / 1024).toFixed(0)} KB</span>
        {!disabled && (
          <button type="button" onClick={clear} className="text-primary-400 hover:text-red-500">
            <X size={15} />
          </button>
        )}
      </div>
    )
  }

  return (
    <div
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={`
        flex flex-col items-center justify-center gap-2 px-4 py-6 rounded-xl border-2 border-dashed
        cursor-pointer transition-colors text-center
        ${dragging ? 'border-primary-400 bg-primary-50' : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <Upload size={22} className={dragging ? 'text-primary-500' : 'text-gray-400'} />
      <p className="text-sm text-gray-500">
        <span className="font-medium text-primary-600">Haz clic</span> o arrastra un archivo aquí
      </p>
      <p className="text-xs text-gray-400">PDF, imágenes, Word, Excel · máx. {MAX_MB} MB</p>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => pick(e.target.files[0])}
      />
    </div>
  )
}
