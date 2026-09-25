import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

function getInitialDesktopOpen() {
  try {
    const stored = localStorage.getItem('sidebar_desktop_open')
    return stored === null ? true : stored === 'true'
  } catch {
    return true
  }
}

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [desktopOpen, setDesktopOpen] = useState(getInitialDesktopOpen)

  useEffect(() => {
    try {
      localStorage.setItem('sidebar_desktop_open', String(desktopOpen))
    } catch {
      // almacenamiento no disponible (modo privado, etc.) — no es crítico
    }
  }, [desktopOpen])

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} desktopOpen={desktopOpen} />
      <div className="flex-1 flex flex-col min-w-0 overflow-auto">
        <Header
          onMenuClick={() => setSidebarOpen(true)}
          desktopOpen={desktopOpen}
          onToggleSidebar={() => setDesktopOpen(o => !o)}
        />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
