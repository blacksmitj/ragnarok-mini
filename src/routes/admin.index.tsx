import { createFileRoute, Link } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import { Users, Shield, Skull, Map, ArrowUpRight, HardDrive, CheckCircle2 } from 'lucide-react'

export const Route = createFileRoute('/admin/')({
  component: AdminOverview,
})

function AdminOverview() {
  const cards = [
    {
      title: 'Characters (M/F)',
      desc: 'Unggah default sprite karakter utama pria & wanita, tentukan frame slicing animasi.',
      href: '/admin/characters',
      icon: Users,
      color: 'text-sky-400',
      badge: 'Fitur 1',
    },
    {
      title: 'Armor & Senjata',
      desc: 'Koleksi layer spritesheet untuk armor, senjata, helm, element & effect karakter.',
      href: '/admin/items',
      icon: Shield,
      color: 'text-emerald-400',
      badge: 'Fitur 2',
    },
    {
      title: '2D Map Builder',
      desc: 'Visual editor grid tile: floor, terrain, semak, pohon, spawner monster (Draft & Publish).',
      href: '/admin/maps',
      icon: Map,
      color: 'text-amber-400',
      badge: 'Fitur 3',
    },
    {
      title: 'Monster & Boss',
      desc: 'Katalog data monster, base stats, element, attack range, skill effect, & MVP Boss aura.',
      href: '/admin/monsters',
      icon: Skull,
      color: 'text-rose-400',
      badge: 'Fitur 4',
    },
  ]

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Content Management Dashboard</h1>
        <p className="text-sm text-slate-400">
          Selamat datang di panel kontrol konten game Mini Ragnarok. Kelola sprite, equipment, monster, dan map secara visual.
        </p>
      </div>

      {/* S3 Storage Status Banner */}
      <div className="flex items-center justify-between rounded-xl border border-indigo-900/40 bg-indigo-950/20 p-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-600/20 text-indigo-400">
            <HardDrive className="h-6 w-6" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-indigo-200">RustFS / S3 Compatible Storage</h4>
            <p className="text-xs text-indigo-300/70">
              Bucket: <code className="font-mono text-indigo-300">ragnarok-assets</code> • Status: Connected & Public Policy Ready
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-3 py-1.5 rounded-md">
          <CheckCircle2 className="h-4 w-4" />
          Ready for Content
        </div>
      </div>

      {/* Grid Menu Fitur Utama */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <Link key={card.title} to={card.href} className="group">
              <Card className="h-full border-slate-800 bg-slate-900/60 hover:bg-slate-900 hover:border-slate-700 transition-all duration-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className={`p-2 rounded-lg bg-slate-800/80 ${card.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {card.badge}
                    </span>
                  </div>
                  <CardTitle className="text-base group-hover:text-indigo-300 transition-colors pt-2">
                    {card.title}
                  </CardTitle>
                  <CardDescription className="text-xs leading-relaxed">
                    {card.desc}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center text-xs font-medium text-slate-400 group-hover:text-indigo-400">
                    Buka Pengaturan <ArrowUpRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
