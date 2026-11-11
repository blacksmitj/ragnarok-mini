import React, { useEffect, useRef, useState } from 'react'

interface SpriteCanvasPreviewProps {
  sheetUrl: string
  frameWidth: number
  frameHeight: number
  frameRate?: number
  scale?: number
}

/**
 * Komponen HTML5 Canvas untuk memotong dan menganimasikan spritesheet karakter secara live
 */
export const SpriteCanvasPreview: React.FC<SpriteCanvasPreviewProps> = ({
  sheetUrl,
  frameWidth,
  frameHeight,
  frameRate = 8,
  scale = 2,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [imgInfo, setImgInfo] = useState<{ width: number; height: number; cols: number; rows: number } | null>(null)

  useEffect(() => {
    if (!sheetUrl) return

    setLoadError(null)
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.imageSmoothingEnabled = false // Pixel art sharp

    const img = new Image()
    // Muat tanpa crossOrigin jika memungkinkan, atau tangani fallback
    // Untuk menggambar di canvas HTML5 tanpa tainted canvas:
    img.crossOrigin = 'anonymous'
    img.src = sheetUrl

    let frameIndex = 0
    let totalCols = 1
    let intervalId: any

    img.onload = () => {
      const w = img.naturalWidth || img.width
      const h = img.naturalHeight || img.height
      const cols = Math.max(1, Math.floor(w / (frameWidth || 64)))
      const rows = Math.max(1, Math.floor(h / (frameHeight || 64)))
      totalCols = cols
      setImgInfo({ width: w, height: h, cols, rows })

      const draw = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        
        // Sumber potong frame (Baris pertama / Row 0)
        const sx = frameIndex * frameWidth
        const sy = 0 
        const sw = Math.min(frameWidth, w - sx)
        const sh = Math.min(frameHeight, h)

        // Target pada canvas
        const dw = frameWidth * scale
        const dh = frameHeight * scale
        const dx = (canvas.width - dw) / 2
        const dy = (canvas.height - dh) / 2

        if (sw > 0 && sh > 0) {
          ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)
        }

        frameIndex = (frameIndex + 1) % totalCols
      }

      draw()
      intervalId = setInterval(draw, 1000 / Math.max(1, frameRate))
    }

    img.onerror = () => {
      setLoadError(`Gagal memuat gambar dari URL: ${sheetUrl}`)
    }

    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [sheetUrl, frameWidth, frameHeight, frameRate, scale])

  return (
    <div className="relative flex flex-col items-center justify-center rounded-lg border border-slate-800 bg-slate-950/70 p-4 overflow-hidden">
      <div className="w-full flex items-center justify-between text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-2">
        <span>Live Slicer ({frameWidth}x{frameHeight}px @ {frameRate}fps)</span>
        {imgInfo && <span>Asli: {imgInfo.width}x{imgInfo.height} ({imgInfo.cols}x{imgInfo.rows} frames)</span>}
      </div>

      {loadError ? (
        <div className="text-xs text-rose-400 p-4 text-center bg-rose-950/30 rounded border border-rose-900/50">
          {loadError}
        </div>
      ) : (
        <canvas
          ref={canvasRef}
          width={Math.min(320, Math.max(128, frameWidth * scale + 32))}
          height={Math.min(320, Math.max(128, frameHeight * scale + 32))}
          className="pixelated border border-dashed border-slate-800/80 rounded bg-slate-900/50"
        />
      )}
    </div>
  )
}

