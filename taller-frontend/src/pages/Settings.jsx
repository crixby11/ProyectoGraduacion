import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import {
  Save, Building2, UserCircle, KeyRound, Eye, EyeOff,
  FolderOpen, Plus, Trash2, Download,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { getSettings, updateSettings } from '../api/settings'
import { changePassword } from '../api/auth'
import { getGeneralFiles, uploadGeneralFile, deleteGeneralFile } from '../api/generalFiles'
import { useAuth } from '../context/AuthContext'
import { fmtDate, fmtFileSize } from '../utils/date'
import PageHeader from '../components/ui/PageHeader'
import Modal from '../components/ui/Modal'
import FileUploadZone from '../components/ui/FileUploadZone'
import FileTypeIcon from '../components/ui/FileTypeIcon'

const pwdSchema = z.object({
  current_password:      z.string().min(1, 'Requerido'),
  new_password:          z.string().min(8, 'Mínimo 8 caracteres'),
  new_password_confirmation: z.string().min(1, 'Requerido'),
}).refine((d) => d.new_password === d.new_password_confirmation, {
  message: 'Las contraseñas no coinciden',
  path: ['new_password_confirmation'],
})

export default function Settings() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [fileOpen, setFileOpen] = useState(false)
  const [pendingFile, setPendingFile] = useState(null)
  const [fileDescription, setFileDescription] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => getSettings().then((r) => r.data),
  })

  const { data: files = [], isLoading: filesLoading } = useQuery({
    queryKey: ['general-files'],
    queryFn: () => getGeneralFiles().then((r) => r.data),
  })

  const { register, handleSubmit, reset, formState: { isDirty } } = useForm()

  useEffect(() => {
    if (data) reset(data)
  }, [data, reset])

  const save = useMutation({
    mutationFn: (d) => updateSettings(d),
    onSuccess: (res) => {
      qc.setQueryData(['settings'], res.data)
      reset(res.data)
      toast.success('Configuración guardada')
    },
    onError: (e) => toast.error(e.response?.data?.message ?? 'Error'),
  })

  const {
    register: regPwd, handleSubmit: handlePwd, reset: resetPwd,
    formState: { errors: pwdErrors },
  } = useForm({ resolver: zodResolver(pwdSchema) })

  const changePwd = useMutation({
    mutationFn: changePassword,
    onSuccess: async () => {
      toast.success('Contraseña actualizada. Inicia sesión nuevamente.')
      resetPwd()
      await logout()
      navigate('/login')
    },
    onError: (e) => toast.error(e.response?.data?.message ?? 'Error al cambiar contraseña'),
  })

  const uploadFile = useMutation({
    mutationFn: () => {
      const fd = new FormData()
      fd.append('file', pendingFile)
      if (fileDescription.trim()) fd.append('description', fileDescription.trim())
      return uploadGeneralFile(fd)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['general-files'] })
      toast.success('Archivo subido')
      setFileOpen(false)
      setPendingFile(null)
      setFileDescription('')
    },
    onError: (e) => toast.error(e.response?.data?.message ?? 'Error al subir archivo'),
  })

  const removeFile = useMutation({
    mutationFn: (fileId) => deleteGeneralFile(fileId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['general-files'] })
      toast.success('Archivo eliminado')
    },
    onError: () => toast.error('No se pudo eliminar el archivo'),
  })

  const initials = user?.name
    ? user.name.trim().split(/\s+/).slice(0, 2).map((n) => n[0]).join('').toUpperCase()
    : '?'

  if (isLoading) return <div className="flex items-center justify-center py-24 text-gray-400">Cargando...</div>

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuración"
        icon={UserCircle}
        subtitle="Tu cuenta, seguridad, datos del taller y archivos"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* ── Columna izquierda: cuenta + seguridad ────────────── */}
        <div className="space-y-6">

          {/* Mi cuenta */}
          <div className="card p-6 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#0f1e3d] flex items-center justify-center text-lg font-bold text-white shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 truncate">{user?.name}</p>
              <p className="text-sm text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>

          {/* Seguridad */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <KeyRound size={18} className="text-primary-600" />
              <h2 className="font-semibold text-gray-800">Seguridad</h2>
            </div>

            <form onSubmit={handlePwd((d) => changePwd.mutate(d))} className="space-y-4">
              <div>
                <label className="label">Contraseña actual</label>
                <div className="relative">
                  <input
                    {...regPwd('current_password')}
                    type={showCurrent ? 'text' : 'password'}
                    className="input pr-10"
                    autoComplete="current-password"
                  />
                  <button type="button" onClick={() => setShowCurrent((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {pwdErrors.current_password && <p className="mt-1 text-xs text-red-500">{pwdErrors.current_password.message}</p>}
              </div>

              <div>
                <label className="label">Nueva contraseña</label>
                <div className="relative">
                  <input
                    {...regPwd('new_password')}
                    type={showNew ? 'text' : 'password'}
                    className="input pr-10"
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowNew((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {pwdErrors.new_password && <p className="mt-1 text-xs text-red-500">{pwdErrors.new_password.message}</p>}
              </div>

              <div>
                <label className="label">Confirmar nueva</label>
                <div className="relative">
                  <input
                    {...regPwd('new_password_confirmation')}
                    type={showConfirm ? 'text' : 'password'}
                    className="input pr-10"
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {pwdErrors.new_password_confirmation && <p className="mt-1 text-xs text-red-500">{pwdErrors.new_password_confirmation.message}</p>}
              </div>

              <p className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3">
                Mínimo 8 caracteres. Al cambiar la contraseña se cerrará la sesión en todos los dispositivos.
              </p>

              <div className="flex justify-end">
                <button type="submit" disabled={changePwd.isPending} className="btn-primary">
                  {changePwd.isPending ? 'Guardando...' : 'Cambiar contraseña'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* ── Columna derecha: negocio + archivos ──────────────── */}
        <div className="lg:col-span-2 space-y-6">

          <form onSubmit={handleSubmit((d) => save.mutate(d))} className="space-y-6">
            <div className="card p-6 space-y-5">
              <div className="flex items-center gap-2 mb-1">
                <Building2 size={18} className="text-primary-600" />
                <h2 className="font-semibold text-gray-800">Datos del negocio</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="label">Nombre del taller *</label>
                  <input {...register('shop_name')} className="input" placeholder="Taller Mecánico" />
                </div>

                <div className="sm:col-span-2">
                  <label className="label">Dirección</label>
                  <input {...register('shop_address')} className="input" placeholder="Col. Alameda, calle principal..." />
                </div>

                <div>
                  <label className="label">Ciudad</label>
                  <input {...register('shop_city')} className="input" placeholder="Tegucigalpa" />
                </div>

                <div>
                  <label className="label">Teléfono</label>
                  <input {...register('shop_phone')} className="input" placeholder="+504 0000-0000" />
                </div>

                <div>
                  <label className="label">Email</label>
                  <input {...register('shop_email')} type="email" className="input" placeholder="info@taller.com" />
                </div>

                <div>
                  <label className="label">RTN</label>
                  <input {...register('shop_rtn')} className="input" placeholder="0000-0000-000000" />
                </div>
              </div>
            </div>

            <div className="card p-6 space-y-4">
              <h2 className="font-semibold text-gray-800">Documentos</h2>
              <div>
                <label className="label">Mensaje al pie de facturas</label>
                <textarea
                  {...register('invoice_notes')}
                  rows={3}
                  className="input"
                  placeholder="Gracias por su preferencia. Garantía de 30 días en mano de obra..."
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={save.isPending || !isDirty}
                className="btn-primary"
              >
                <Save size={16} />
                {save.isPending ? 'Guardando...' : 'Guardar configuración'}
              </button>
            </div>
          </form>

          {/* Archivos generales */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FolderOpen size={18} className="text-primary-600" />
                <h2 className="font-semibold text-gray-800">Archivos generales ({files.length})</h2>
              </div>
              <button onClick={() => { setPendingFile(null); setFileDescription(''); setFileOpen(true) }} className="btn-secondary text-xs py-1.5">
                <Plus size={14} /> Subir archivo
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-4">Documentos del taller que no pertenecen a un cliente, vehículo o empleado en particular: permisos, contratos, pólizas, manuales...</p>

            {filesLoading ? (
              <p className="text-sm text-gray-400 py-4 text-center">Cargando...</p>
            ) : !files.length ? (
              <p className="text-sm text-gray-400 py-4 text-center">Sin archivos subidos</p>
            ) : (
              <ul className="space-y-2">
                {files.map((f) => (
                  <li key={f.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors group">
                    <FileTypeIcon mime={f.mime_type} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{f.original_name}</p>
                      <p className="text-xs text-gray-400">
                        {fmtFileSize(f.size)}
                        {f.description && <span className="ml-2 text-gray-500">· {f.description}</span>}
                        <span className="ml-2">· {fmtDate(f.created_at?.slice(0, 10))}</span>
                        {f.user?.name && <span className="ml-2">· subido por {f.user.name}</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a
                        href={f.url}
                        download={f.original_name}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-ghost p-1.5 text-gray-500 hover:text-primary-600"
                        title="Descargar"
                      >
                        <Download size={15} />
                      </a>
                      <button
                        onClick={() => { if (confirm('¿Eliminar este archivo?')) removeFile.mutate(f.id) }}
                        className="btn-ghost p-1.5 text-gray-400 hover:text-red-500"
                        title="Eliminar"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Modal subir archivo */}
      <Modal open={fileOpen} onClose={() => setFileOpen(false)} title="Subir archivo">
        <div className="space-y-4">
          <FileUploadZone onSelect={setPendingFile} disabled={uploadFile.isPending} />
          <div>
            <label className="label">Descripción (opcional)</label>
            <input
              value={fileDescription}
              onChange={(e) => setFileDescription(e.target.value)}
              className="input"
              placeholder="Permiso municipal, póliza de seguro..."
              maxLength={255}
            />
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={() => setFileOpen(false)} className="btn-secondary">Cancelar</button>
            <button
              onClick={() => uploadFile.mutate()}
              disabled={!pendingFile || uploadFile.isPending}
              className="btn-primary"
            >
              {uploadFile.isPending ? 'Subiendo...' : 'Subir archivo'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
