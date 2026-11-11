import React from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import {
  Users,
  Shield,
  Map as MapIcon,
  Skull,
  Gamepad2,
  Sliders,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react'
import { cn } from '../../lib/utils'

interface SidebarItem {
  title: string
  url: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
}

const mainNavItems: SidebarItem[] = [
  { title: 'Overview', url: '/admin', icon: Sliders },
  { title: 'Characters (M/F)', url: '/admin/characters', icon: Users, badge: 'Phase 3' },
  { title: 'Equipment & Effects', url: '/admin/items', icon: Shield, badge: 'Phase 4' },
  { title: 'Monsters & Bosses', url: '/admin/monsters', icon: Skull, badge: 'Phase 5' },
  { title: '2D Map Builder', url: '/admin/maps', icon: MapIcon, badge: 'Phase 6' },
]

export const AppSidebar: React.FC = () => {
  const [collapsed, setCollapsed] = React.useState(false)
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname

  return (
    <aside
      className={cn(
        'relative flex flex-col border-r border-slate-800 bg-slate-950 text-slate-200 transition-all duration-300 select-none z-20',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header Sidebar (Branding & Project Name) */}
      <div className="flex h-14 items-center justify-between border-b border-slate-800 px-3">
        {!collapsed && (
          <div className="flex items-center gap-2 font-bold text-slate-100 tracking-wide">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white font-extrabold shadow-sm">
              RO
            </div>
            <div className="flex flex-col text-left">
              <span className="text-sm font-semibold leading-tight">Admin CMS</span>
              <span className="text-[10px] text-slate-400 font-mono">Mini Ragnarok</span>
            </div>
          </div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          title={collapsed ? 'Buka Sidebar' : 'Tutup Sidebar'}
        >
          {collapsed ? <PanelLeft className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
        </button>
      </div>

      {/* Navigation Group (Sidebar-07) */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        <div className={cn('px-2 py-1 text-[11px] font-semibold text-slate-400 tracking-wider uppercase', collapsed && 'hidden')}>
          Content Management
        </div>

        {mainNavItems.map((item) => {
          const Icon = item.icon
          const isActive = currentPath === item.url || (item.url !== '/admin' && currentPath.startsWith(item.url))

          return (
            <Link
              key={item.url}
              to={item.url}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-all',
                isActive
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 font-semibold'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100'
              )}
            >
              <Icon className={cn('h-4 w-4 shrink-0 transition-colors', isActive ? 'text-indigo-400' : 'text-slate-400 group-hover:text-slate-200')} />
              {!collapsed && (
                <div className="flex flex-1 items-center justify-between overflow-hidden">
                  <span className="truncate">{item.title}</span>
                  {item.badge && (
                    <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </Link>
          )
        })}

        <div className={cn('pt-4 px-2 py-1 text-[11px] font-semibold text-slate-400 tracking-wider uppercase', collapsed && 'hidden')}>
          Quick Links
        </div>

        {/* Shortcut ke Game Client */}
        <Link
          to="/"
          className="group flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium text-emerald-400 hover:bg-emerald-950/30 transition-all border border-emerald-900/20"
        >
          <Gamepad2 className="h-4 w-4 shrink-0 text-emerald-400" />
          {!collapsed && <span className="truncate">Open Game Client</span>}
        </Link>
      </div>

      {/* Footer Sidebar (Status Server & Storage) */}
      <div className="border-t border-slate-800 p-2 text-xs">
        <div className={cn('flex items-center gap-2 rounded-lg bg-slate-900/80 p-2', collapsed && 'justify-center')}>
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          {!collapsed && (
            <div className="flex flex-col overflow-hidden text-left">
              <span className="truncate text-slate-200 font-medium">RustFS S3 Ready</span>
              <span className="truncate text-[10px] text-slate-400">admin-dummy-auth</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
