import React, { useEffect, useRef, useState } from 'react'
import {
  Play,
  Pause,
  RotateCcw,
  Eye,
  Grid,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDownLeft,
  ArrowDownRight,
  ArrowUpLeft,
  ArrowUpRight,
  Maximize2,
  Compass,
} from 'lucide-react'
import type { SpriteValidationResult } from '../../lib/character-sprite-validator'

interface CharacterSpritePreviewProps {
  sheetUrl: string
  frameWidth: number
  frameHeight: number
  frameRate?: number
  scale?: number
  validationResult?: SpriteValidationResult | null
}

export type Direction8 =
  | 'down'
  | 'down_left'
  | 'left'
  | 'up_left'
  | 'up'
  | 'up_right'
  | 'right'
  | 'down_right'

const DIRECTION_ROWS_8: Record<Direction8, { row: number; label: string; icon: React.ReactNode }> = {
  down: { row: 0, label: 'Bawah (S)', icon: <ArrowDown className="h-3.5 w-3.5" /> },
  down_left: { row: 1, label: 'Kiri Bawah (SW)', icon: <ArrowDownLeft className="h-3.5 w-3.5" /> },
  left: { row: 2, label: 'Kiri (W)', icon: <ArrowLeft className="h-3.5 w-3.5" /> },
  up_left: { row: 3, label: 'Kiri Atas (NW)', icon: <ArrowUpLeft className="h-3.5 w-3.5" /> },
  up: { row: 4, label: 'Atas (N)', icon: <ArrowUp className="h-3.5 w-3.5" /> },
  up_right: { row: 5, label: 'Kanan Atas (NE)', icon: <ArrowUpRight className="h-3.5 w-3.5" /> },
  right: { row: 6, label: 'Kanan (E)', icon: <ArrowRight className="h-3.5 w-3.5" /> },
  down_right: { row: 7, label: 'Kanan Bawah (SE)', icon: <ArrowDownRight className="h-3.5 w-3.5" /> },
}

const DIRECTION_ROWS_4: Record<string, { row: number; label: string; icon: React.ReactNode }> = {
  down: { row: 0, label: 'Bawah (S)', icon: <ArrowDown className="h-3.5 w-3.5" /> },
  left: { row: 1, label: 'Kiri (W)', icon: <ArrowLeft className="h-3.5 w-3.5" /> },
  right: { row: 2, label: 'Kanan (E)', icon: <ArrowRight className="h-3.5 w-3.5" /> },
  up: { row: 3, label: 'Atas (N)', icon: <ArrowUp className="h-3.5 w-3.5" /> },
}

export const CharacterSpritePreview: React.FC<CharacterSpritePreviewProps> = ({
  sheetUrl,
  frameWidth = 64,
  frameHeight = 64,
  frameRate = 8,
  scale: initialScale = 2,
  validationResult,
}) => {
  const animCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const fullGridCanvasRef = useRef<HTMLCanvasElement | null>(null)

  const [activeTab, setActiveTab] = useState<'animated' | 'grid'>('animated')
  const [selectedDir, setSelectedDir] = useState<Direction8>('down')
  const [isPlaying, setIsPlaying] = useState<boolean>(true)
  const [scale, setScale] = useState<number>(initialScale)
  const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(0)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [imageMeta, setImageMeta] = useState<{ width: number; height: number; cols: number; rows: number } | null>(null)

  const imgRef = useRef<HTMLImageElement | null>(null)

  const isEightDir = (imageMeta?.rows ?? 4) >= 8
  const currentDirMapping = isEightDir ? DIRECTION_ROWS_8 : DIRECTION_ROWS_4

  // 1. Muat Berkas Gambar
  useEffect(() => {
    if (!sheetUrl) return
    setLoadError(null)

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = sheetUrl

    img.onload = () => {
      const w = img.naturalWidth || img.width
      const h = img.naturalHeight || img.height
      const cols = Math.max(1, Math.floor(w / (frameWidth || 64)))
      const rows = Math.max(1, Math.floor(h / (frameHeight || 64)))
      imgRef.current = img
      setImageMeta({ width: w, height: h, cols, rows })
    }

    img.onerror = () => {
      setLoadError(`Gagal memuat berkas spritesheet dari: ${sheetUrl}`)
    }
  }, [sheetUrl, frameWidth, frameHeight])

  // 2. Loop Animasi Interaktif (Live Animated Canvas)
  useEffect(() => {
    if (activeTab !== 'animated' || !imgRef.current || !isPlaying) return

    const canvas = animCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.imageSmoothingEnabled = false // Pixel art tajam

    const img = imgRef.current
    const w = img.naturalWidth || img.width
    const h = img.naturalHeight || img.height
    const cols = Math.max(1, Math.floor(w / frameWidth))
    const row = currentDirMapping[selectedDir]?.row ?? 0

    let frame = 0
    const interval = setInterval(() => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const sx = frame * frameWidth
      const sy = row * frameHeight
      const sw = Math.min(frameWidth, w - sx)
      const sh = Math.min(frameHeight, h - sy)

      const dw = frameWidth * scale
      const dh = frameHeight * scale
      const dx = (canvas.width - dw) / 2
      const dy = (canvas.height - dh) / 2

      if (sw > 0 && sh > 0) {
        ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)
      }

      setCurrentFrameIndex(frame)
      frame = (frame + 1) % cols
    }, 1000 / Math.max(1, frameRate))

    return () => clearInterval(interval)
  }, [activeTab, selectedDir, isPlaying, scale, frameRate, frameWidth, frameHeight, imageMeta, currentDirMapping])

  // 3. Grid Slicer Overlay View (Full Sheet dengan Bounding Box & Frame Index)
  useEffect(() => {
    if (activeTab !== 'grid' || !imgRef.current) return

    const canvas = fullGridCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.imageSmoothingEnabled = false

    const img = imgRef.current
    const w = img.naturalWidth || img.width
    const h = img.naturalHeight || img.height
    const cols = Math.max(1, Math.floor(w / frameWidth))
    const rows = Math.max(1, Math.floor(h / frameHeight))

    canvas.width = w
    canvas.height = h

    ctx.clearRect(0, 0, w, h)
    ctx.drawImage(img, 0, 0)

    ctx.lineWidth = 1
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)'

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * frameWidth
        const y = r * frameHeight

        ctx.strokeRect(x + 0.5, y + 0.5, frameWidth - 1, frameHeight - 1)

        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)'
        ctx.fillRect(x + 2, y + 2, 18, 11)

        ctx.fillStyle = '#38bdf8'
        ctx.font = '9px monospace'
        const frameNum = r * cols + c
        ctx.fillText(`${frameNum}`, x + 4, y + 10)
      }
    }
  }, [activeTab, frameWidth, frameHeight, imageMeta])

  return (
    <div className="flex flex-col rounded-xl border border-slate-800 bg-slate-950/80 overflow-hidden shadow-xl">
      {/* Header Mode Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/60 px-3 py-2 text-xs">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('animated')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
              activeTab === 'animated'
                ? 'bg-sky-600/20 text-sky-400 border border-sky-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Eye className="h-3.5 w-3.5" /> Animasi Live ({isEightDir ? '8 Arah' : '4 Arah'})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('grid')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
              activeTab === 'grid'
                ? 'bg-sky-600/20 text-sky-400 border border-sky-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Grid className="h-3.5 w-3.5" /> Grid Slicer Inspector
          </button>
        </div>

        {/* Zoom Scale Picker */}
        <div className="flex items-center gap-1 text-[11px] text-slate-400">
          <Maximize2 className="h-3 w-3" />
          <span className="font-mono">Zoom:</span>
          {[1, 2, 3].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setScale(s)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-all cursor-pointer ${
                scale === s ? 'bg-sky-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* Main Canvas Viewport */}
      <div className="relative flex flex-col items-center justify-center p-4 min-h-[220px] bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]">
        {loadError ? (
          <div className="flex items-center gap-2 p-3 text-xs text-rose-400 bg-rose-950/40 border border-rose-900/60 rounded-lg">
            <XCircle className="h-4 w-4 shrink-0" />
            <span>{loadError}</span>
          </div>
        ) : activeTab === 'animated' ? (
          <div className="flex flex-col items-center gap-3">
            <canvas
              ref={animCanvasRef}
              width={frameWidth * scale + 48}
              height={frameHeight * scale + 48}
              className="rounded-lg border border-slate-800 bg-slate-900/50 shadow-inner"
              style={{ imageRendering: 'pixelated' }}
            />

            {/* D-PAD 8 ARAH MATA ANGIN INTERAKTIF */}
            <div className="flex flex-col items-center gap-1.5 w-full max-w-[200px]">
              <div className="grid grid-cols-3 gap-1 w-full">
                {/* Baris 1: NW, N, NE */}
                <button
                  type="button"
                  disabled={!isEightDir}
                  onClick={() => setSelectedDir('up_left')}
                  className={`p-1.5 rounded flex items-center justify-center text-xs transition-all ${
                    selectedDir === 'up_left'
                      ? 'bg-sky-500 text-slate-950 font-bold shadow'
                      : !isEightDir
                        ? 'opacity-25 bg-slate-950 border border-slate-900 cursor-not-allowed'
                        : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white cursor-pointer'
                  }`}
                  title="Kiri Atas (NW)"
                >
                  <ArrowUpLeft className="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedDir('up')}
                  className={`p-1.5 rounded flex items-center justify-center text-xs transition-all cursor-pointer ${
                    selectedDir === 'up'
                      ? 'bg-sky-500 text-slate-950 font-bold shadow'
                      : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
                  }`}
                  title="Atas (N)"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  disabled={!isEightDir}
                  onClick={() => setSelectedDir('up_right')}
                  className={`p-1.5 rounded flex items-center justify-center text-xs transition-all ${
                    selectedDir === 'up_right'
                      ? 'bg-sky-500 text-slate-950 font-bold shadow'
                      : !isEightDir
                        ? 'opacity-25 bg-slate-950 border border-slate-900 cursor-not-allowed'
                        : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white cursor-pointer'
                  }`}
                  title="Kanan Atas (NE)"
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </button>

                {/* Baris 2: W, Indicator, E */}
                <button
                  type="button"
                  onClick={() => setSelectedDir('left')}
                  className={`p-1.5 rounded flex items-center justify-center text-xs transition-all cursor-pointer ${
                    selectedDir === 'left'
                      ? 'bg-sky-500 text-slate-950 font-bold shadow'
                      : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
                  }`}
                  title="Kiri (W)"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                </button>

                <div className="flex items-center justify-center text-[10px] font-mono text-sky-400 bg-slate-900/60 rounded border border-slate-800">
                  <Compass className="h-3.5 w-3.5" />
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedDir('right')}
                  className={`p-1.5 rounded flex items-center justify-center text-xs transition-all cursor-pointer ${
                    selectedDir === 'right'
                      ? 'bg-sky-500 text-slate-950 font-bold shadow'
                      : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
                  }`}
                  title="Kanan (E)"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>

                {/* Baris 3: SW, S, SE */}
                <button
                  type="button"
                  disabled={!isEightDir}
                  onClick={() => setSelectedDir('down_left')}
                  className={`p-1.5 rounded flex items-center justify-center text-xs transition-all ${
                    selectedDir === 'down_left'
                      ? 'bg-sky-500 text-slate-950 font-bold shadow'
                      : !isEightDir
                        ? 'opacity-25 bg-slate-950 border border-slate-900 cursor-not-allowed'
                        : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white cursor-pointer'
                  }`}
                  title="Kiri Bawah (SW)"
                >
                  <ArrowDownLeft className="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedDir('down')}
                  className={`p-1.5 rounded flex items-center justify-center text-xs transition-all cursor-pointer ${
                    selectedDir === 'down'
                      ? 'bg-sky-500 text-slate-950 font-bold shadow'
                      : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
                  }`}
                  title="Bawah (S)"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  disabled={!isEightDir}
                  onClick={() => setSelectedDir('down_right')}
                  className={`p-1.5 rounded flex items-center justify-center text-xs transition-all ${
                    selectedDir === 'down_right'
                      ? 'bg-sky-500 text-slate-950 font-bold shadow'
                      : !isEightDir
                        ? 'opacity-25 bg-slate-950 border border-slate-900 cursor-not-allowed'
                        : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white cursor-pointer'
                  }`}
                  title="Kanan Bawah (SE)"
                >
                  <ArrowDownRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="text-[10px] font-mono text-slate-400 capitalize">
                {selectedDir.replace('_', ' ')} (Baris {currentDirMapping[selectedDir]?.row ?? 0})
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-full overflow-auto p-2 rounded-lg border border-slate-800 bg-slate-900/80">
            <canvas ref={fullGridCanvasRef} style={{ imageRendering: 'pixelated', maxWidth: '100%' }} />
          </div>
        )}
      </div>

      {/* Playback Controls & Frame Status Bar */}
      <div className="flex items-center justify-between border-t border-slate-800 bg-slate-900/80 px-3 py-2 text-xs">
        <div className="flex items-center gap-2">
          {activeTab === 'animated' && (
            <>
              <button
                type="button"
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
                title={isPlaying ? 'Jeda' : 'Putar'}
              >
                {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCurrentFrameIndex(0)
                  setIsPlaying(false)
                }}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
                title="Reset Frame"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              <span className="text-[11px] font-mono text-slate-400">
                Frame: <strong className="text-sky-400">{currentFrameIndex + 1}</strong>/
                {imageMeta?.cols || 4}
              </span>
            </>
          )}
        </div>

        {/* Diagnostic Meta Info */}
        {imageMeta && (
          <div className="text-[11px] font-mono text-slate-400">
            {imageMeta.width}x{imageMeta.height}px ({imageMeta.cols}x{imageMeta.rows} frames • {isEightDir ? '8 Arah' : '4 Arah'})
          </div>
        )}
      </div>

      {/* Diagnostic Checklist Panel */}
      {validationResult && (
        <div className="border-t border-slate-800/80 bg-slate-950 p-3 space-y-2 text-xs">
          <div className="flex items-center justify-between font-semibold">
            <span className="text-slate-300">Hasil Pengecekan Standar Input</span>
            {validationResult.isValid ? (
              <span className="flex items-center gap-1 text-emerald-400 text-[11px]">
                <CheckCircle2 className="h-3.5 w-3.5" /> Lolos Standar Spritesheet ({validationResult.metadata?.directionMode === '8-dir' ? '8 Arah' : '4 Arah'})
              </span>
            ) : (
              <span className="flex items-center gap-1 text-rose-400 text-[11px]">
                <XCircle className="h-3.5 w-3.5" /> Ditolak (Tidak Sesuai Standar)
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 text-[11px]">
            {Object.entries(validationResult.checks).map(([key, check]) => (
              <div
                key={key}
                className={`flex items-start gap-1.5 p-1.5 rounded border ${
                  check.valid
                    ? 'border-emerald-950/60 bg-emerald-950/20 text-emerald-300/90'
                    : 'border-rose-950/60 bg-rose-950/20 text-rose-300/90'
                }`}
              >
                {check.valid ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 text-rose-400 shrink-0 mt-0.5" />
                )}
                <span className="leading-tight">{check.message}</span>
              </div>
            ))}
          </div>

          {validationResult.warnings.length > 0 && (
            <div className="space-y-1 pt-1">
              {validationResult.warnings.map((w, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[11px] text-amber-400 bg-amber-950/20 p-1.5 rounded border border-amber-900/40">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span>{w}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
