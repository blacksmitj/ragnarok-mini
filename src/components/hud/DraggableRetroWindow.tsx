import React, { useState, useRef, useEffect, type ReactNode } from 'react'

export interface DraggableRetroWindowProps {
  id: string
  title: string
  icon?: string
  badgeText?: string
  badgeColor?: string
  initialX?: number
  initialY?: number
  defaultCollapsed?: boolean
  children: ReactNode
  onClose?: () => void
  headerRight?: ReactNode
}

/**
 * DraggableRetroWindow — Komponen Pembungkus Window Retro Ragnarok Online.
 * 
 * Kemampuan:
 * - Draggable bebas menggunakan header sebagai handle drag.
 * - Pointer Capture & Boundary Detection (jendela tidak keluar dari batas viewport).
 * - Tombol Minimize / Collapse (▲/▼).
 * - Styling beveled klasik Ragnarok Online dengan Z-index boost saat aktif (focused).
 */
export const DraggableRetroWindow: React.FC<DraggableRetroWindowProps> = ({
  id,
  title,
  icon,
  badgeText,
  badgeColor = 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  initialX,
  initialY,
  defaultCollapsed = false,
  children,
  onClose,
  headerRight,
}) => {
  // Posisi window di layar (px). Jika tidak disetel, gunakan null agar bisa disesuaikan dengan posisi awal
  const [position, setPosition] = useState<{ x: number; y: number } | null>(() => {
    if (initialX !== undefined && initialY !== undefined) {
      return { x: initialX, y: initialY }
    }
    // Baca dari localStorage jika ada posisi tersimpan
    const saved = localStorage.getItem(`ro_window_pos_${id}`)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        return {
          x: Math.min(window.innerWidth - 100, Math.max(10, parsed.x)),
          y: Math.min(window.innerHeight - 60, Math.max(10, parsed.y)),
        }
      } catch {
        // fallback
      }
    }
    return null
  })

  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)
  const [isDragging, setIsDragging] = useState(false)
  const [zIndex, setZIndex] = useState(20)

  const dragRef = useRef<{
    startX: number
    startY: number
    origX: number
    origY: number
  }>({ startX: 0, startY: 0, origX: 0, origY: 0 })

  const windowRef = useRef<HTMLDivElement | null>(null)

  // Inisialisasi posisi default jika belum ada posisi tersimpan
  useEffect(() => {
    if (position === null && windowRef.current) {
      const rect = windowRef.current.getBoundingClientRect()
      setPosition({ x: rect.left, y: rect.top })
    }
  }, [position])

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Jangan drag jika yang diklik adalah tombol atau input di header
    if ((e.target as HTMLElement).tagName === 'BUTTON' || (e.target as HTMLElement).tagName === 'INPUT') {
      return
    }

    e.preventDefault()
    e.stopPropagation()

    // Bawa window ke layer paling atas
    setZIndex(35)

    if (windowRef.current) {
      const rect = windowRef.current.getBoundingClientRect()
      const currentX = position ? position.x : rect.left
      const currentY = position ? position.y : rect.top

      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        origX: currentX,
        origY: currentY,
      }

      setIsDragging(true)
      // Tangkap semua event pointer bahkan jika cursor keluar dari header saat drag cepat
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    }
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return
    e.preventDefault()

    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY

    // Batasi pergerakan agar jendela tidak hilang keluar dari batas browser
    const newX = Math.min(
      window.innerWidth - 60,
      Math.max(10, dragRef.current.origX + dx)
    )
    const newY = Math.min(
      window.innerHeight - 50,
      Math.max(10, dragRef.current.origY + dy)
    )

    setPosition({ x: newX, y: newY })
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(false)
      try {
        ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
      } catch {
        // Safe fallback
      }
      // Simpan posisi ke localStorage agar persisten
      if (position) {
        localStorage.setItem(`ro_window_pos_${id}`, JSON.stringify(position))
      }
    }
  }

  // Gaya posisi: jika position diset, gunakan style inline fixed
  const posStyle: React.CSSProperties = position
    ? {
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex,
      }
    : { zIndex }

  return (
    <div
      ref={windowRef}
      style={posStyle}
      onPointerDown={() => setZIndex(30)}
      className={`pointer-events-auto w-72 sm:w-80 bg-slate-900/90 backdrop-blur-md rounded-md border-2 border-slate-600 shadow-[0_8px_30px_rgb(0,0,0,0.6)] font-sans overflow-hidden transition-shadow select-none ${
        isDragging ? 'opacity-90 shadow-2xl scale-[1.01]' : ''
      }`}
    >
      {/* Title Bar Draggable Handle */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="bg-gradient-to-r from-blue-950/80 via-slate-800 to-blue-950/80 px-3 py-1.5 border-b border-slate-700/80 flex items-center justify-between text-xs cursor-move active:cursor-grabbing"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 border border-amber-200 shadow-[0_0_5px_#f59e0b] shrink-0" />
          {icon && <span className="shrink-0">{icon}</span>}
          <span className="font-bold text-slate-100 text-[11px] tracking-wide drop-shadow truncate">
            {title}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {badgeText && (
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${badgeColor}`}
            >
              {badgeText}
            </span>
          )}

          {headerRight}

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-slate-400 hover:text-white px-1 font-bold text-xs cursor-pointer"
            title={isCollapsed ? 'Buka Jendela' : 'Lipat Jendela'}
          >
            {isCollapsed ? '▼' : '▲'}
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-rose-400 px-1 font-bold text-xs cursor-pointer"
              title="Tutup Jendela"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Konten Window */}
      {!isCollapsed && <div className="p-3 text-xs">{children}</div>}
    </div>
  )
}

export default DraggableRetroWindow
