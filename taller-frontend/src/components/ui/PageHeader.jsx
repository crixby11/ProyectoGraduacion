export default function PageHeader({ title, subtitle, action, icon: Icon }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="w-10 h-10 rounded-xl bg-[#0f1e3d] flex items-center justify-center shrink-0 shadow-sm">
            <Icon size={20} className="text-white" />
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold text-gray-900 leading-tight">{title}</h1>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="ml-4 shrink-0">{action}</div>}
    </div>
  )
}
