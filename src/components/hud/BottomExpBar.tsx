import React from 'react'
import { useGameStore } from '../../stores/useGameStore'

/**
 * BottomExpBar — Bar EXP Tipis Membentang Penuh di Dasar Layar ala Ragnarok Online.
 * 
 * Karakteristik Klasik RO:
 * - Menempel permanen di dasar viewport (`fixed bottom-0 inset-x-0`).
 * - Garis pembagi 10 segmen (setiap 10% progress EXP).
 * - Label dinamis: Base EXP, poin saat ini/target, dan persentase dengan 1 desimal.
 * - Warna gradasi emas keemasan berkilau (`amber-500` ke `yellow-300`).
 */
export const BottomExpBar: React.FC = () => {
  const player = useGameStore((state) => state.player)

  const expPercent = Math.max(
    0,
    Math.min(100, (player.exp / Math.max(1, player.maxExp)) * 100)
  )
  const formattedPercent = expPercent.toFixed(1)

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 border-t border-amber-600/60 select-none shadow-[0_-2px_10px_rgba(0,0,0,0.8)] font-mono">
      <div className="relative w-full h-4 sm:h-5 flex items-center justify-center overflow-hidden">
        {/* Progress Bar Isi */}
        <div
          className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-amber-600 via-amber-400 to-yellow-300 transition-all duration-300 shadow-[0_0_8px_rgba(251,191,36,0.5)]"
          style={{ width: `${expPercent}%` }}
        />

        {/* 10-Segment Dividers (Klasik Ragnarok Online) */}
        <div className="absolute inset-0 flex justify-between pointer-events-none px-0.5">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="w-px h-full bg-slate-950/40 border-r border-slate-700/50"
            />
          ))}
        </div>

        {/* Teks Label EXP */}
        <div className="relative z-10 flex items-center gap-2 text-[10px] sm:text-[11px] font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] tracking-wider">
          <span className="text-amber-300">Base EXP:</span>
          <span>
            {player.exp.toLocaleString()} / {player.maxExp.toLocaleString()}
          </span>
          <span className="text-yellow-200 bg-slate-950/70 px-1.5 py-0.2 rounded border border-amber-500/40 text-[9px] sm:text-[10px]">
            [{formattedPercent}%]
          </span>
        </div>
      </div>
    </div>
  )
}

export default BottomExpBar

