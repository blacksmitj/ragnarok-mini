import React from 'react'
import { useGameStore } from '../../stores/useGameStore'
import { CharacterStatus } from './CharacterStatus'
import { MonsterTargetInfo } from './MonsterTargetInfo'
import { ChatWindow } from './ChatWindow'
import { InventoryPanel } from './InventoryPanel'
import { GameMenu } from './GameMenu'
import { QuickSlotBar } from './QuickSlotBar'
import { BottomExpBar } from './BottomExpBar'

interface FloatingHUDContainerProps {
  onOpenAuthModal: () => void
}

/**
 * FloatingHUDContainer — Layer overlay UI React utama yang mengambang di atas Canvas Phaser.
 * 
 * Boundary & Pointer Events:
 * - Container terluar menggunakan `pointer-events-none` agar klik pada ruang kosong tembus
 *   ke canvas game Phaser di bawahnya (misal: klik untuk bergerak / menyerang).
 * - Semua floating window/panel/tombol menggunakan `pointer-events-auto` agar interaktif.
 */
export const FloatingHUDContainer: React.FC<FloatingHUDContainerProps> = ({
  onOpenAuthModal,
}) => {
  const isServerConnected = useGameStore((state) => state.isServerConnected)
  const onlineCount = useGameStore((state) => state.onlineCount)
  const accountUsername = useGameStore((state) => state.accountUsername)
  const isPaused = useGameStore((state) => state.isPaused)
  const togglePause = useGameStore((state) => state.togglePause)
  const isPlayerDead = useGameStore((state) => state.isPlayerDead)
  const respawnPlayer = useGameStore((state) => state.respawnPlayer)
  const wasLoadedFromSave = useGameStore((state) => state.wasLoadedFromSave)
  const dismissLoadedBanner = useGameStore((state) => state.dismissLoadedBanner)
  const player = useGameStore((state) => state.player)

  return (
    <div className="fixed inset-0 pointer-events-none z-10 flex flex-col justify-between overflow-hidden select-none">
      {/* ============================================================== */}
      {/* 1. TOP BAR OVERLAY: Left (Status), Center (Target), Right (Meta) */}
      {/* ============================================================== */}
      <div className="w-full p-3 sm:p-4 flex items-start justify-between gap-4">
        {/* Top-Left: Character Status Panel */}
        <div className="pointer-events-auto flex flex-col gap-2 max-w-sm">
          <CharacterStatus />
        </div>

        {/* Top-Center: Monster Target Info (Boss / Locked Target HP Bar) */}
        <div className="pointer-events-auto flex justify-center">
          <MonsterTargetInfo />
        </div>

        {/* Top-Right: Server Ping, Account Status, & Quick Controls */}
        <div className="pointer-events-auto flex flex-col items-end gap-2 text-xs font-mono">
          <div className="flex items-center gap-2 bg-slate-900/85 backdrop-blur-md border border-slate-700/80 rounded-lg px-3 py-1.5 shadow-lg">
            {/* Server Badge */}
            <span
              className={`inline-flex items-center gap-1.5 font-semibold ${
                isServerConnected ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isServerConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                }`}
              />
              {isServerConnected ? `Online (${onlineCount})` : 'Offline'}
            </span>

            <span className="text-slate-600">|</span>

            {/* Account Switcher Button */}
            <button
              onClick={onOpenAuthModal}
              className="text-amber-300 hover:text-amber-200 transition cursor-pointer flex items-center gap-1 font-sans"
              title="Ganti atau simpan akun"
            >
              <span>👤</span>
              <span className="max-w-[100px] truncate">@{accountUsername}</span>
            </button>
          </div>

          {/* Banner Save Loaded Notif jika ada */}
          {wasLoadedFromSave && (
            <div className="bg-sky-950/90 border border-sky-500/40 px-3 py-1.5 rounded-lg text-sky-200 text-[11px] flex items-center gap-2 shadow-lg max-w-xs">
              <span>💾 Loaded ({player.name})</span>
              <button
                onClick={dismissLoadedBanner}
                className="text-sky-400 hover:text-white font-bold ml-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. MIDDLE AREA: Modals / Overlays (Pause & Death Screen)        */}
      {/* ============================================================== */}
      <div className="flex-1 flex items-center justify-center relative">
        {/* Layar Pause */}
        {isPaused && (
          <div className="pointer-events-auto bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-amber-500/50 shadow-2xl max-w-xs text-center z-20">
            <div className="text-3xl mb-2">⏸️</div>
            <h3 className="text-lg font-bold text-amber-300 mb-1">Permainan Dijeda</h3>
            <p className="text-xs text-slate-400 mb-4">
              Simulasi fisika dan pergerakan dihentikan sementara.
            </p>
            <button
              onClick={togglePause}
              className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition cursor-pointer"
            >
              ▶️ Lanjutkan Permainan
            </button>
          </div>
        )}

        {/* Layar Kematian Karakter */}
        {isPlayerDead && (
          <div className="pointer-events-auto bg-slate-900 border-2 border-rose-500/70 rounded-2xl p-6 text-center shadow-2xl max-w-sm z-30">
            <div className="text-4xl mb-2">💀</div>
            <h3 className="text-xl font-bold text-rose-400 mb-1 tracking-wide">
              ANDA TELAH GUGUR
            </h3>
            <p className="text-xs text-slate-300 mb-5 leading-relaxed">
              HP Anda mencapai 0 akibat serangan monster. Bangkit kembali di Prontera untuk memulihkan seluruh tenaga.
            </p>
            <button
              onClick={respawnPlayer}
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg transition shadow-lg shadow-rose-900/40 cursor-pointer"
            >
              ✨ Bangkit Kembali (Respawn Full HP)
            </button>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* 3. BOTTOM AREA: Left (Chat), Right (Hotbar, Inv, & Game Menu)  */}
      {/* ============================================================== */}
      <div className="w-full px-3 sm:px-4 pb-6 sm:pb-7 flex items-end justify-between gap-4">
        {/* Pojok Kiri Bawah: Chat Window Retro */}
        <div className="pointer-events-auto">
          <ChatWindow />
        </div>

        {/* Pojok Kanan Bawah: Hotbar Dock & Collapsible Panels */}
        <div className="pointer-events-auto flex flex-col items-end gap-2.5">
          <InventoryPanel />
          <GameMenu />
          <QuickSlotBar />
        </div>
      </div>

      {/* ============================================================== */}
      {/* 4. STICKY EXP BAR: Full-Width Bottom Bar ala Ragnarok Online    */}
      {/* ============================================================== */}
      <div className="pointer-events-auto">
        <BottomExpBar />
      </div>
    </div>
  )
}
