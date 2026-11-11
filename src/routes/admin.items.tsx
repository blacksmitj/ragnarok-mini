import { createFileRoute } from '@tanstack/react-router'
import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { SingleSpriteUploader } from '../components/admin/single-sprite-uploader'
import { PaperdollLayerPreview } from '../components/admin/paperdoll-layer-preview'
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
import { Shield, Sparkles, Plus, Trash2, Search, Zap, Flame, Droplets, Mountain, Wind, Sun, Moon } from 'lucide-react'

export const Route = createFileRoute('/admin/items')({
  component: AdminItemsPage,
})

interface ItemRecord {
  id: string
  name: string
  itemType: 'weapon' | 'armor' | 'headgear' | 'accessory'
  element: string
  statsJson: { atk?: number; def?: number; str?: number; agi?: number; reqLevel?: number }
  spriteLayerUrl: string | null
  effectUrl: string | null
  description: string
}

const columnHelper = createColumnHelper<ItemRecord>()

function AdminItemsPage() {
  const queryClient = useQueryClient()
  const [globalFilter, setGlobalFilter] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)

  // Paperdoll Inspector State
  const [baseCharacterUrl] = useState('/assets/characters/novice.png')
  const [selectedOverlayUrl, setSelectedOverlayUrl] = useState<string | null>(null)
  const [selectedEffectUrl, setSelectedEffectUrl] = useState<string | null>(null)

  // Form State
  const [itemName, setItemName] = useState('')
  const [itemType, setItemType] = useState<'weapon' | 'armor' | 'headgear' | 'accessory'>('weapon')
  const [element, setElement] = useState('neutral')
  const [statAtk, setStatAtk] = useState(15)
  const [statDef, setStatDef] = useState(5)
  const [reqLevel, setReqLevel] = useState(1)
  const [spriteLayerUrl, setSpriteLayerUrl] = useState('')
  const [effectUrl, setEffectUrl] = useState('')
  const [description, setDescription] = useState('')

  // Query Items
  const { data: itemsList = [], isLoading } = useQuery({
    queryKey: ['admin-items'],
    queryFn: async () => {
      const res = await api.get<ItemRecord[]>('/api/admin/items')
      return res.data || []
    },
  })

  // Mutation Create Item
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return api.post('/api/admin/items', payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-items'] })
      setShowAddModal(false)
      // Reset form
      setItemName('')
      setSpriteLayerUrl('')
      setEffectUrl('')
      setDescription('')
      alert('Equipment & Effect berhasil disimpan!')
    },
    onError: (err: any) => {
      alert(`Gagal menyimpan: ${err.message}`)
    },
  })

  // Mutation Delete Item
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/api/admin/items/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-items'] })
    },
  })

  // Definisi Kolom TanStack Table
  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        header: 'Equipment Name',
        cell: (info) => (
          <div className="flex flex-col text-left">
            <span className="font-semibold text-slate-100">{info.getValue()}</span>
            <span className="text-[10px] text-slate-500 truncate max-w-xs">{info.row.original.description || '-'}</span>
          </div>
        ),
      }),
      columnHelper.accessor('itemType', {
        header: 'Type',
        cell: (info) => {
          const type = info.getValue()
          const colorMap: Record<string, string> = {
            weapon: 'bg-red-950/60 text-red-400 border-red-800/60',
            armor: 'bg-blue-950/60 text-blue-400 border-blue-800/60',
            headgear: 'bg-amber-950/60 text-amber-400 border-amber-800/60',
            accessory: 'bg-purple-950/60 text-purple-400 border-purple-800/60',
          }
          return (
            <span className={`px-2 py-0.5 text-[10px] font-semibold uppercase rounded border ${colorMap[type] || 'bg-slate-800'}`}>
              {type}
            </span>
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
            <div className="flex items-center gap-1.5 capitalize text-xs text-slate-300 font-medium">
              {getIcon()}
              <span>{el}</span>
            </div>
          )
        },
      }),
      columnHelper.accessor('statsJson', {
        header: 'Stats',
        cell: (info) => {
          const stats = info.getValue() || {}
          return (
            <div className="text-[11px] font-mono text-slate-300 flex items-center gap-2">
              {stats.atk ? <span className="text-red-300 font-medium">ATK +{stats.atk}</span> : null}
              {stats.def ? <span className="text-blue-300 font-medium">DEF +{stats.def}</span> : null}
              {stats.reqLevel ? <span className="text-slate-400">Lv.{stats.reqLevel}</span> : null}
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
                onClick={() => {
                  setSelectedOverlayUrl(row.spriteLayerUrl)
                  setSelectedEffectUrl(row.effectUrl)
                }}
                className="px-2 py-1 text-[10px] bg-indigo-950 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-300 rounded cursor-pointer"
                title="Preview Paperdoll"
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

  // TanStack Table Instance
  const table = useReactTable({
    data: itemsList,
    columns,
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!itemName) {
      alert('Nama item wajib diisi!')
      return
    }

    createMutation.mutate({
      name: itemName,
      itemType,
      element,
      statsJson: {
        atk: statAtk,
        def: statDef,
        reqLevel,
      },
      spriteLayerUrl: spriteLayerUrl || null,
      effectUrl: effectUrl || null,
      description,
    })
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Shield className="h-6 w-6 text-emerald-400" /> Equipment, Elements & Visual Effects
          </h1>
          <p className="text-sm text-slate-400">
            Kelola spritesheet layer perlengkapan karakter utama (Armor, Weapon, Headgear) serta efek partikel/elemen dengan Paperdoll Inspector.
          </p>
        </div>

        <Button
          onClick={() => setShowAddModal(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Tambah Equipment Baru
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Table Item Katalog (Col 8) */}
        <div className="lg:col-span-8 space-y-4">
          <Card className="border-slate-800 bg-slate-900/70">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Katalog Item & Layer Equipment</CardTitle>
                  <CardDescription className="text-xs">
                    Tabel data terintegrasi TanStack Table dengan pencarian dan sorting cepat.
                  </CardDescription>
                </div>

                {/* Global Search Bar */}
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                  <Input
                    placeholder="Cari item / element..."
                    value={globalFilter ?? ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGlobalFilter(e.target.value)}
                    className="pl-9 h-9 text-xs"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-xs text-slate-400 py-8 text-center">Memuat data equipment...</div>
              ) : itemsList.length === 0 ? (
                <div className="text-xs text-slate-500 py-12 text-center border border-dashed border-slate-800 rounded">
                  Belum ada equipment yang terdaftar. Klik "Tambah Equipment Baru" untuk mengunggah.
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

        {/* Paperdoll Inspector Preview (Col 4) */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="border-slate-800 bg-slate-900/70">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-400" /> Composite Paperdoll Inspector
              </CardTitle>
              <CardDescription className="text-xs">
                Uji kecocokan frame layer equipment & efek visual di atas tubuh karakter default.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <PaperdollLayerPreview
                baseSheetUrl={baseCharacterUrl}
                overlaySheetUrl={selectedOverlayUrl || undefined}
                effectSheetUrl={selectedEffectUrl || undefined}
                frameWidth={64}
                frameHeight={64}
                scale={2.5}
              />

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
                  <span className="text-slate-400">Layer 1 (Body):</span>
                  <span className="font-mono text-sky-400 truncate max-w-[160px]">Novice Base</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
                  <span className="text-slate-400">Layer 2 (Equipment):</span>
                  <span className="font-mono text-emerald-400 truncate max-w-[160px]">
                    {selectedOverlayUrl ? 'Layer Attached' : '(None)'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
                  <span className="text-slate-400">Layer 3 (Effect):</span>
                  <span className="font-mono text-amber-400 truncate max-w-[160px]">
                    {selectedEffectUrl ? 'Effect Attached' : '(None)'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal Tambah Equipment Baru */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-lg font-bold text-white">Unggah Equipment & Effect Baru</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Nama Equipment</label>
                  <Input
                    value={itemName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setItemName(e.target.value)}
                    placeholder="misal: Flaming Katana"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Tipe Item</label>
                  <select
                    value={itemType}
                    onChange={(e: any) => setItemType(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-slate-700 bg-slate-900/60 px-3 py-1 text-sm text-slate-100"
                  >
                    <option value="weapon">Weapon (Senjata)</option>
                    <option value="armor">Armor (Baju Pelindung)</option>
                    <option value="headgear">Headgear (Topi / Helm)</option>
                    <option value="accessory">Accessory (Aksesoris)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Elemen</label>
                  <select
                    value={element}
                    onChange={(e: any) => setElement(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-slate-700 bg-slate-900/60 px-3 py-1 text-sm text-slate-100 capitalize"
                  >
                    <option value="neutral">Neutral</option>
                    <option value="fire">Fire</option>
                    <option value="water">Water</option>
                    <option value="earth">Earth</option>
                    <option value="wind">Wind</option>
                    <option value="holy">Holy</option>
                    <option value="shadow">Shadow</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Bonus ATK</label>
                  <Input
                    type="number"
                    value={statAtk}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStatAtk(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Bonus DEF</label>
                  <Input
                    type="number"
                    value={statDef}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStatDef(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Min. Level</label>
                  <Input
                    type="number"
                    value={reqLevel}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReqLevel(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <SingleSpriteUploader
                  label="Layer Spritesheet (Overlay)"
                  folder="items"
                  value={spriteLayerUrl}
                  onChange={setSpriteLayerUrl}
                />
                <SingleSpriteUploader
                  label="Visual Effect / Aura Spritesheet"
                  folder="effects"
                  value={effectUrl}
                  onChange={setEffectUrl}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Deskripsi Item</label>
                <Input
                  value={description}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)}
                  placeholder="Pedang tajam dengan elemen api membara..."
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
                  className="bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                >
                  {createMutation.isPending ? 'Menyimpan...' : 'Simpan Equipment'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
