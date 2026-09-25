import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, Car, Wrench, ClipboardList,
  Package, FileText, DollarSign, Calendar, CalendarCheck,
  Settings, Cog, X, BarChart2, History, Truck, Calculator, ShoppingCart, LineChart,
} from 'lucide-react'
import logo from '../../assets/logo.jpeg'

/* ── Grupos de navegación ──────────────────────────────────── */
const navGroups = [
  {
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
      { to: '/reports', icon: LineChart, label: 'Reportes' },
    ],
  },
  {
    label: 'Operaciones',
    items: [
      { to: '/quotes',        icon: Calculator,     label: 'Cotizaciones' },
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
      { to: '/suppliers', icon: Truck,     label: 'Proveedores' },
      { to: '/purchase-orders', icon: ShoppingCart, label: 'Órdenes de Compra' },
      { to: '/invoices',  icon: FileText,  label: 'Facturación' },
      { to: '/payments',  icon: DollarSign, label: 'Pagos' },
    ],
  },
]

/* ── Item de navegación individual ────────────────────────── */
function NavItem({ to, icon: Icon, label, end, onClose, collapsed }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClose}
      className="block mb-0.5"
      title={collapsed ? label : undefined}
    >
      {({ isActive }) => (
        <span
          className={`
            flex items-center gap-3 px-3 py-[0.45rem] rounded-xl text-sm font-medium
            transition-all duration-150 cursor-pointer
            ${collapsed ? 'lg:justify-center lg:gap-0 lg:px-0' : ''}
            ${isActive
              ? 'bg-gray-100 text-gray-900 font-semibold'
              : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
            }
          `}
        >
          <span className="flex items-center justify-center w-7 h-7 shrink-0">
            <Icon size={15} />
          </span>
          <span className={collapsed ? 'lg:hidden' : ''}>{label}</span>
        </span>
      )}
    </NavLink>
  )
}

/* ── Sidebar ───────────────────────────────────────────────── */
export default function Sidebar({ open, onClose, desktopOpen = true }) {
  const collapsed = !desktopOpen

  return (
    <>
      {/* Overlay móvil */}
      {open && (
        <div className="fixed inset-0 z-20 bg-black/40 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-30 w-64 flex flex-col shrink-0
          bg-white border-r border-gray-100
          transform transition-all duration-200
          lg:relative lg:translate-x-0 lg:overflow-hidden
          ${open ? 'translate-x-0' : '-translate-x-full'}
          ${desktopOpen ? 'lg:w-64' : 'lg:w-[76px]'}
        `}
      >
        {/* ── Logo ── */}
        <div className={`flex items-center justify-between px-4 py-4 border-b border-gray-100 ${collapsed ? 'lg:justify-center lg:px-0' : ''}`}>
          <div className="flex items-center gap-2.5">
            <img
              src={logo}
              alt="Logo Taller Hermanos Juarez"
              className="w-9 h-9 rounded-xl object-contain bg-white p-0.5 shrink-0 shadow-sm ring-1 ring-gray-100"
            />
            <div className={collapsed ? 'lg:hidden' : ''}>
              <p className="text-sm font-bold text-gray-900 leading-tight">Hermanos Juarez</p>
              <p className="text-[11px] text-gray-400 leading-tight">Sistema de Gestión</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Navegación ── */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-2.5 space-y-5">
          {navGroups.map((group, gi) => (
            <div key={gi}>
              {group.label && (
                <p className={`px-3 mb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-[0.13em] whitespace-nowrap ${collapsed ? 'lg:hidden' : ''}`}>
                  {group.label}
                </p>
              )}
              <div>
                {group.items.map(item => (
                  <NavItem key={item.to} {...item} onClose={onClose} collapsed={collapsed} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* ── Configuración ── */}
        <div className="px-2.5 pb-3 border-t border-gray-100 pt-3 space-y-0.5">
          <NavItem to="/activity-log" icon={History} label="Auditoría" onClose={onClose} collapsed={collapsed} />
          <NavItem to="/settings" icon={Cog} label="Configuración" onClose={onClose} collapsed={collapsed} />
        </div>

      </aside>
    </>
  )
}
