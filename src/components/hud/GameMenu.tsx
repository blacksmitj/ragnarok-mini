import React, { useState } from 'react'
import { useGameStore } from '../../stores/useGameStore'
import { DraggableRetroWindow } from './DraggableRetroWindow'

/**
 * GameMenu — Panel Kontrol & Menu Pengaturan Draggable Retro RO.
 */
export const GameMenu: React.FC = () => {
  const isPaused = useGameStore((state) => state.isPaused)
  const soundEnabled = useGameStore((state) => state.soundEnabled)
  const lastSavedAt = useGameStore((state) => state.lastSavedAt)
  const isAutoFarming = useGameStore((state) => state.isAutoFarming)
  const toggleAutoFarming = useGameStore((state) => state.toggleAutoFarming)
  const togglePause = useGameStore((state) => state.togglePause)
  const toggleSound = useGameStore((state) => state.toggleSound)
  const manualSave = useGameStore((state) => state.manualSave)
  const takeDamage = useGameStore((state) => state.takeDamage)
  const heal = useGameStore((state) => state.heal)
  const resetGame = useGameStore((state) => state.resetGame)

  const [saveFeedback, setSaveFeedback] = useState(false)

  const handleManualSave = () => {
    manualSave()
    setSaveFeedback(true)
    setTimeout(() => setSaveFeedback(false), 1500)
  }

  const sfxButton = (
    <button
      onClick={toggleSound}
      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border transition cursor-pointer ${
        soundEnabled
          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
          : 'bg-slate-800 border-slate-700 text-slate-400'
      }`}
    >
      {soundEnabled ? '🔊 SFX' : '🔇 Mute'}
    </button>
  )

  return (
    <DraggableRetroWindow
      id="options_window"
      title="Game Options"
      icon="⚙️"
      headerRight={sfxButton}
      defaultCollapsed={true}
    >
      <div className="flex flex-col gap-3 font-sans">
        {/* Bagian 1: Panduan Kontrol Cepat */}
        <div>
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
            <span>⌨️</span> Controls
          </h4>
          <div className="space-y-1 text-[11px] font-mono">
            <div className="flex items-center justify-between bg-slate-950/70 px-2 py-1 rounded border border-slate-800">
              <span className="text-slate-300 font-sans">Gerak</span>
              <span className="text-amber-300 font-bold">WASD / Arrows</span>
            </div>
            <div className="flex items-center justify-between bg-slate-950/70 px-2 py-1 rounded border border-slate-800">
              <span className="text-slate-300 font-sans">Attack Target</span>
              <span className="text-amber-300 font-bold">Space / Z</span>
            </div>
            <div className="flex items-center justify-between bg-slate-950/70 px-2 py-1 rounded border border-slate-800">
              <span className="text-slate-300 font-sans">Auto Farming</span>
              <span className="text-amber-300 font-bold">5 / F</span>
            </div>
          </div>
        </div>

        {/* Bagian 2: Quick Test Actions */}
        <div>
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
            <span>🧪</span> Quick Actions & Bot
          </h4>
          <button
            onClick={toggleAutoFarming}
            className={`w-full mb-1.5 py-1.5 px-2 rounded border text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
              isAutoFarming
                ? 'bg-amber-500/20 text-amber-300 border-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.3)] animate-pulse'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-600'
            }`}
          >
            <span>{isAutoFarming ? '🤖' : '🎯'}</span>
            <span>Auto Farm: {isAutoFarming ? 'AKTIF (Berjalan)' : 'NONAKTIF'}</span>
          </button>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => heal(25)}
              className="py-1 px-2 rounded bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/40 text-[11px] font-semibold transition cursor-pointer flex items-center justify-center gap-1"
            >
              <span>🧪</span> Potion (+25)
            </button>
            <button
              onClick={() => takeDamage(20)}
              className="py-1 px-2 rounded bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 border border-rose-500/40 text-[11px] font-semibold transition cursor-pointer flex items-center justify-center gap-1"
            >
              <span>💥</span> Test Hit (-20)
            </button>
          </div>
        </div>

        {/* Bagian 3: System & Save */}
        <div className="pt-2 border-t border-slate-800 flex flex-col gap-1.5">
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={handleManualSave}
              className={`py-1 px-2 rounded border text-[11px] font-semibold transition cursor-pointer flex items-center justify-center gap-1 ${
                saveFeedback
                  ? 'bg-emerald-500/30 text-emerald-200 border-emerald-400'
                  : 'bg-sky-950/50 hover:bg-sky-900/60 text-sky-300 border-sky-500/40'
              }`}
            >
              <span>💾</span> {saveFeedback ? 'Saved!' : 'Save Game'}
            </button>
            <button
              onClick={togglePause}
              className="py-1 px-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 text-[11px] font-semibold transition cursor-pointer flex items-center justify-center gap-1"
            >
              <span>{isPaused ? '▶️' : '⏸️'}</span> {isPaused ? 'Resume' : 'Pause'}
            </button>
          </div>

          <button
            onClick={() => {
              if (window.confirm('Reset semua progres level, stat, dan item ke awal?')) {
                resetGame()
              }
            }}
            className="w-full py-1 rounded bg-slate-950/60 hover:bg-rose-950/60 text-slate-500 hover:text-rose-300 border border-slate-800 hover:border-rose-800/60 text-[10px] font-medium transition cursor-pointer"
          >
            🗑️ Reset All Progress
          </button>
          {lastSavedAt && (
            <span className="text-[9px] text-slate-500 text-center font-mono">
              Last Save: {new Date(lastSavedAt).toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>
    </DraggableRetroWindow>
  )
}

export default GameMenu
