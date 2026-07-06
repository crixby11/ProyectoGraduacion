import { useState } from 'react'
import { Menu, LogOut, KeyRound, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { changePassword } from '../../api/auth'
import Modal from '../ui/Modal'

/* ── Mapa de rutas → títulos ───────────────────────────────── */
const PAGE_TITLES = {
  '/':             'Dashboard',
  '/work-orders':  'Órdenes de Trabajo',
  '/customers':    'Clientes',
  '/vehicles':     'Vehículos',
  '/employees':    'Empleados',
  '/services':     'Servicios',
  '/inventory':    'Inventario',
  '/invoices':     'Facturación',
  '/payments':     'Pagos',
  '/calendar':     'Calendario',
  '/appointments': 'Citas',
  '/settings':     'Configuración',
}

function getTitle(pathname) {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]
  const base = '/' + pathname.split('/')[1]
  return PAGE_TITLES[base] ?? 'Taller Hermanos Juarez'
}

const pwdSchema = z.object({
  current_password:      z.string().min(1, 'Requerido'),
  new_password:          z.string().min(8, 'Mínimo 8 caracteres'),
  new_password_confirmation: z.string().min(1, 'Requerido'),
}).refine((d) => d.new_password === d.new_password_confirmation, {
  message: 'Las contraseñas no coinciden',
  path: ['new_password_confirmation'],
})

/* ── Header ────────────────────────────────────────────────── */
export default function Header({ onMenuClick }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [pwdModal, setPwdModal] = useState(false)
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(pwdSchema),
  })

  const changePwd = useMutation({
    mutationFn: changePassword,
    onSuccess: async () => {
      toast.success('Contraseña actualizada. Inicia sesión nuevamente.')
      setPwdModal(false)
      reset()
      await logout()
      navigate('/login')
    },
    onError: (e) => toast.error(e.response?.data?.message ?? 'Error al cambiar contraseña'),
  })

  const handleLogout = async () => {
    await logout()
    navigate('/login')
    toast.success('Sesión cerrada')
  }

  const closePwdModal = () => { setPwdModal(false); reset() }

  const initials = user?.name
    ? user.name.trim().split(/\s+/).slice(0, 2).map(n => n[0]).join('').toUpperCase()
    : '?'

  return (
    <>
      <header className="bg-white border-b border-gray-100 px-5 h-14 flex items-center gap-4 shrink-0">

        {/* Botón menú móvil */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
        >
          <Menu size={20} />
        </button>

        {/* Título de página */}
        <h1 className="text-[15px] font-semibold text-gray-800 hidden sm:block">
          {getTitle(pathname)}
        </h1>

        <div className="flex-1" />

        {/* Usuario + acciones */}
        <div className="flex items-center gap-1">

          {/* Avatar + nombre */}
          <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-xl">
            <div className="w-7 h-7 rounded-full bg-primary-600 flex items-center justify-center text-[11px] font-bold text-white shrink-0">
              {initials}
            </div>
            <span className="text-sm font-medium text-gray-700 leading-none">
              {user?.name}
            </span>
          </div>

          {/* Separador */}
          <div className="w-px h-5 bg-gray-200 hidden sm:block mx-1" />

          {/* Cambiar contraseña */}
          <button
            onClick={() => setPwdModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700 rounded-xl transition-colors"
            title="Cambiar contraseña"
          >
            <KeyRound size={15} />
            <span className="hidden sm:block">Contraseña</span>
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors"
            title="Cerrar sesión"
          >
            <LogOut size={15} />
            <span className="hidden sm:block">Salir</span>
          </button>
        </div>
      </header>

      {/* Modal cambiar contraseña */}
      <Modal open={pwdModal} onClose={closePwdModal} title="Cambiar contraseña" size="sm">
        <form onSubmit={handleSubmit((d) => changePwd.mutate(d))} className="space-y-4">
          <div>
            <label className="label">Contraseña actual</label>
            <div className="relative">
              <input
                {...register('current_password')}
                type={showCurrent ? 'text' : 'password'}
                className="input pr-10"
                autoComplete="current-password"
              />
              <button type="button" onClick={() => setShowCurrent(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {errors.current_password && <p className="mt-1 text-xs text-red-500">{errors.current_password.message}</p>}
          </div>

          <div>
            <label className="label">Nueva contraseña <span className="text-gray-400 font-normal">(mínimo 8 caracteres)</span></label>
            <div className="relative">
              <input
                {...register('new_password')}
                type={showNew ? 'text' : 'password'}
                className="input pr-10"
                autoComplete="new-password"
              />
              <button type="button" onClick={() => setShowNew(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {errors.new_password && <p className="mt-1 text-xs text-red-500">{errors.new_password.message}</p>}
          </div>

          <div>
            <label className="label">Confirmar nueva contraseña</label>
            <div className="relative">
              <input
                {...register('new_password_confirmation')}
                type={showConfirm ? 'text' : 'password'}
                className="input pr-10"
                autoComplete="new-password"
              />
              <button type="button" onClick={() => setShowConfirm(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {errors.new_password_confirmation && <p className="mt-1 text-xs text-red-500">{errors.new_password_confirmation.message}</p>}
          </div>

          <p className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3">
            Al cambiar la contraseña se cerrará la sesión en todos los dispositivos.
          </p>

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={closePwdModal} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={changePwd.isPending} className="btn-primary">
              {changePwd.isPending ? 'Guardando...' : 'Cambiar contraseña'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
