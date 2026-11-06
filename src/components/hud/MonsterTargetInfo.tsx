import React from 'react'
import { useGameStore } from '../../stores/useGameStore'

/**
 * MonsterTargetInfo — Floating Top-Center Boss/Target HP Bar.
 * Terinspirasi dari target bar Ragnarok Online / Action RPG retro.
 * Hanya muncul ketika ada monster yang sedang ditarget atau dipukul.
 */
export const MonsterTargetInfo: React.FC = () => {
  const target = useGameStore((state) => state.targetMonster)

  if (!target) {
    return null
  }

  const hpPercent = Math.max(
    0,
    Math.min(100, Math.round((target.hp / target.maxHp) * 100))
  )

  const isPoring = target.name.toLowerCase().includes('poring')
  const spriteSrc = isPoring
    ? '/assets/monsters/poring.png'
    : '/assets/monsters/wolf.png'

  return (
    <div className="w-80 sm:w-96 bg-slate-900/90 backdrop-blur-md rounded-md border-2 border-rose-500/60 shadow-[0_4px_25px_rgba(244,63,94,0.3)] font-sans overflow-hidden transition-all duration-200 animate-in fade-in slide-in-from-top-2">
      {/* Target Title Bar */}
      <div className="bg-gradient-to-r from-rose-950 via-slate-900 to-rose-950 px-3 py-1 border-b border-rose-900/60 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
          <span className="text-[10px] font-bold text-rose-300 uppercase tracking-wider font-mono">
            Target Locked
          </span>
        </div>
        <span className="text-[10px] font-mono text-slate-400">
          Lv. {target.level}
        </span>
      </div>

      <div className="p-2.5 flex items-center gap-3">
        {/* Monster Portrait */}
        <div className="w-10 h-10 rounded bg-slate-950 border border-rose-900/50 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
          <img
            src={spriteSrc}
            alt={target.name}
            className="w-8 h-8 object-none object-left-top scale-[1.8]"
            style={{ imageRendering: 'pixelated' }}
          />
        </div>

        {/* Target Name & HP Gauge */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between mb-1">
            <h4 className="font-bold text-rose-200 text-xs truncate">
              {target.name}
            </h4>
            <span className="text-[10px] font-mono text-slate-300">
              {target.hp} / {target.maxHp} ({hpPercent}%)
            </span>
          </div>

          <div className="w-full h-2.5 bg-slate-950 rounded-sm overflow-hidden border border-rose-950 p-0.5 shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-rose-600 via-rose-500 to-amber-400 rounded-xs transition-all duration-150"
              style={{ width: `${hpPercent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default MonsterTargetInfo
