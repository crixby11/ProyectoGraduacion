import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff } from 'lucide-react'
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
      <div className="w-full max-w-sm">

        {/* Logo + título */}
        <div className="flex flex-col items-center text-center mb-10">
          <img
            src={logo}
            alt="Taller Hermanos Juarez"
            className="w-24 h-24 rounded-2xl object-contain bg-white border border-gray-100 p-2 mb-4"
          />
          <h1 className="text-lg font-semibold text-gray-900">Taller Hermanos Juarez</h1>
          <p className="text-gray-400 text-sm mt-1">Inicia sesión para continuar</p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4 bg-white border border-gray-200 rounded-2xl p-6"
          noValidate
        >

          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Correo electrónico
            </label>
            <input
              {...register('email')}
              type="email"
              autoComplete="email"
              placeholder="usuario@taller.com"
              className={`
                w-full px-3.5 py-2.5 rounded-lg text-sm text-gray-900 placeholder:text-gray-300
                bg-white border transition-colors duration-150 outline-none
                ${errors.email
                  ? 'border-red-300 focus:border-red-400'
                  : 'border-gray-200 focus:border-gray-400'
                }
              `}
            />
            {errors.email && (
              <p className="mt-1.5 text-xs text-red-500">{errors.email.message}</p>
            )}
          </div>

          {/* Contraseña */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Contraseña
            </label>
            <div className="relative">
              <input
                {...register('password')}
                type={showPwd ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                className={`
                  w-full px-3.5 py-2.5 pr-11 rounded-lg text-sm text-gray-900 placeholder:text-gray-300
                  bg-white border transition-colors duration-150 outline-none
                  ${errors.password
                    ? 'border-red-300 focus:border-red-400'
                    : 'border-gray-200 focus:border-gray-400'
                  }
                `}
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-400 hover:text-gray-600 transition-colors"
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
              w-full flex items-center justify-center gap-2 py-2.5 mt-2 rounded-lg
              bg-gray-900 text-white text-sm font-medium
              hover:bg-gray-800 active:scale-[0.99] transition-all duration-150
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
              'Ingresar'
            )}
          </button>

        </form>

        <p className="text-center text-gray-300 text-xs mt-8">
          Solo administradores autorizados · v1.0.0
        </p>
      </div>
    </div>
  )
}
