import { createFileRoute } from '@tanstack/react-router'
import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { SingleSpriteUploader } from '../components/admin/single-sprite-uploader'
import { CharacterSpritePreview } from '../components/admin/character-sprite-preview'
import { api } from '../lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, Trash2, User, Sparkles, Layers, ShieldCheck, Info, Copy, Check } from 'lucide-react'
import { generateSpritePrompt, type SpriteValidationResult } from '../lib/character-sprite-validator'

export const Route = createFileRoute('/admin/characters')({
  component: AdminCharactersPage,
})

function AdminCharactersPage() {
  const queryClient = useQueryClient()
  const [selectedGender, setSelectedGender] = useState<'M' | 'F'>('M')
  const [characterName, setCharacterName] = useState('Novice Base')

  // Dimensi Frame Baku (Terkunci / Non-Dinamis)
  const [frameSize, setFrameSize] = useState<64 | 32>(64)
  const [frameRate, setFrameRate] = useState(8)

  // URL per action
  const [idleUrl, setIdleUrl] = useState('/assets/characters/novice.png')
  const [walkUrl, setWalkUrl] = useState('')
  const [attackUrl, setAttackUrl] = useState('')
  const [dieUrl, setDieUrl] = useState('')

  // Action yang aktif diinspeksi pada preview
  const [previewAction, setPreviewAction] = useState<'idle' | 'walk' | 'attack' | 'die'>('idle')

  // Hasil validasi instan per action
  const [idleValidation, setIdleValidation] = useState<SpriteValidationResult | null>(null)
  const [walkValidation, setWalkValidation] = useState<SpriteValidationResult | null>(null)
  const [attackValidation, setAttackValidation] = useState<SpriteValidationResult | null>(null)
  const [dieValidation, setDieValidation] = useState<SpriteValidationResult | null>(null)
  const [copiedMode, setCopiedMode] = useState<8 | 4 | null>(null)

  const handleCopyModePrompt = (mode: 8 | 4) => {
    const text = generateSpritePrompt(mode, frameSize, 4, `${characterName || 'Novice'} character`)
    navigator.clipboard.writeText(text)
    setCopiedMode(mode)
    setTimeout(() => setCopiedMode(null), 2000)
  }

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
      frameWidth: frameSize,
      frameHeight: frameSize,
      frameRate,
    })
  }

  // Pilih URL dan hasil validasi sesuai action yang sedang di-preview
  const activePreviewUrl =
    previewAction === 'idle'
      ? idleUrl
      : previewAction === 'walk'
        ? walkUrl
        : previewAction === 'attack'
          ? attackUrl
          : dieUrl

  const activeValidation =
    previewAction === 'idle'
      ? idleValidation
      : previewAction === 'walk'
        ? walkValidation
        : previewAction === 'attack'
          ? attackValidation
          : dieValidation

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-sky-400" /> Default Character Sprites (M/F)
          </h1>
          <p className="text-sm text-slate-400">
            Unggah dan kelola spritesheet karakter dengan standar dimensi baku terkunci dan validasi instan multi-arah.
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
                Pilih gender, standar frame pixel art terkunci, dan unggah action sheet terverifikasi.
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

                {/* Standar Ukuran Frame Baku (Terkunci / Non-Dinamis) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-emerald-400" />
                      Standar Dimensi Frame (Terkunci)
                    </label>
                    <span className="text-[10px] font-mono text-slate-500">
                      Wajib 4 Baris (Tinggi {frameSize * 4}px)
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFrameSize(64)}
                      className={`flex flex-col items-start p-3 rounded-lg border text-left transition-all ${
                        frameSize === 64
                          ? 'border-sky-500 bg-sky-950/30 text-white'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-semibold text-xs text-sky-400">64 × 64 px (Standar HD)</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 font-mono">
                          Rekomendasi
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 mt-1">
                        Standar Paperdoll & Equipments (Resolusi 256×256 px untuk 4×4 frames)
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFrameSize(32)}
                      className={`flex flex-col items-start p-3 rounded-lg border text-left transition-all ${
                        frameSize === 32
                          ? 'border-sky-500 bg-sky-950/30 text-white'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-semibold text-xs text-slate-200">32 × 32 px (Standar Retro)</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800 font-mono">
                          Classic
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 mt-1">
                        Format sprite Novice dasar (Resolusi 128×128 px untuk 4×4 frames)
                      </span>
                    </button>
                  </div>
                </div>

                {/* Frame Rate Animation Speed */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-slate-300">Animation Playback Speed (FPS)</label>
                    <span className="text-[11px] font-mono text-sky-400">{frameRate} FPS</span>
                  </div>
                  <Input
                    type="range"
                    min={4}
                    max={16}
                    step={1}
                    value={frameRate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFrameRate(Number(e.target.value))}
                    className="accent-sky-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-slate-500">
                    <span>4 FPS (Lambat)</span>
                    <span>8 FPS (Standar)</span>
                    <span>16 FPS (Cepat)</span>
                  </div>
                </div>

                {/* Upload Action Sheets dengan Auto-Validation */}
                <div className="space-y-3 pt-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-sky-400" /> Action Spritesheets (Auto-Validated)
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3" /> Auto-Check Aktif
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div
                      className={`p-1.5 rounded-lg transition-colors ${
                        previewAction === 'idle' ? 'bg-sky-950/20 ring-1 ring-sky-500/50' : ''
                      }`}
                      onClick={() => setPreviewAction('idle')}
                    >
                      <SingleSpriteUploader
                        label="1. Idle Action (Wajib)"
                        folder="characters"
                        value={idleUrl}
                        onChange={setIdleUrl}
                        validateProfile="character"
                        targetFrameSize={frameSize}
                        onValidated={setIdleValidation}
                      />
                    </div>

                    <div
                      className={`p-1.5 rounded-lg transition-colors ${
                        previewAction === 'walk' ? 'bg-sky-950/20 ring-1 ring-sky-500/50' : ''
                      }`}
                      onClick={() => setPreviewAction('walk')}
                    >
                      <SingleSpriteUploader
                        label="2. Walk Action (Opsional)"
                        folder="characters"
                        value={walkUrl}
                        onChange={setWalkUrl}
                        validateProfile="character"
                        targetFrameSize={frameSize}
                        onValidated={setWalkValidation}
                      />
                    </div>

                    <div
                      className={`p-1.5 rounded-lg transition-colors ${
                        previewAction === 'attack' ? 'bg-sky-950/20 ring-1 ring-sky-500/50' : ''
                      }`}
                      onClick={() => setPreviewAction('attack')}
                    >
                      <SingleSpriteUploader
                        label="3. Attack Action (Opsional)"
                        folder="characters"
                        value={attackUrl}
                        onChange={setAttackUrl}
                        validateProfile="character"
                        targetFrameSize={frameSize}
                        onValidated={setAttackValidation}
                      />
                    </div>

                    <div
                      className={`p-1.5 rounded-lg transition-colors ${
                        previewAction === 'die' ? 'bg-sky-950/20 ring-1 ring-sky-500/50' : ''
                      }`}
                      onClick={() => setPreviewAction('die')}
                    >
                      <SingleSpriteUploader
                        label="4. Die / Dead Action (Opsional)"
                        folder="characters"
                        value={dieUrl}
                        onChange={setDieUrl}
                        validateProfile="character"
                        targetFrameSize={frameSize}
                        onValidated={setDieValidation}
                      />
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={createMutation.isPending || !idleUrl}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium mt-4 cursor-pointer"
                >
                  {createMutation.isPending ? 'Menyimpan...' : 'Simpan Konfigurasi Karakter'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Live Preview & Inspector (Col 5) */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="border-slate-800 bg-slate-900/70">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-400" /> Live Spritesheet Inspector
                </CardTitle>
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[10px]">
                  {(['idle', 'walk', 'attack', 'die'] as const).map((action) => (
                    <button
                      key={action}
                      type="button"
                      onClick={() => setPreviewAction(action)}
                      className={`px-2 py-0.5 rounded capitalize font-medium transition-all ${
                        previewAction === action
                          ? 'bg-sky-500 text-slate-950 font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {action}
                    </button>
                  ))}
                </div>
              </div>
              <CardDescription className="text-xs">
                Memotong frame live 8 arah mata angin (termasuk serong) dan memeriksa kecocokan rasio grid {frameSize}x{frameSize}px.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {activePreviewUrl ? (
                <CharacterSpritePreview
                  sheetUrl={activePreviewUrl}
                  frameWidth={frameSize}
                  frameHeight={frameSize}
                  frameRate={frameRate}
                  scale={frameSize === 32 ? 3 : 2}
                  validationResult={activeValidation}
                />
              ) : (
                <div className="h-48 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 text-xs text-slate-500 p-6 text-center gap-2">
                  <Info className="h-5 w-5 text-slate-600" />
                  <span>Pilih atau unggah spritesheet <strong>{previewAction.toUpperCase()}</strong> untuk melihat inspeksi live preview.</span>
                </div>
              )}

              {/* Ketentuan Spesifikasi Input */}
              <div className="text-[11px] text-slate-400 bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-2">
                <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" /> Standar Baku Spritesheet Karakter:
                </div>
                <ul className="space-y-1 text-slate-400 list-disc list-inside">
                  <li>Format berkas <strong>PNG 32-bit (RGBA)</strong> dengan background transparan.</li>
                  <li>
                    Tinggi berkas: <strong>{frameSize * 8}px</strong> (8 arah lengkap termasuk serong) atau <strong>{frameSize * 4}px</strong> (4 arah kardinal).
                  </li>
                  <li>
                    Urutan 8 Arah (Clockwise): Bawah, Kiri Bawah, Kiri, Kiri Atas, Atas, Kanan Atas, Kanan, Kanan Bawah.
                  </li>
                  <li>
                    Lebar berkas <strong>wajib kelipatan {frameSize}px</strong> (minimal 3 frame, optimal 4 frame).
                  </li>
                </ul>

                {/* Tombol Copy Prompt AI Generator */}
                <div className="pt-2.5 border-t border-slate-800/80 flex flex-col gap-1.5">
                  <div className="text-[10px] text-slate-300 font-semibold flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-amber-400" /> Salin Prompt untuk AI Generator:
                    </span>
                    <span className="font-mono text-slate-500">Midjourney / SD / DALL-E</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyModePrompt(8)}
                      className="py-1 px-2.5 rounded bg-slate-900 hover:bg-sky-950 text-[10px] font-mono text-sky-400 border border-slate-800 hover:border-sky-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                    >
                      {copiedMode === 8 ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      {copiedMode === 8 ? 'Tersalin!' : 'Copy Prompt 8-Arah (512px)'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyModePrompt(4)}
                      className="py-1 px-2.5 rounded bg-slate-900 hover:bg-sky-950 text-[10px] font-mono text-slate-300 hover:text-sky-300 border border-slate-800 hover:border-sky-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                    >
                      {copiedMode === 4 ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      {copiedMode === 4 ? 'Tersalin!' : 'Copy Prompt 4-Arah (256px)'}
                    </button>
                  </div>
                </div>
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
                      className="flex items-center justify-between p-2.5 rounded-lg border border-slate-800 bg-slate-950/50 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden">
                          {char.idleSheetUrl ? (
                            <img
                              src={char.idleSheetUrl}
                              alt={char.name}
                              className="w-full h-full object-contain"
                              style={{ imageRendering: 'pixelated' }}
                            />
                          ) : (
                            <User className="h-4 w-4 text-slate-500" />
                          )}
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                            {char.name}
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                                char.gender === 'M' ? 'bg-sky-950 text-sky-400' : 'bg-pink-950 text-pink-400'
                              }`}
                            >
                              {char.gender}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {char.frameWidth}x{char.frameHeight}px @ {char.frameRate}fps
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Hapus karakter "${char.name}"?`)) {
                            deleteMutation.mutate(char.id)
                          }
                        }}
                        disabled={deleteMutation.isPending}
                        className="p-1.5 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
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
