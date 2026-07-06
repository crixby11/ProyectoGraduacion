import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, Car, Wrench, ClipboardList,
  Package, FileText, DollarSign, Calendar, CalendarCheck, Settings, Cog, X,
} from 'lucide-react'

const nav = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/work-orders', icon: ClipboardList, label: 'Órdenes de Trabajo' },
  { to: '/customers', icon: Users, label: 'Clientes' },
  { to: '/vehicles', icon: Car, label: 'Vehículos' },
  { to: '/employees', icon: Wrench, label: 'Empleados' },
  { to: '/services', icon: Settings, label: 'Servicios' },
  { to: '/inventory', icon: Package, label: 'Inventario' },
  { to: '/invoices', icon: FileText, label: 'Facturación' },
  { to: '/payments', icon: DollarSign, label: 'Pagos' },
  { to: '/appointments', icon: CalendarCheck, label: 'Citas' },
  { to: '/calendar', icon: Calendar, label: 'Calendario' },
  { to: '/settings', icon: Cog, label: 'Configuración' },
]

export default function Sidebar({ open, onClose }) {
  return (
    <>
      {/* Overlay mobile */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-30 w-64 bg-primary-800 text-white flex flex-col
          transform transition-transform duration-200
          lg:relative lg:translate-x-0
          ${open ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-5 border-b border-primary-700">
          <div>
            <p className="font-bold text-lg leading-tight">Taller Mecánico</p>
            <p className="text-xs text-primary-300">Sistema de Gestión</p>
          </div>
          <button onClick={onClose} className="lg:hidden p-1 rounded hover:bg-primary-700">
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-2">
          {nav.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-sm font-medium transition-colors
                ${isActive
                  ? 'bg-primary-600 text-white'
                  : 'text-primary-200 hover:bg-primary-700 hover:text-white'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 text-xs text-primary-400 border-t border-primary-700">
          v1.0.0
        </div>
      </aside>
    </>
  )
}
