import React, { useEffect, useRef } from 'react'

interface PaperdollLayerPreviewProps {
  baseSheetUrl: string
  overlaySheetUrl?: string
  effectSheetUrl?: string
  frameWidth: number
  frameHeight: number
  frameRate?: number
  scale?: number
}

/**
 * Composite Paperdoll Canvas Preview
 * Merender 3 layer bertumpuk secara sinkron per frame:
 * Layer 1: Body Base (Character)
 * Layer 2: Equipment (Armor / Weapon / Headgear)
 * Layer 3: Visual Effect / Element Glow
 */
export const PaperdollLayerPreview: React.FC<PaperdollLayerPreviewProps> = ({
  baseSheetUrl,
  overlaySheetUrl,
  effectSheetUrl,
  frameWidth,
  frameHeight,
  frameRate = 8,
  scale = 2.5,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.imageSmoothingEnabled = false // Pixel art

    // Load semua images
    const baseImg = new Image()
    baseImg.crossOrigin = 'anonymous'
    if (baseSheetUrl) baseImg.src = baseSheetUrl

    let overlayImg: HTMLImageElement | null = null
    if (overlaySheetUrl) {
      overlayImg = new Image()
      overlayImg.crossOrigin = 'anonymous'
      overlayImg.src = overlaySheetUrl
    }

    let effectImg: HTMLImageElement | null = null
    if (effectSheetUrl) {
      effectImg = new Image()
      effectImg.crossOrigin = 'anonymous'
      effectImg.src = effectSheetUrl
    }

    let frameIndex = 0
    let intervalId: any

    const startLoop = () => {
      const totalFrames = baseImg.width > 0 ? Math.max(1, Math.floor(baseImg.width / frameWidth)) : 1

      const draw = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        const sx = frameIndex * frameWidth
        const sy = 0
        const sw = frameWidth
        const sh = frameHeight

        const dw = frameWidth * scale
        const dh = frameHeight * scale
        const dx = (canvas.width - dw) / 2
        const dy = (canvas.height - dh) / 2

        // 1. Gambar Layer Base (Tubuh Karakter)
        if (baseImg.complete && baseImg.width > 0) {
          ctx.drawImage(baseImg, sx, sy, sw, sh, dx, dy, dw, dh)
        }

        // 2. Gambar Layer Equipment (Armor / Weapon)
        if (overlayImg && overlayImg.complete && overlayImg.width > 0) {
          const overlayTotal = Math.max(1, Math.floor(overlayImg.width / frameWidth))
          const osx = (frameIndex % overlayTotal) * frameWidth
          ctx.drawImage(overlayImg, osx, sy, sw, sh, dx, dy, dw, dh)
        }

        // 3. Gambar Layer Effect (Element / Aura)
        if (effectImg && effectImg.complete && effectImg.width > 0) {
          const effectTotal = Math.max(1, Math.floor(effectImg.width / frameWidth))
          const esx = (frameIndex % effectTotal) * frameWidth
          ctx.drawImage(effectImg, esx, sy, sw, sh, dx, dy, dw, dh)
        }

        frameIndex = (frameIndex + 1) % totalFrames
      }

      intervalId = setInterval(draw, 1000 / frameRate)
    }

    if (baseImg.complete) {
      startLoop()
    } else {
      baseImg.onload = startLoop
    }

    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [baseSheetUrl, overlaySheetUrl, effectSheetUrl, frameWidth, frameHeight, frameRate, scale])

  return (
    <div className="relative flex flex-col items-center justify-center rounded-lg border border-slate-800 bg-slate-950/80 p-4">
      <div className="absolute top-2 left-2 text-[10px] font-mono text-slate-500 uppercase tracking-wider">
        Composite Paperdoll Preview (3 Layers)
      </div>
      <canvas
        ref={canvasRef}
        width={frameWidth * scale + 32}
        height={frameHeight * scale + 32}
        className="pixelated border border-dashed border-slate-800/80 rounded"
      />
    </div>
  )
}

