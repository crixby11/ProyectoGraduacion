import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Mail, Lock, ArrowRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import logo from '../assets/logo.jpeg'
import toast from 'react-hot-toast'

const schema = z.object({
  email: z.string().email('Correo inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
})

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [showPwd, setShowPwd] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data) => {
    try {
      await login(data)
      navigate('/')
      toast.success('Bienvenido al sistema')
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Credenciales incorrectas')
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* ── Panel izquierdo (branding) ── */}
      <div className="hidden lg:flex lg:w-[52%] bg-[#0f1e3d] flex-col items-center justify-center p-14">

        {/* Logo */}
        <div className="w-40 h-40 rounded-3xl bg-white shadow-2xl shadow-black/40 p-4 mb-8">
          <img src={logo} alt="Taller Hermanos Juarez" className="w-full h-full object-contain" />
        </div>

        <h1 className="text-3xl font-bold text-white tracking-tight mb-2">
          Taller Hermanos Juarez
        </h1>
        <p className="text-white/40 text-[15px]">Sistema de Gestión Automotriz</p>

        {/* Footer del panel */}
        <p className="absolute bottom-6 text-white/20 text-xs">
          © {new Date().getFullYear()} Taller Hermanos Juarez · Honduras
        </p>
      </div>

      {/* ── Panel derecho (formulario) ── */}
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 p-6">

        {/* Logo en móvil */}
        <div className="lg:hidden text-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-white shadow-md border border-gray-100 p-2 mx-auto mb-4">
            <img src={logo} alt="Taller Hermanos Juarez" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Taller Hermanos Juarez</h1>
          <p className="text-gray-400 text-sm mt-0.5">Sistema de Gestión</p>
        </div>

        <div className="w-full max-w-sm">

          {/* Encabezado del form */}
          <div className="mb-8">
            <h2 className="text-[26px] font-bold text-gray-900 tracking-tight">Bienvenido</h2>
            <p className="text-gray-500 text-sm mt-1.5">Inicia sesión con tu cuenta para continuar</p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-3xl shadow-lg shadow-gray-200/60 border border-gray-100 p-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>

              {/* Email */}
              <div>
                <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail
                    size={16}
                    className={`absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${errors.email ? 'text-red-400' : 'text-gray-400'}`}
                  />
                  <input
                    {...register('email')}
                    type="email"
                    autoComplete="email"
                    placeholder="usuario@taller.com"
                    className={`
                      w-full pl-10 pr-3.5 py-2.5 rounded-xl text-sm text-gray-800 placeholder:text-gray-300
                      bg-gray-50/50 border transition-all duration-150 outline-none
                      ${errors.email
                        ? 'border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-100'
                        : 'border-gray-200 hover:border-gray-300 focus:border-primary-500 focus:bg-white focus:ring-4 focus:ring-primary-100'
                      }
                    `}
                  />
                </div>
                {errors.email && (
                  <p className="mt-1.5 text-xs text-red-500">{errors.email.message}</p>
                )}
              </div>

              {/* Contraseña */}
              <div>
                <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock
                    size={16}
                    className={`absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${errors.password ? 'text-red-400' : 'text-gray-400'}`}
                  />
                  <input
                    {...register('password')}
                    type={showPwd ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className={`
                      w-full pl-10 pr-11 py-2.5 rounded-xl text-sm text-gray-800 placeholder:text-gray-300
                      bg-gray-50/50 border transition-all duration-150 outline-none
                      ${errors.password
                        ? 'border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-100'
                        : 'border-gray-200 hover:border-gray-300 focus:border-primary-500 focus:bg-white focus:ring-4 focus:ring-primary-100'
                      }
                    `}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(v => !v)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1.5 text-xs text-red-500">{errors.password.message}</p>
                )}
              </div>

              {/* Botón */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="
                  group w-full flex items-center justify-center gap-2 py-3 mt-2 rounded-xl
                  bg-[#0f1e3d] text-white text-sm font-semibold
                  shadow-lg shadow-[#0f1e3d]/25
                  hover:bg-[#162952] hover:shadow-xl hover:shadow-[#0f1e3d]/30
                  active:scale-[0.99] transition-all duration-150
                  disabled:opacity-60 disabled:pointer-events-none
                "
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Ingresando...
                  </>
                ) : (
                  <>
                    Ingresar
                    <ArrowRight size={16} className="transition-transform duration-150 group-hover:translate-x-0.5" />
                  </>
                )}
              </button>

            </form>
          </div>

          <p className="text-center text-gray-400 text-xs mt-6">
            Solo administradores autorizados · v1.0.0
          </p>
        </div>
      </div>

    </div>
  )
}
