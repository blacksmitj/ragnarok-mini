import { createFileRoute } from '@tanstack/react-router'
import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { SingleSpriteUploader } from '../components/admin/single-sprite-uploader'
import { SpriteCanvasPreview } from '../components/admin/sprite-canvas-preview'
import { api } from '../lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table'
import {
  Skull,
  Plus,
  Trash2,
  Search,
  Crown,
  Zap,
  Flame,
  Droplets,
  Mountain,
  Wind,
  Sun,
  Moon,
  Sparkles,
  Heart,
  Swords,
  ShieldAlert,
} from 'lucide-react'

export const Route = createFileRoute('/admin/monsters')({
  component: AdminMonstersPage,
})

interface MonsterRecord {
  id: string
  name: string
  isBoss: number // 0: Normal, 1: Mini-Boss, 2: MVP Boss
  element: string
  size: 'small' | 'medium' | 'large'
  statsJson: {
    level: number
    hp: number
    atkMin: number
    atkMax: number
    def: number
    aspd: number
    speed: number
    exp: number
  }
  skillsJson: Array<{ id: string; name: string; chance: number }>
  spritesheetUrl: string
  frameWidth: number
  frameHeight: number
}

const columnHelper = createColumnHelper<MonsterRecord>()

function AdminMonstersPage() {
  const queryClient = useQueryClient()
  const [globalFilter, setGlobalFilter] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)

  // Selected Monster for Inspector Preview
  const [selectedMonster, setSelectedMonster] = useState<MonsterRecord | null>(null)

  // Form State
  const [monsterName, setMonsterName] = useState('')
  const [isBoss, setIsBoss] = useState(0) // 0: Normal, 1: Mini-Boss, 2: MVP
  const [element, setElement] = useState('water')
  const [size, setSize] = useState<'small' | 'medium' | 'large'>('small')
  const [baseLevel, setBaseLevel] = useState(1)
  const [maxHp, setMaxHp] = useState(50)
  const [atkMin, setAtkMin] = useState(5)
  const [atkMax, setAtkMax] = useState(8)
  const [def, setDef] = useState(2)
  const [aspd, setAspd] = useState(1.0)
  const [speed, setSpeed] = useState(60)
  const [exp, setExp] = useState(15)
  const [spritesheetUrl, setSpritesheetUrl] = useState('/assets/monsters/poring.png')
  const [frameWidth, setFrameWidth] = useState(48)
  const [frameHeight, setFrameHeight] = useState(48)
  const [skillListText, setSkillListText] = useState('Sonic Blow (20%), Heal (10%)')

  // Query Monsters List
  const { data: monstersList = [], isLoading } = useQuery({
    queryKey: ['admin-monsters'],
    queryFn: async () => {
      const res = await api.get<MonsterRecord[]>('/api/admin/monsters')
      return res.data || []
    },
  })

  // Mutation Create Monster
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return api.post('/api/admin/monsters', payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-monsters'] })
      setShowAddModal(false)
      // Reset form
      setMonsterName('')
      setSpritesheetUrl('')
      alert('Data Monster / Boss berhasil disimpan!')
    },
    onError: (err: any) => {
      alert(`Gagal menyimpan: ${err.message}`)
    },
  })

  // Mutation Delete Monster
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/api/admin/monsters/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-monsters'] })
    },
  })

  // Kolom TanStack Table
  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        header: 'Monster Name',
        cell: (info) => {
          const row = info.row.original
          return (
            <div className="flex items-center gap-2.5">
              <div className="flex flex-col text-left">
                <div className="flex items-center gap-1.5 font-semibold text-slate-100">
                  {row.name}
                  {row.isBoss === 2 && (
                    <span className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 bg-amber-950 text-amber-300 border border-amber-600 rounded font-bold uppercase tracking-wider">
                      <Crown className="h-3 w-3 text-amber-400" /> MVP BOSS
                    </span>
                  )}
                  {row.isBoss === 1 && (
                    <span className="text-[9px] px-1.5 py-0.5 bg-purple-950 text-purple-300 border border-purple-700 rounded font-semibold uppercase">
                      Mini-Boss
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-500 font-mono">
                  Level {row.statsJson?.level || 1} • {row.size}
                </span>
              </div>
            </div>
          )
        },
      }),
      columnHelper.accessor('element', {
        header: 'Element',
        cell: (info) => {
          const el = info.getValue()
          const getIcon = () => {
            switch (el) {
              case 'fire':
                return <Flame className="h-3 w-3 text-red-400" />
              case 'water':
                return <Droplets className="h-3 w-3 text-cyan-400" />
              case 'earth':
                return <Mountain className="h-3 w-3 text-amber-600" />
              case 'wind':
                return <Wind className="h-3 w-3 text-emerald-400" />
              case 'holy':
                return <Sun className="h-3 w-3 text-yellow-300" />
              case 'shadow':
                return <Moon className="h-3 w-3 text-purple-400" />
              default:
                return <Zap className="h-3 w-3 text-slate-400" />
            }
          }
          return (
            <div className="flex items-center gap-1.5 capitalize text-xs text-slate-300">
              {getIcon()}
              <span>{el}</span>
            </div>
          )
        },
      }),
      columnHelper.accessor('statsJson', {
        header: 'Combat Stats',
        cell: (info) => {
          const stats = info.getValue() || {}
          return (
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="flex items-center gap-1 text-emerald-400">
                <Heart className="h-3 w-3" /> {stats.hp || 0} HP
              </span>
              <span className="flex items-center gap-1 text-red-400">
                <Swords className="h-3 w-3" /> {stats.atkMin}-{stats.atkMax}
              </span>
              <span className="flex items-center gap-1 text-blue-400">
                <ShieldAlert className="h-3 w-3" /> {stats.def} DEF
              </span>
            </div>
          )
        },
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        cell: (info) => {
          const row = info.row.original
          return (
            <div className="flex items-center gap-1.5 justify-end">
              <button
                onClick={() => setSelectedMonster(row)}
                className="px-2 py-1 text-[10px] bg-rose-950 hover:bg-rose-900 border border-rose-800/60 text-rose-300 rounded cursor-pointer"
              >
                Inspect
              </button>
              <button
                onClick={() => deleteMutation.mutate(row.id)}
                className="p-1 text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                title="Hapus"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )
        },
      }),
    ],
    []
  )

  const table = useReactTable({
    data: monstersList,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!monsterName || !spritesheetUrl) {
      alert('Nama dan Spritesheet Monster wajib diisi!')
      return
    }

    // Parse simple skills text
    const skills = skillListText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => ({ id: s.toLowerCase().replace(/[^a-z0-9]/g, '_'), name: s, chance: 0.2 }))

    createMutation.mutate({
      name: monsterName,
      isBoss,
      element,
      size,
      statsJson: {
        level: baseLevel,
        hp: maxHp,
        atkMin,
        atkMax,
        def,
        aspd,
        speed,
        exp,
      },
      skillsJson: skills,
      spritesheetUrl,
      frameWidth,
      frameHeight,
    })
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Skull className="h-6 w-6 text-rose-400" /> Monster & Boss Database
          </h1>
          <p className="text-sm text-slate-400">
            Katalog dan konfigurasi monster, stats pertarungan, elemen, animasi sprite, skill spesial, dan klasifikasi MVP Boss.
          </p>
        </div>

        <Button
          onClick={() => setShowAddModal(true)}
          className="bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-2 cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Tambah Monster Baru
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Table Monster (Col 8) */}
        <div className="lg:col-span-8 space-y-4">
          <Card className="border-slate-800 bg-slate-900/70">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Daftar Monster & MVP Boss</CardTitle>
                  <CardDescription className="text-xs">
                    Kelola data monster authoritative yang akan di-spawn oleh backend server.
                  </CardDescription>
                </div>

                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                  <Input
                    placeholder="Cari monster / status..."
                    value={globalFilter ?? ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGlobalFilter(e.target.value)}
                    className="pl-9 h-9 text-xs"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-xs text-slate-400 py-8 text-center">Memuat daftar monster...</div>
              ) : monstersList.length === 0 ? (
                <div className="text-xs text-slate-500 py-12 text-center border border-dashed border-slate-800 rounded">
                  Belum ada monster yang didaftarkan. Klik "Tambah Monster Baru" untuk menambahkan.
                </div>
              ) : (
                <div className="rounded-md border border-slate-800 overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-950 text-slate-400 text-xs uppercase border-b border-slate-800">
                      {table.getHeaderGroups().map((headerGroup) => (
                        <tr key={headerGroup.id}>
                          {headerGroup.headers.map((header) => (
                            <th key={header.id} className="px-4 py-3 font-semibold">
                              {flexRender(header.column.columnDef.header, header.getContext())}
                            </th>
                          ))}
                        </tr>
                      ))}
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                      {table.getRowModel().rows.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-800/40 transition-colors">
                          {row.getVisibleCells().map((cell) => (
                            <td key={cell.id} className="px-4 py-3">
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Live Monster Inspector (Col 4) */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="border-slate-800 bg-slate-900/70">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-rose-400" /> Monster Visual Inspector
              </CardTitle>
              <CardDescription className="text-xs">
                Preview animasi pergerakan dan efek aura monster.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <SpriteCanvasPreview
                sheetUrl={selectedMonster?.spritesheetUrl || '/assets/monsters/poring.png'}
                frameWidth={selectedMonster?.frameWidth || 48}
                frameHeight={selectedMonster?.frameHeight || 48}
                frameRate={6}
                scale={selectedMonster?.isBoss === 2 ? 3.5 : 2.5}
              />

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
                  <span className="text-slate-400">Monster Target:</span>
                  <span className="font-semibold text-rose-300">
                    {selectedMonster?.name || 'Poring (Default)'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
                  <span className="text-slate-400">Status / Ranking:</span>
                  <span className="font-mono text-amber-300">
                    {selectedMonster?.isBoss === 2 ? 'MVP Boss Aura Active' : selectedMonster?.isBoss === 1 ? 'Mini-Boss' : 'Normal Monster'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
                  <span className="text-slate-400">EXP Yield:</span>
                  <span className="font-mono text-emerald-400">
                    +{selectedMonster?.statsJson?.exp || 15} EXP
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal Tambah Monster Baru */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Skull className="h-5 w-5 text-rose-400" /> Tambah Data Monster & Boss
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Row 1: Nama & Boss Tier */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Nama Monster</label>
                  <Input
                    value={monsterName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMonsterName(e.target.value)}
                    placeholder="misal: Baphomet, Poring, Wolf"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Klasifikasi Boss</label>
                  <select
                    value={isBoss}
                    onChange={(e: any) => setIsBoss(Number(e.target.value))}
                    className="flex h-9 w-full rounded-md border border-slate-700 bg-slate-900/60 px-3 py-1 text-sm text-slate-100"
                  >
                    <option value={0}>Normal Monster</option>
                    <option value={1}>Mini-Boss (Harder)</option>
                    <option value={2}>👑 MVP Boss (Gold Aura & Broadcast)</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Elemen & Ukuran */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Elemen</label>
                  <select
                    value={element}
                    onChange={(e: any) => setElement(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-slate-700 bg-slate-900/60 px-3 py-1 text-sm text-slate-100 capitalize"
                  >
                    <option value="water">Water</option>
                    <option value="fire">Fire</option>
                    <option value="earth">Earth</option>
                    <option value="wind">Wind</option>
                    <option value="holy">Holy</option>
                    <option value="shadow">Shadow</option>
                    <option value="neutral">Neutral</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Ukuran Monster</label>
                  <select
                    value={size}
                    onChange={(e: any) => setSize(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-slate-700 bg-slate-900/60 px-3 py-1 text-sm text-slate-100 capitalize"
                  >
                    <option value="small">Small (Kecil)</option>
                    <option value="medium">Medium (Sedang)</option>
                    <option value="large">Large (Besar)</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Combat Stats Grid */}
              <div className="grid grid-cols-4 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-300">Base Level</label>
                  <Input
                    type="number"
                    value={baseLevel}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBaseLevel(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-300">Max HP</label>
                  <Input
                    type="number"
                    value={maxHp}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMaxHp(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-300">Min ATK</label>
                  <Input
                    type="number"
                    value={atkMin}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAtkMin(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-300">Max ATK</label>
                  <Input
                    type="number"
                    value={atkMax}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAtkMax(Number(e.target.value))}
                  />
                </div>
              </div>

              {/* Row 4: Speed, DEF, EXP */}
              <div className="grid grid-cols-4 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-300">DEF</label>
                  <Input
                    type="number"
                    value={def}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDef(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-300">ASPD (s)</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={aspd}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAspd(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-300">Move Speed</label>
                  <Input
                    type="number"
                    value={speed}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSpeed(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-300">EXP Reward</label>
                  <Input
                    type="number"
                    value={exp}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExp(Number(e.target.value))}
                  />
                </div>
              </div>

              {/* Row 5: Spritesheet & Dimensions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                <SingleSpriteUploader
                  label="Spritesheet Monster (RustFS S3)"
                  folder="monsters"
                  value={spritesheetUrl}
                  onChange={setSpritesheetUrl}
                />
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-300">Frame W (px)</label>
                    <Input
                      type="number"
                      value={frameWidth}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFrameWidth(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-300">Frame H (px)</label>
                    <Input
                      type="number"
                      value={frameHeight}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFrameHeight(Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>

              {/* Skills text */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Daftar Skill Monster (Pisahkan Koma)</label>
                <Input
                  value={skillListText}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSkillListText(e.target.value)}
                  placeholder="Sonic Blow, Fireball, Heal"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddModal(false)}
                  className="cursor-pointer"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="bg-rose-600 hover:bg-rose-500 text-white cursor-pointer"
                >
                  {createMutation.isPending ? 'Menyimpan...' : 'Simpan Monster'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

