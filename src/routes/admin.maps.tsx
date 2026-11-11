import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { MapCanvasEditor } from '../components/admin/map-canvas-editor'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { api } from '../lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Map as MapIcon, Plus, Globe, FileEdit, Trash2, ArrowLeft } from 'lucide-react'

export const Route = createFileRoute('/admin/maps')({
  component: AdminMapsPage,
})

function AdminMapsPage() {
  const queryClient = useQueryClient()
  const [activeEditorMap, setActiveEditorMap] = useState<any | null>(null)
  const [isEditorOpen, setIsEditorOpen] = useState(false)

  // Query Maps list dari DB
  const { data: mapsList = [], isLoading } = useQuery({
    queryKey: ['admin-maps'],
    queryFn: async () => {
      const res = await api.get<any[]>('/api/admin/maps')
      return res.data || []
    },
  })

  // Mutation Save Draft Map
  const saveDraftMutation = useMutation({
    mutationFn: async (payload: any) => {
      return api.post('/api/admin/maps/draft', {
        id: activeEditorMap?.id,
        name: payload.name,
        width: payload.width,
        height: payload.height,
        tileSize: payload.tileSize,
        layersJson: payload.layers,
      })
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['admin-maps'] })
      if (res.data) setActiveEditorMap(res.data)
      alert('Draft Map berhasil disimpan!')
    },
    onError: (err: any) => {
      alert(`Gagal menyimpan draft: ${err.message}`)
    },
  })

  // Mutation Publish Map
  const publishMutation = useMutation({
    mutationFn: async (payload: any) => {
      // 1. Simpan draft dulu
      const draftRes: any = await api.post('/api/admin/maps/draft', {
        id: activeEditorMap?.id,
        name: payload.name,
        width: payload.width,
        height: payload.height,
        tileSize: payload.tileSize,
        layersJson: payload.layers,
      })
      const mapId = draftRes.data?.id || activeEditorMap?.id
      // 2. Publish
      return api.post(`/api/admin/maps/publish/${mapId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-maps'] })
      alert('🎉 Map berhasil dipublikasikan! Game client sekarang dapat memainkan map ini.')
    },
    onError: (err: any) => {
      alert(`Gagal publish: ${err.message}`)
    },
  })

  // Mutation Delete Map
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/api/admin/maps/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-maps'] })
    },
  })

  // Jika sedang membuka visual map editor
  if (isEditorOpen) {
    return (
      <div className="space-y-4 max-w-7xl mx-auto h-[calc(100vh-100px)] flex flex-col">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIsEditorOpen(false)
              setActiveEditorMap(null)
            }}
            className="flex items-center gap-1.5 text-xs border-slate-700 cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke Daftar Map
          </Button>
        </div>

        <div className="flex-1 overflow-hidden">
          <MapCanvasEditor
            initialMap={
              activeEditorMap
                ? {
                    id: activeEditorMap.id,
                    name: activeEditorMap.name,
                    width: activeEditorMap.width,
                    height: activeEditorMap.height,
                    tileSize: activeEditorMap.tileSize,
                    layers: activeEditorMap.layersJson || activeEditorMap.layers_json,
                  }
                : undefined
            }
            onSaveDraft={(data: any) => saveDraftMutation.mutate(data)}
            onPublish={(data: any) => publishMutation.mutate(data)}
            isSaving={saveDraftMutation.isPending || publishMutation.isPending}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <MapIcon className="h-6 w-6 text-amber-400" /> 2D Map Builder & Arena Manager
          </h1>
          <p className="text-sm text-slate-400">
            Rancang arena permainan secara visual (Floor, Terrain, Bush, Tree, Monster Spawner) dengan status Draft & Publish.
          </p>
        </div>

        <Button
          onClick={() => {
            setActiveEditorMap(null)
            setIsEditorOpen(true)
          }}
          className="bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-2 cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Buka Visual Map Editor
        </Button>
      </div>

      {/* Grid Maps List */}
      <Card className="border-slate-800 bg-slate-900/70">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Daftar Peta Arena Permainan</CardTitle>
          <CardDescription className="text-xs">
            Peta dengan status 'Published' akan langsung aktif dan dapat dimuat oleh Phaser Game Client.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-xs text-slate-400 py-12 text-center">Memuat daftar peta...</div>
          ) : mapsList.length === 0 ? (
            <div className="text-xs text-slate-500 py-16 text-center border border-dashed border-slate-800 rounded">
              Belum ada map arena yang dibuat. Klik "Buka Visual Map Editor" untuk mulai mendesain map pertama Anda!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mapsList.map((mapItem: any) => {
                const isPub = mapItem.status === 'published'
                return (
                  <div
                    key={mapItem.id}
                    className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-950 p-4 hover:border-slate-700 transition-all shadow-sm"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span
                          className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border ${
                            isPub
                              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                              : 'bg-amber-950/80 text-amber-300 border-amber-800'
                          }`}
                        >
                          {isPub ? <Globe className="h-3 w-3" /> : <FileEdit className="h-3 w-3" />}
                          {mapItem.status}
                        </span>

                        <span className="text-[10px] text-slate-500 font-mono">
                          {mapItem.width}x{mapItem.height} Tiles
                        </span>
                      </div>

                      <h4 className="text-base font-bold text-slate-100 truncate">{mapItem.name}</h4>
                      <p className="text-xs text-slate-400">
                        Tile size: {mapItem.tileSize}px • Spawners & Doodads configured
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-800/80">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            setActiveEditorMap(mapItem)
                            setIsEditorOpen(true)
                          }}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-8 cursor-pointer"
                        >
                          Edit Visual
                        </Button>
                      </div>

                      <button
                        onClick={() => deleteMutation.mutate(mapItem.id)}
                        className="p-1.5 text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                        title="Hapus Map"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
