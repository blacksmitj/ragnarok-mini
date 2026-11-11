import { createFileRoute } from '@tanstack/react-router'
import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { SingleSpriteUploader } from '../components/admin/single-sprite-uploader'
import { SpriteCanvasPreview } from '../components/admin/sprite-canvas-preview'
import { api } from '../lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, Trash2, User, Sparkles, Layers } from 'lucide-react'

export const Route = createFileRoute('/admin/characters')({
  component: AdminCharactersPage,
})

function AdminCharactersPage() {
  const queryClient = useQueryClient()
  const [selectedGender, setSelectedGender] = useState<'M' | 'F'>('M')
  const [characterName, setCharacterName] = useState('Novice Base')
  const [frameWidth, setFrameWidth] = useState(64)
  const [frameHeight, setFrameHeight] = useState(64)
  const [frameRate, setFrameRate] = useState(8)

  // URL per action
  const [idleUrl, setIdleUrl] = useState('/assets/characters/novice.png')
  const [walkUrl, setWalkUrl] = useState('')
  const [attackUrl, setAttackUrl] = useState('')
  const [dieUrl, setDieUrl] = useState('')

  // Query list karakter dari backend
  const { data: characterList = [], isLoading } = useQuery({
    queryKey: ['admin-characters'],
    queryFn: async () => {
      const res = await api.get<any[]>('/api/admin/characters')
      return res.data || []
    },
  })

  // Mutation simpan karakter baru
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return api.post('/api/admin/characters', payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-characters'] })
      alert('Spritesheet karakter berhasil disimpan!')
    },
    onError: (err: any) => {
      alert(`Gagal menyimpan: ${err.message}`)
    },
  })

  // Mutation hapus karakter
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/api/admin/characters/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-characters'] })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!idleUrl) {
      alert('Idle Spritesheet wajib diunggah!')
      return
    }

    createMutation.mutate({
      gender: selectedGender,
      name: characterName,
      spriteType: 'body',
      idleSheetUrl: idleUrl,
      walkSheetUrl: walkUrl || null,
      attackSheetUrl: attackUrl || null,
      dieSheetUrl: dieUrl || null,
      frameWidth,
      frameHeight,
      frameRate,
    })
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-sky-400" /> Default Character Sprites (M/F)
          </h1>
          <p className="text-sm text-slate-400">
            Unggah dan atur konfigurasi spritesheet default karakter utama pria & wanita dengan sistem Paperdoll / Layered Composite.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Input & Upload (Col 7) */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="border-slate-800 bg-slate-900/70">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Konfigurasi Karakter & Action Sheets</CardTitle>
              <CardDescription className="text-xs">
                Pilih gender, nama set, ukuran frame pemotongan pixel, dan berkas spritesheet.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Gender Switcher Tab */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Gender Karakter</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedGender('M')}
                      className={`flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-all ${
                        selectedGender === 'M'
                          ? 'bg-sky-600/20 text-sky-400 border border-sky-500/50 font-semibold'
                          : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                      }`}
                    >
                      <User className="h-4 w-4" /> Male (Pria)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedGender('F')}
                      className={`flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-all ${
                        selectedGender === 'F'
                          ? 'bg-pink-600/20 text-pink-400 border border-pink-500/50 font-semibold'
                          : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                      }`}
                    >
                      <Sparkles className="h-4 w-4" /> Female (Wanita)
                    </button>
                  </div>
                </div>

                {/* Nama Set Karakter */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Nama Set Spritesheet</label>
                  <Input
                    value={characterName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCharacterName(e.target.value)}
                    placeholder="misal: Novice Default M"
                    required
                  />
                </div>

                {/* Grid Slicing Dimensi Frame */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">Frame Width (px)</label>
                    <Input
                      type="number"
                      value={frameWidth}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFrameWidth(Number(e.target.value))}
                      min={16}
                      max={256}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">Frame Height (px)</label>
                    <Input
                      type="number"
                      value={frameHeight}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFrameHeight(Number(e.target.value))}
                      min={16}
                      max={256}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">Frame Rate (FPS)</label>
                    <Input
                      type="number"
                      value={frameRate}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFrameRate(Number(e.target.value))}
                      min={1}
                      max={60}
                    />
                  </div>
                </div>

                {/* Upload Action Sheets */}
                <div className="space-y-3 pt-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5" /> Action Spritesheets (RustFS S3)
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <SingleSpriteUploader
                      label="1. Idle Action (Wajib)"
                      folder="characters"
                      value={idleUrl}
                      onChange={setIdleUrl}
                    />
                    <SingleSpriteUploader
                      label="2. Walk Action (Opsional)"
                      folder="characters"
                      value={walkUrl}
                      onChange={setWalkUrl}
                    />
                    <SingleSpriteUploader
                      label="3. Attack Action (Opsional)"
                      folder="characters"
                      value={attackUrl}
                      onChange={setAttackUrl}
                    />
                    <SingleSpriteUploader
                      label="4. Die / Dead Action (Opsional)"
                      folder="characters"
                      value={dieUrl}
                      onChange={setDieUrl}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium mt-4 cursor-pointer"
                >
                  {createMutation.isPending ? 'Menyimpan...' : 'Simpan Konfigurasi Karakter'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Live Preview & Existing Characters (Col 5) */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="border-slate-800 bg-slate-900/70">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-400" /> Live Animation Slicer Preview
              </CardTitle>
              <CardDescription className="text-xs">
                Verifikasi pemotongan frame horizontal secara langsung sebelum disimpan ke database.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {idleUrl ? (
                <SpriteCanvasPreview
                  sheetUrl={idleUrl}
                  frameWidth={frameWidth}
                  frameHeight={frameHeight}
                  frameRate={frameRate}
                  scale={2.5}
                />
              ) : (
                <div className="h-40 flex items-center justify-center rounded-lg border border-dashed border-slate-800 text-xs text-slate-500">
                  Unggah Idle Spritesheet untuk melihat live preview
                </div>
              )}

              <div className="text-[11px] text-slate-400 bg-slate-950 p-3 rounded border border-slate-800 space-y-1">
                <div className="font-semibold text-slate-300">Format Rekomendasi Spritesheet:</div>
                <div>• Horizontal strip (frame 0 ke N disusun mendatar).</div>
                <div>• Resolusi per frame standar: 64x64px atau 48x48px.</div>
                <div>• Alpha transparency PNG untuk layering armor & senjata.</div>
              </div>
            </CardContent>
          </Card>

          {/* Daftar Karakter Tersimpan */}
          <Card className="border-slate-800 bg-slate-900/70">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Karakter Tersimpan di Database</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-xs text-slate-400 py-4 text-center">Memuat daftar karakter...</div>
              ) : characterList.length === 0 ? (
                <div className="text-xs text-slate-500 py-4 text-center border border-dashed border-slate-800 rounded">
                  Belum ada karakter yang tersimpan di database.
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {characterList.map((char: any) => (
                    <div
                      key={char.id}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            char.gender === 'M'
                              ? 'bg-sky-950 text-sky-400 border border-sky-800'
                              : 'bg-pink-950 text-pink-400 border border-pink-800'
                          }`}
                        >
                          {char.gender}
                        </span>
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-semibold text-slate-200 truncate">{char.name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {char.frameWidth}x{char.frameHeight}px @ {char.frameRate}fps
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setIdleUrl(char.idleSheetUrl)
                            setFrameWidth(char.frameWidth)
                            setFrameHeight(char.frameHeight)
                            setFrameRate(char.frameRate)
                            setSelectedGender(char.gender)
                            setCharacterName(char.name)
                          }}
                          className="px-2 py-1 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-200 rounded cursor-pointer"
                        >
                          Load
                        </button>
                        <button
                          onClick={() => deleteMutation.mutate(char.id)}
                          className="p-1 text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                          title="Hapus"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
