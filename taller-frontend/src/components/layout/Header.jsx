import { LogOut, Menu } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import toast from 'react-hot-toast'

/* ── Mapa de rutas → títulos ───────────────────────────────── */
const PAGE_TITLES = {
  '/':             'Dashboard',
  '/work-orders':  'Órdenes de Trabajo',
  '/customers':    'Clientes',
  '/vehicles':     'Vehículos',
  '/employees':    'Empleados',
  '/services':     'Servicios',
  '/inventory':    'Inventario',
  '/suppliers':    'Proveedores',
  '/invoices':     'Facturación',
  '/payments':     'Pagos',
  '/calendar':     'Calendario',
  '/appointments': 'Citas',
  '/settings':     'Configuración',
  '/activity-log': 'Auditoría',
}

function getTitle(pathname) {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]
  const base = '/' + pathname.split('/')[1]
  return PAGE_TITLES[base] ?? 'Taller Hermanos Juarez'
}

/* ── Header ────────────────────────────────────────────────── */
export default function Header({ onMenuClick }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
    toast.success('Sesión cerrada')
  }

  return (
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

        {/* Nombre de usuario → perfil */}
        <Link
          to="/settings"
          className="hidden sm:flex items-center px-3 py-1.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          title="Ver perfil"
        >
          {user?.name}
        </Link>

        {/* Separador */}
        <div className="w-px h-5 bg-gray-200 hidden sm:block mx-1" />

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
  )
}
