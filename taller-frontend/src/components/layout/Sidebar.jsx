import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, Car, Wrench, ClipboardList,
  Package, FileText, DollarSign, Calendar, CalendarCheck,
  Settings, Cog, X, BarChart2,
} from 'lucide-react'
import logo from '../../assets/logo.jpeg'

/* ── Grupos de navegación ──────────────────────────────────── */
const navGroups = [
  {
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
    ],
  },
  {
    label: 'Operaciones',
    items: [
      { to: '/work-orders',   icon: ClipboardList, label: 'Órdenes de Trabajo' },
      { to: '/appointments',  icon: CalendarCheck,  label: 'Citas' },
      { to: '/calendar',      icon: Calendar,       label: 'Calendario' },
    ],
  },
  {
    label: 'Registros',
    items: [
      { to: '/customers',  icon: Users,    label: 'Clientes' },
      { to: '/vehicles',   icon: Car,      label: 'Vehículos' },
      { to: '/employees',       icon: Wrench,    label: 'Empleados' },
      { to: '/employees/stats', icon: BarChart2,  label: 'Rendimiento' },
      { to: '/services',   icon: Settings, label: 'Servicios' },
    ],
  },
  {
    label: 'Finanzas',
    items: [
      { to: '/inventory', icon: Package,   label: 'Inventario' },
      { to: '/invoices',  icon: FileText,  label: 'Facturación' },
      { to: '/payments',  icon: DollarSign, label: 'Pagos' },
    ],
  },
]

/* ── Item de navegación individual ────────────────────────── */
function NavItem({ to, icon: Icon, label, end, onClose }) {
  return (
    <NavLink to={to} end={end} onClick={onClose} className="block mb-0.5">
      {({ isActive }) => (
        <span
          className={`
            flex items-center gap-3 px-3 py-[0.45rem] rounded-xl text-sm font-medium
            transition-all duration-150 cursor-pointer
            ${isActive
              ? 'bg-white/[0.13] text-white'
              : 'text-white/50 hover:bg-white/[0.07] hover:text-white/85'
            }
          `}
        >
          <span
            className={`
              flex items-center justify-center w-7 h-7 rounded-lg shrink-0 transition-colors
              ${isActive ? 'bg-white/[0.18]' : ''}
            `}
          >
            <Icon size={15} />
          </span>
          {label}
        </span>
      )}
    </NavLink>
  )
}

/* ── Sidebar ───────────────────────────────────────────────── */
export default function Sidebar({ open, onClose }) {
  return (
    <>
      {/* Overlay móvil */}
      {open && (
        <div className="fixed inset-0 z-20 bg-black/40 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-30 w-64 flex flex-col
          bg-[#0f1e3d]
          transform transition-transform duration-200
          lg:relative lg:translate-x-0
          ${open ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* ── Logo ── */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/[0.07]">
          <div className="flex items-center gap-2.5">
            <img
              src={logo}
              alt="Logo Taller Hermanos Juarez"
              className="w-9 h-9 rounded-xl object-contain bg-white p-0.5 shrink-0 shadow-md"
            />
            <div>
              <p className="text-sm font-bold text-white leading-tight">Hermanos Juarez</p>
              <p className="text-[11px] text-white/35 leading-tight">Sistema de Gestión</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Navegación ── */}
        <nav className="flex-1 overflow-y-auto py-4 px-2.5 space-y-5">
          {navGroups.map((group, gi) => (
            <div key={gi}>
              {group.label && (
                <p className="px-3 mb-2 text-[10px] font-semibold text-white/25 uppercase tracking-[0.13em]">
                  {group.label}
                </p>
              )}
              <div>
                {group.items.map(item => (
                  <NavItem key={item.to} {...item} onClose={onClose} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* ── Configuración ── */}
        <div className="px-2.5 pb-3 border-t border-white/[0.07] pt-3">
          <NavItem to="/settings" icon={Cog} label="Configuración" onClose={onClose} />
        </div>

      </aside>
    </>
  )
}
