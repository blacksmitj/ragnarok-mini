import { createFileRoute, Outlet, useRouterState } from '@tanstack/react-router'
import { AppSidebar } from '../components/admin/app-sidebar'
import { ChevronRight } from 'lucide-react'

export const Route = createFileRoute('/admin')({
  component: AdminLayout,
})

function AdminLayout() {
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname
  const pathParts = currentPath.split('/').filter(Boolean)

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* Sidebar 07 Navigation */}
      <AppSidebar />

      {/* Main Admin Content Container */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header Breadcrumb */}
        <header className="flex h-14 items-center justify-between border-b border-slate-800 bg-slate-900/40 px-6 backdrop-blur">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span className="font-medium text-slate-300">Admin</span>
            {pathParts.slice(1).map((part) => (
              <span key={part} className="flex items-center gap-2">
                <ChevronRight className="h-4 w-4 text-slate-400" />
                <span className="capitalize font-semibold text-indigo-400">{part}</span>
              </span>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs bg-indigo-950/60 border border-indigo-800/50 text-indigo-300 px-3 py-1.5 rounded-full">
              <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
              Admin Mode (Developer)
            </div>
          </div>
        </header>

        {/* Dynamic Nested Route Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
