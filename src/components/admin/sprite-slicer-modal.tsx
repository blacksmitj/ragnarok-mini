import React, { useEffect, useRef, useState } from 'react'
import {
  X,
  Sliders,
  Eye,
  Check,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDownLeft,
  ArrowDownRight,
  ArrowUpLeft,
  ArrowUpRight,
  Info,
  Maximize2,
  Compass,
  Move,
  Copy,
} from 'lucide-react'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog'
import { generateSpritePrompt } from '../../lib/character-sprite-validator'

interface SpriteSlicerModalProps {
  isOpen: boolean
  file: File | null
  frameWidth: number
  frameHeight: number
  onConfirm: (croppedFile: File) => void
  onCancel: () => void
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

export const DIRECTION_ROWS_8: Record<Direction8, { row: number; label: string; icon: React.ReactNode }> = {
  down: { row: 0, label: 'Bawah (S)', icon: <ArrowDown className="h-3.5 w-3.5" /> },
  down_left: { row: 1, label: 'Kiri Bawah (SW)', icon: <ArrowDownLeft className="h-3.5 w-3.5" /> },
  left: { row: 2, label: 'Kiri (W)', icon: <ArrowLeft className="h-3.5 w-3.5" /> },
  up_left: { row: 3, label: 'Kiri Atas (NW)', icon: <ArrowUpLeft className="h-3.5 w-3.5" /> },
  up: { row: 4, label: 'Atas (N)', icon: <ArrowUp className="h-3.5 w-3.5" /> },
  up_right: { row: 5, label: 'Kanan Atas (NE)', icon: <ArrowUpRight className="h-3.5 w-3.5" /> },
  right: { row: 6, label: 'Kanan (E)', icon: <ArrowRight className="h-3.5 w-3.5" /> },
  down_right: { row: 7, label: 'Kanan Bawah (SE)', icon: <ArrowDownRight className="h-3.5 w-3.5" /> },
}

export const DIRECTION_ROWS_4: Record<string, { row: number; label: string; icon: React.ReactNode }> = {
  down: { row: 0, label: 'Bawah (S)', icon: <ArrowDown className="h-3.5 w-3.5" /> },
  left: { row: 1, label: 'Kiri (W)', icon: <ArrowLeft className="h-3.5 w-3.5" /> },
  right: { row: 2, label: 'Kanan (E)', icon: <ArrowRight className="h-3.5 w-3.5" /> },
  up: { row: 3, label: 'Atas (N)', icon: <ArrowUp className="h-3.5 w-3.5" /> },
}

export const SpriteSlicerModal: React.FC<SpriteSlicerModalProps> = ({
  isOpen,
  file,
  frameWidth = 64,
  frameHeight = 64,
  onConfirm,
  onCancel,
}) => {
  const mainCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const miniPreviewCanvasRef = useRef<HTMLCanvasElement | null>(null)

  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [imgDim, setImgDim] = useState<{ width: number; height: number }>({ width: 0, height: 0 })

  // Mode Jumlah Baris Arah (8 Arah Lengkap atau 4 Arah Kardinal)
  const [rowMode, setRowMode] = useState<8 | 4>(8)
  const rows = rowMode

  // Kontrol Skala Sumber Gambar (Image Scale Factor)
  const [imageScale, setImageScale] = useState<number>(1)

  // Kontrol Pemotongan & Grid Slicer
  const [offsetX, setOffsetX] = useState<number>(0)
  const [offsetY, setOffsetY] = useState<number>(0)
  const [cols, setCols] = useState<number>(4)
  const [spacingX, setSpacingX] = useState<number>(0)
  const [spacingY, setSpacingY] = useState<number>(0)

  // Fitur Grab & Drag Pemotong Langsung di Kanvas
  const [isDragging, setIsDragging] = useState<boolean>(false)
  const [isHoveringSelection, setIsHoveringSelection] = useState<boolean>(false)
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; initialOffsetX: number; initialOffsetY: number } | null>(null)

  // Tampilan & Preview
  const [zoom, setZoom] = useState<number>(1.5)
  const [previewDir, setPreviewDir] = useState<Direction8>('down')
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false)

  const handleCopyPrompt = () => {
    const promptText = generateSpritePrompt(rowMode, frameWidth, cols)
    navigator.clipboard.writeText(promptText)
    setCopiedPrompt(true)
    setTimeout(() => setCopiedPrompt(false), 2000)
  }

  // Mapping baris aktif sesuai mode
  const currentDirRows = rowMode === 8 ? DIRECTION_ROWS_8 : DIRECTION_ROWS_4

  // 1. Muat Berkas Gambar Asli ke In-Memory Image
  useEffect(() => {
    if (!isOpen || !file) {
      setImage(null)
      return
    }

    const objectUrl = URL.createObjectURL(file)
    const img = new Image()
    img.src = objectUrl

    img.onload = () => {
      const w = img.naturalWidth || img.width
      const h = img.naturalHeight || img.height
      setImage(img)
      setImgDim({ width: w, height: h })

      // Auto deteksi mode baris: Jika tinggi mendekati/lebih dari 8 baris, aktifkan 8 arah
      if (h >= frameHeight * 6) {
        setRowMode(8)
      } else {
        setRowMode(4)
      }

      const estimatedCols = Math.max(3, Math.min(8, Math.floor(w / frameWidth) || 4))
      setCols(estimatedCols)
      setOffsetX(0)
      setOffsetY(0)
      setSpacingX(0)
      setSpacingY(0)
      setImageScale(1)
    }

    return () => {
      URL.revokeObjectURL(objectUrl)
    }
  }, [isOpen, file, frameWidth, frameHeight])

  // 2. Render Main Canvas (Gambar Diskala + Dark Mask + Neon Slicer Lines + Grab Badge)
  useEffect(() => {
    if (!image || !mainCanvasRef.current) return

    const canvas = mainCanvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const scaledW = imgDim.width * imageScale
    const scaledH = imgDim.height * imageScale

    canvas.width = scaledW * zoom
    canvas.height = scaledH * zoom
    ctx.imageSmoothingEnabled = false // Pixel art sharp

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)

    const totalCropW = cols * frameWidth + (cols - 1) * spacingX
    const totalCropH = rows * frameHeight + (rows - 1) * spacingY

    const selX = offsetX * zoom
    const selY = offsetY * zoom
    const selW = totalCropW * zoom
    const selH = totalCropH * zoom

    // DARK MASK (Gelapkan area luar 70%)
    ctx.fillStyle = 'rgba(10, 15, 29, 0.70)'
    ctx.fillRect(0, 0, canvas.width, Math.max(0, selY))
    ctx.fillRect(0, selY + selH, canvas.width, Math.max(0, canvas.height - (selY + selH)))
    ctx.fillRect(0, selY, Math.max(0, selX), selH)
    ctx.fillRect(selX + selW, selY, Math.max(0, canvas.width - (selX + selW)), selH)

    // Kotak Luar Total Area Seleksi
    ctx.strokeStyle = isDragging ? '#34d399' : isHoveringSelection ? '#38bdf8' : '#0284c7'
    ctx.lineWidth = isDragging || isHoveringSelection ? 2.5 : 2
    ctx.setLineDash([])
    ctx.strokeRect(selX, selY, selW, selH)

    // GRAB HANDLE BADGE (Menandakan area bisa di-drag langsung)
    const badgeW = 148
    const badgeH = 18
    const badgeY = Math.max(0, selY - badgeH)
    ctx.fillStyle = isDragging ? '#059669' : isHoveringSelection ? '#0284c7' : 'rgba(15, 23, 42, 0.9)'
    ctx.fillRect(selX, badgeY, badgeW, badgeH)
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 9px sans-serif'
    ctx.fillText(
      isDragging ? '✊ SEDANG MENGGESER' : '✋ DRAG KOTAK UNTUK GESER',
      selX + 6,
      badgeY + 12
    )

    const activeRowIndex = currentDirRows[previewDir]?.row ?? 0

    // Gambar Kotak Grid Tiap Frame
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const fx = (offsetX + c * (frameWidth + spacingX)) * zoom
        const fy = (offsetY + r * (frameHeight + spacingY)) * zoom
        const fw = frameWidth * zoom
        const fh = frameHeight * zoom

        const isRowActive = r === activeRowIndex
        ctx.strokeStyle = isRowActive ? '#22d3ee' : 'rgba(56, 189, 248, 0.40)'
        ctx.lineWidth = isRowActive ? 1.5 : 1
        ctx.setLineDash([3, 2])
        ctx.strokeRect(fx, fy, fw, fh)

        // Nomor frame badge
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)'
        ctx.fillRect(fx + 2, fy + 2, 18, 12)
        ctx.fillStyle = '#38bdf8'
        ctx.font = 'bold 9px monospace'
        const frameIdx = r * cols + c + 1
        ctx.fillText(`${frameIdx}`, fx + 4, fy + 11)
      }

      // Label Arah Hadap pada sisi kiri baris
      const rowY = (offsetY + r * (frameHeight + spacingY)) * zoom
      const dirEntry = Object.entries(currentDirRows).find(([_, v]) => v.row === r)
      const dirLabel = dirEntry ? dirEntry[1].label : `Row ${r}`
      const isRowActive = r === activeRowIndex

      ctx.fillStyle = isRowActive ? '#0284c7' : 'rgba(15, 23, 42, 0.9)'
      ctx.fillRect(Math.max(2, selX - 82), rowY + 2, 78, 16)
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 9px sans-serif'
      ctx.fillText(dirLabel, Math.max(5, selX - 78), rowY + 13)
    }
  }, [image, imgDim, imageScale, offsetX, offsetY, cols, rows, spacingX, spacingY, zoom, previewDir, frameWidth, frameHeight, currentDirRows, isDragging, isHoveringSelection])

  // 3. Helper Konversi Posisi Mouse ke Koordinat Gambar Skala
  const getCanvasScaledCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = mainCanvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const canvasX = (e.clientX - rect.left) * scaleX
    const canvasY = (e.clientY - rect.top) * scaleY
    return { x: canvasX / zoom, y: canvasY / zoom }
  }

  // 4. Mouse Handlers untuk Grab & Drag Offset Langsung
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!image) return
    const { x, y } = getCanvasScaledCoords(e)

    const totalCropW = cols * frameWidth + (cols - 1) * spacingX
    const totalCropH = rows * frameHeight + (rows - 1) * spacingY

    const isInside =
      x >= offsetX &&
      x <= offsetX + totalCropW &&
      y >= Math.max(0, offsetY - 20) &&
      y <= offsetY + totalCropH

    if (isInside) {
      setIsDragging(true)
      dragStartRef.current = {
        mouseX: x,
        mouseY: y,
        initialOffsetX: offsetX,
        initialOffsetY: offsetY,
      }
    }
  }

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!image) return
    const { x, y } = getCanvasScaledCoords(e)

    const totalCropW = cols * frameWidth + (cols - 1) * spacingX
    const totalCropH = rows * frameHeight + (rows - 1) * spacingY

    if (isDragging && dragStartRef.current) {
      const dx = x - dragStartRef.current.mouseX
      const dy = y - dragStartRef.current.mouseY

      const rawNewX = Math.round(dragStartRef.current.initialOffsetX + dx)
      const rawNewY = Math.round(dragStartRef.current.initialOffsetY + dy)

      const maxOffsetX = Math.max(0, Math.round(imgDim.width * imageScale) - totalCropW)
      const maxOffsetY = Math.max(0, Math.round(imgDim.height * imageScale) - totalCropH)

      setOffsetX(Math.max(0, Math.min(rawNewX, maxOffsetX)))
      setOffsetY(Math.max(0, Math.min(rawNewY, maxOffsetY)))
    } else {
      const isInside =
        x >= offsetX &&
        x <= offsetX + totalCropW &&
        y >= Math.max(0, offsetY - 20) &&
        y <= offsetY + totalCropH

      setIsHoveringSelection(isInside)
    }
  }

  const handleCanvasMouseUp = () => {
    setIsDragging(false)
    dragStartRef.current = null
  }

  // 5. Mini Live Preview Loop
  useEffect(() => {
    if (!image || !miniPreviewCanvasRef.current) return

    const canvas = miniPreviewCanvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = 96
    canvas.height = 96
    ctx.imageSmoothingEnabled = false

    const r = currentDirRows[previewDir]?.row ?? 0
    let frame = 0

    const interval = setInterval(() => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const sx = (offsetX + frame * (frameWidth + spacingX)) / imageScale
      const sy = (offsetY + r * (frameHeight + spacingY)) / imageScale
      const sw = frameWidth / imageScale
      const sh = frameHeight / imageScale

      const dw = 64
      const dh = 64
      const dx = (canvas.width - dw) / 2
      const dy = (canvas.height - dh) / 2

      if (sx + sw <= imgDim.width + 1 && sy + sh <= imgDim.height + 1 && sw > 0 && sh > 0) {
        ctx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh)
      }

      frame = (frame + 1) % cols
    }, 125)

    return () => clearInterval(interval)
  }, [image, imgDim, imageScale, offsetX, offsetY, cols, spacingX, spacingY, previewDir, frameWidth, frameHeight, currentDirRows])

  // 6. Eksekusi Client-Side Auto-Crop & Export Bersih ke PNG Baru
  const handleConfirmCrop = async () => {
    if (!image || !file) return
    setIsProcessing(true)

    try {
      const outputW = cols * frameWidth
      const outputH = rows * frameHeight

      const cropCanvas = document.createElement('canvas')
      cropCanvas.width = outputW
      cropCanvas.height = outputH
      const ctx = cropCanvas.getContext('2d')
      if (!ctx) throw new Error('Gagal menginisialisasi context canvas pemotong')

      ctx.imageSmoothingEnabled = false

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const sx = (offsetX + c * (frameWidth + spacingX)) / imageScale
          const sy = (offsetY + r * (frameHeight + spacingY)) / imageScale
          const sw = frameWidth / imageScale
          const sh = frameHeight / imageScale

          const dx = c * frameWidth
          const dy = r * frameHeight

          ctx.drawImage(image, sx, sy, sw, sh, dx, dy, frameWidth, frameHeight)
        }
      }

      cropCanvas.toBlob((blob) => {
        if (!blob) {
          alert('Gagal mengekspor hasil potongan spritesheet.')
          setIsProcessing(false)
          return
        }

        const scaleTag = imageScale !== 1 ? `_${Math.round(imageScale * 100)}pct` : ''
        const modeTag = rows === 8 ? '_8dir' : '_4dir'
        const newFileName =
          file.name.replace(/\.[^/.]+$/, '') + `_sliced${modeTag}${scaleTag}_${outputW}x${outputH}.png`
        const croppedFile = new File([blob], newFileName, { type: 'image/png' })
        onConfirm(croppedFile)
        setIsProcessing(false)
      }, 'image/png')
    } catch (err: any) {
      alert(`Gagal memotong gambar: ${err.message}`)
      setIsProcessing(false)
    }
  }

  if (!isOpen || !file) return null

  const scaledW = Math.round(imgDim.width * imageScale)
  const scaledH = Math.round(imgDim.height * imageScale)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onCancel() }}>
      <DialogContent
        showCloseButton={false}
        className="!w-[96vw] !max-w-[96vw] !h-[94vh] !max-h-[94vh] p-0 flex flex-col bg-slate-900 border-slate-800 rounded-2xl overflow-hidden shadow-2xl"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-800 bg-slate-950/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                Sprite Slicer Studio (Mendukung 8 Arah Serong & Grab Offset)
                <span className="text-[11px] font-mono font-normal text-sky-400 bg-sky-950 px-2 py-0.5 rounded border border-sky-800">
                  {frameWidth}x{frameHeight}px • {rowMode === 8 ? '8 Arah Isometrik (512px)' : '4 Arah Kardinal (256px)'}
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Klik & drag kotak pemotong langsung pada kanvas, atur skala, dan potong animasi secara presisi.
              </DialogDescription>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body: Split 2 Kolom (Canvas Viewport 8 cols, Kontrol Slicer 4 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden min-h-[420px]">
          {/* Sisi Kiri: Canvas Viewport dengan Scroll, Zoom, & Grab-to-Move */}
          <div className="lg:col-span-8 relative flex flex-col bg-slate-950/90 border-r border-slate-800 p-4 overflow-hidden">
            <div className="flex items-center justify-between mb-2 shrink-0">
              <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                <span>
                  Asli: <strong className="text-white">{imgDim.width}x{imgDim.height}px</strong>
                </span>
                {imageScale !== 1 && (
                  <span className="text-emerald-400 bg-emerald-950/40 px-1.5 py-0.2 rounded border border-emerald-900">
                    Diskala: {scaledW}x{scaledH}px ({Math.round(imageScale * 100)}%)
                  </span>
                )}
                <span className="text-sky-400 bg-sky-950/60 px-1.5 py-0.2 rounded border border-sky-900 flex items-center gap-1 font-sans text-[10px]">
                  <Move className="h-3 w-3" /> Grab-to-Move Aktif
                </span>
              </div>

              {/* Viewport Camera Zoom Controls */}
              <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 px-2 py-1 rounded-lg text-xs">
                <span className="text-[10px] text-slate-500 mr-1 font-sans">Kamera:</span>
                <button
                  type="button"
                  onClick={() => setZoom(Math.max(1, zoom - 0.25))}
                  className="p-1 hover:text-white text-slate-400 cursor-pointer"
                  title="Zoom Out Kamera"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </button>
                <span className="font-mono text-sky-400 text-[11px] px-1">{zoom.toFixed(2)}x</span>
                <button
                  type="button"
                  onClick={() => setZoom(Math.min(4, zoom + 0.25))}
                  className="p-1 hover:text-white text-slate-400 cursor-pointer"
                  title="Zoom In Kamera"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Scrollable Canvas Container */}
            <div className="flex-1 overflow-auto rounded-xl border border-slate-800 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] p-4 flex items-center justify-center">
              <canvas
                ref={mainCanvasRef}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
                style={{
                  imageRendering: 'pixelated',
                  maxWidth: 'none',
                  cursor: isDragging ? 'grabbing' : isHoveringSelection ? 'grab' : 'crosshair',
                }}
                className="shadow-2xl rounded select-none"
              />
            </div>

            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
              <div className="flex items-center gap-1">
                <Info className="h-3.5 w-3.5 shrink-0 text-sky-400" />
                <span>
                  💡 <strong>Tips:</strong> Klik & tahan kotak pemotong neon di atas untuk menggeser offset posisi secara langsung!
                </span>
              </div>
              <span className="font-mono text-slate-400">
                Offset: <strong className="text-sky-400">{offsetX}px, {offsetY}px</strong>
              </span>
            </div>
          </div>

          {/* Sisi Kanan: Panel Kontrol Slicer, Skala, & D-Pad 8 Arah */}
          <div className="lg:col-span-4 flex flex-col justify-between p-5 bg-slate-900/60 overflow-y-auto space-y-4">
            <div className="space-y-4">
              {/* Header Kontrol dengan Tombol Reset */}
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5 uppercase tracking-wider">
                  <Sliders className="h-3.5 w-3.5 text-sky-400" /> Kontrol Pemotongan
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setOffsetX(0)
                    setOffsetY(0)
                    setSpacingX(0)
                    setSpacingY(0)
                    setImageScale(1)
                  }}
                  className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-sky-400 transition-colors cursor-pointer"
                  title="Reset Semua Pengaturan"
                >
                  <RotateCcw className="h-3 w-3" /> Reset
                </button>
              </div>

              {/* PILIHAN MODE BARIS: 8 ARAH LENGKAP vs 4 ARAH KARDINAL & COPY PROMPT */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Compass className="h-3.5 w-3.5 text-sky-400" /> Mode Arah Mata Angin
                  </label>
                  <button
                    type="button"
                    onClick={handleCopyPrompt}
                    className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-slate-950 hover:bg-sky-950/80 text-sky-400 border border-slate-800 hover:border-sky-700 transition-all cursor-pointer shadow-sm"
                    title="Salin template prompt AI generator untuk mode ini"
                  >
                    {copiedPrompt ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-400" />
                        <span className="text-emerald-400 font-bold">Prompt Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3 text-sky-400" />
                        <span>Salin Prompt AI ({rowMode} Arah)</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRowMode(8)
                      if (!DIRECTION_ROWS_8[previewDir]) setPreviewDir('down')
                    }}
                    className={`py-2 px-3 rounded-lg border text-left transition-all cursor-pointer ${
                      rowMode === 8
                        ? 'border-sky-500 bg-sky-950/40 text-white font-semibold shadow'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="text-xs text-sky-400">8 Arah Lengkap</div>
                    <div className="text-[10px] text-slate-400 font-mono">8 Baris (512px) • Termasuk Serong</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRowMode(4)
                      if (!DIRECTION_ROWS_4[previewDir]) setPreviewDir('down')
                    }}
                    className={`py-2 px-3 rounded-lg border text-left transition-all cursor-pointer ${
                      rowMode === 4
                        ? 'border-sky-500 bg-sky-950/40 text-white font-semibold shadow'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="text-xs text-slate-200">4 Arah Kardinal</div>
                    <div className="text-[10px] text-slate-400 font-mono">4 Baris (256px) • Retro Standar</div>
                  </button>
                </div>
              </div>

              {/* FITUR SCALE SUMBER GAMBAR */}
              <div className="rounded-xl border border-sky-900/40 bg-sky-950/20 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-sky-300 flex items-center gap-1.5">
                    <Maximize2 className="h-3.5 w-3.5 text-sky-400" /> Skala Gambar (Image Scale)
                  </label>
                  <span className="font-mono text-xs font-bold text-sky-400">
                    {Math.round(imageScale * 100)}% ({imageScale.toFixed(2)}x)
                  </span>
                </div>

                <input
                  type="range"
                  min={0.25}
                  max={3.0}
                  step={0.05}
                  value={imageScale}
                  onChange={(e) => setImageScale(Number(e.target.value))}
                  className="w-full accent-sky-500 cursor-pointer"
                />

                <div className="grid grid-cols-5 gap-1 pt-1">
                  {[0.5, 0.75, 1.0, 1.5, 2.0].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setImageScale(s)}
                      className={`py-1 rounded text-[10px] font-mono transition-all cursor-pointer ${
                        imageScale === s
                          ? 'bg-sky-500 text-slate-950 font-bold shadow'
                          : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Offset X & Offset Y (Bisa digeser lewat Slider ATAU langsung di-grab di Kanvas) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-300">
                  <span className="flex items-center gap-1">
                    <Move className="h-3 w-3 text-sky-400" /> Posisi Offset (Grab / Slider)
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400">
                    X: {offsetX}px | Y: {offsetY}px
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <label>Offset X</label>
                      <span className="font-mono text-sky-400">{offsetX}px</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={Math.max(64, scaledW - frameWidth)}
                      value={offsetX}
                      onChange={(e) => setOffsetX(Number(e.target.value))}
                      className="w-full accent-sky-500 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <label>Offset Y</label>
                      <span className="font-mono text-sky-400">{offsetY}px</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={Math.max(64, scaledH - frameHeight * rows)}
                      value={offsetY}
                      onChange={(e) => setOffsetY(Number(e.target.value))}
                      className="w-full accent-sky-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Jumlah Kolom Frame (3 - 8 cols) */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] text-slate-300">
                  <label>Jumlah Kolom Frame</label>
                  <span className="font-mono text-sky-400 font-bold">{cols} Frame</span>
                </div>
                <div className="grid grid-cols-6 gap-1">
                  {[3, 4, 5, 6, 7, 8].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCols(c)}
                      className={`py-1 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                        cols === c
                          ? 'bg-sky-500 text-slate-950 shadow'
                          : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mini Live Preview Loop & D-PAD 8 ARAH INTERAKTIF */}
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <Eye className="h-3.5 w-3.5 text-amber-400" /> Mini Live Preview (8 Arah)
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">8 FPS</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-20 h-20 rounded-lg border border-slate-800 bg-slate-900/60 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                    <canvas ref={miniPreviewCanvasRef} style={{ imageRendering: 'pixelated' }} />
                  </div>

                  {/* D-Pad 8 Arah (3x3 Grid Matrix) */}
                  <div className="grid grid-cols-3 gap-1 flex-1">
                    <button
                      type="button"
                      disabled={rowMode === 4}
                      onClick={() => setPreviewDir('up_left')}
                      className={`p-1.5 rounded flex items-center justify-center text-xs transition-all ${
                        previewDir === 'up_left'
                          ? 'bg-sky-500 text-slate-950 font-bold shadow'
                          : rowMode === 4
                            ? 'opacity-25 bg-slate-950 border border-slate-900 cursor-not-allowed'
                            : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white cursor-pointer'
                      }`}
                      title="Kiri Atas (NW)"
                    >
                      <ArrowUpLeft className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setPreviewDir('up')}
                      className={`p-1.5 rounded flex items-center justify-center text-xs transition-all cursor-pointer ${
                        previewDir === 'up'
                          ? 'bg-sky-500 text-slate-950 font-bold shadow'
                          : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
                      }`}
                      title="Atas (N)"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      disabled={rowMode === 4}
                      onClick={() => setPreviewDir('up_right')}
                      className={`p-1.5 rounded flex items-center justify-center text-xs transition-all ${
                        previewDir === 'up_right'
                          ? 'bg-sky-500 text-slate-950 font-bold shadow'
                          : rowMode === 4
                            ? 'opacity-25 bg-slate-950 border border-slate-900 cursor-not-allowed'
                            : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white cursor-pointer'
                      }`}
                      title="Kanan Atas (NE)"
                    >
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setPreviewDir('left')}
                      className={`p-1.5 rounded flex items-center justify-center text-xs transition-all cursor-pointer ${
                        previewDir === 'left'
                          ? 'bg-sky-500 text-slate-950 font-bold shadow'
                          : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
                      }`}
                      title="Kiri (W)"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </button>

                    <div className="flex items-center justify-center text-[10px] font-mono text-sky-400 bg-slate-900/50 rounded border border-slate-800/80">
                      8-Dir
                    </div>

                    <button
                      type="button"
                      onClick={() => setPreviewDir('right')}
                      className={`p-1.5 rounded flex items-center justify-center text-xs transition-all cursor-pointer ${
                        previewDir === 'right'
                          ? 'bg-sky-500 text-slate-950 font-bold shadow'
                          : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
                      }`}
                      title="Kanan (E)"
                    >
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      disabled={rowMode === 4}
                      onClick={() => setPreviewDir('down_left')}
                      className={`p-1.5 rounded flex items-center justify-center text-xs transition-all ${
                        previewDir === 'down_left'
                          ? 'bg-sky-500 text-slate-950 font-bold shadow'
                          : rowMode === 4
                            ? 'opacity-25 bg-slate-950 border border-slate-900 cursor-not-allowed'
                            : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white cursor-pointer'
                      }`}
                      title="Kiri Bawah (SW)"
                    >
                      <ArrowDownLeft className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setPreviewDir('down')}
                      className={`p-1.5 rounded flex items-center justify-center text-xs transition-all cursor-pointer ${
                        previewDir === 'down'
                          ? 'bg-sky-500 text-slate-950 font-bold shadow'
                          : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
                      }`}
                      title="Bawah (S)"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      disabled={rowMode === 4}
                      onClick={() => setPreviewDir('down_right')}
                      className={`p-1.5 rounded flex items-center justify-center text-xs transition-all ${
                        previewDir === 'down_right'
                          ? 'bg-sky-500 text-slate-950 font-bold shadow'
                          : rowMode === 4
                            ? 'opacity-25 bg-slate-950 border border-slate-900 cursor-not-allowed'
                            : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white cursor-pointer'
                      }`}
                      title="Kanan Bawah (SE)"
                    >
                      <ArrowDownRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="text-[10px] text-center font-mono text-slate-400">
                  Arah Aktif: <strong className="text-sky-400 capitalize">{previewDir.replace('_', ' ')}</strong> (Baris {currentDirRows[previewDir]?.row ?? 0})
                </div>
              </div>
            </div>

            {/* Tombol Aksi Modal */}
            <div className="space-y-2 pt-3 border-t border-slate-800 shrink-0">
              <div className="text-[11px] font-mono text-slate-400 flex justify-between">
                <span>Output Bersih:</span>
                <strong className="text-emerald-400 font-bold">
                  {cols * frameWidth} × {rows * frameHeight} px ({rowMode === 8 ? '8 Arah' : '4 Arah'})
                </strong>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isProcessing}
                  className="w-full text-slate-300 border-slate-800 hover:bg-slate-800 cursor-pointer"
                >
                  Batal
                </Button>

                <Button
                  type="button"
                  onClick={handleConfirmCrop}
                  disabled={isProcessing}
                  className="w-full bg-sky-600 hover:bg-sky-500 text-white font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-sky-950"
                >
                  <Check className="h-4 w-4" />
                  {isProcessing ? 'Memotong...' : `Konfirmasi & Potong (${rows} Arah)`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
