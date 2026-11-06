import React from 'react'
import { useGameStore } from '../../stores/useGameStore'
import { DraggableRetroWindow } from './DraggableRetroWindow'

/**
 * CharacterStatus — Floating & Draggable Basic Information Window Ragnarok Online.
 */
export const CharacterStatus: React.FC = () => {
  const player = useGameStore((state) => state.player)
  const monstersDefeated = useGameStore((state) => state.monstersDefeated)
  const isAutoFarming = useGameStore((state) => state.isAutoFarming)
  const toggleAutoFarming = useGameStore((state) => state.toggleAutoFarming)

  const hpPercent = Math.max(
    0,
    Math.min(100, Math.round((player.hp / player.maxHp) * 100))
  )
  const isLowHp = hpPercent <= 25

  const currentSp = Math.round(player.level * 15)
  const maxSp = Math.round(player.level * 15)
  const spPercent = 100

  return (
    <DraggableRetroWindow
      id="status_window"
      title="Basic Information"
      badgeText="Novice"
      initialX={16}
      initialY={16}
      headerRight={
        <button
          onClick={toggleAutoFarming}
          className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer flex items-center gap-1 ${
            isAutoFarming
              ? 'bg-amber-500/30 text-amber-200 border-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)] animate-pulse'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-600'
          }`}
          title="Tombol Cepat Auto Farming (Shortcut: 5 atau F)"
        >
          <span>{isAutoFarming ? '🤖' : '🎯'}</span>
          <span>AUTO</span>
        </button>
      }
    >
      <div className="space-y-2.5">
        {/* Avatar, Nama, dan Level */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded bg-slate-950 border border-slate-700 flex items-center justify-center overflow-hidden shadow-inner shrink-0">
            <img
              src="/assets/characters/novice.png"
              alt="Novice Avatar"
              className="w-8 h-8 object-none object-left-top scale-[2.2]"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between">
              <h3 className="font-bold text-amber-200 text-sm truncate drop-shadow-sm">
                {player.name}
              </h3>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                Base Lv. {player.level}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40">
                Job Lv. {Math.min(10, player.level)}
              </span>
            </div>
          </div>
        </div>

        {/* HP Bar */}
        <div>
          <div className="flex justify-between items-center text-[11px] mb-0.5 font-mono">
            <span className="font-bold text-emerald-400 flex items-center gap-1">
              HP {isLowHp && <span className="text-rose-400 animate-pulse text-[10px]">(LOW)</span>}
            </span>
            <span className="text-slate-300 text-[10px]">
              {player.hp} / {player.maxHp} ({hpPercent}%)
            </span>
          </div>
          <div className="w-full h-2.5 bg-slate-950 rounded-sm overflow-hidden border border-slate-700/80 p-0.5 shadow-inner">
            <div
              className={`h-full rounded-xs transition-all duration-200 ${
                isLowHp
                  ? 'bg-rose-500 shadow-[0_0_6px_#f43f5e]'
                  : 'bg-gradient-to-r from-emerald-600 to-lime-400'
              }`}
              style={{ width: `${hpPercent}%` }}
            />
          </div>
        </div>

        {/* SP Bar (Otentik Ragnarok Blue SP) */}
        <div>
          <div className="flex justify-between items-center text-[11px] mb-0.5 font-mono">
            <span className="font-bold text-sky-400">SP</span>
            <span className="text-slate-300 text-[10px]">
              {currentSp} / {maxSp} ({spPercent}%)
            </span>
          </div>
          <div className="w-full h-2.5 bg-slate-950 rounded-sm overflow-hidden border border-slate-700/80 p-0.5 shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-sky-400 rounded-xs transition-all duration-200"
              style={{ width: `${spPercent}%` }}
            />
          </div>
        </div>

        {/* Stats Ringkas Bar Bawah (ATK, Zeny, Kills) */}
        <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-800 text-center font-mono">
          <div className="bg-slate-950/60 border border-slate-800 rounded px-1.5 py-1">
            <span className="text-[9px] text-slate-400 block uppercase">ATK</span>
            <span className="text-amber-300 font-bold text-xs">{player.baseAtk}</span>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 rounded px-1.5 py-1">
            <span className="text-[9px] text-slate-400 block uppercase">Zeny</span>
            <span className="text-yellow-300 font-bold text-xs">{player.zeny}z</span>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 rounded px-1.5 py-1">
            <span className="text-[9px] text-slate-400 block uppercase">Kills</span>
            <span className="text-rose-400 font-bold text-xs">{monstersDefeated}</span>
          </div>
        </div>
      </div>
    </DraggableRetroWindow>
  )
}

export default CharacterStatus
