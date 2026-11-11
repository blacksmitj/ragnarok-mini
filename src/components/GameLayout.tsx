import React, { useEffect, useState } from 'react'
import { networkService } from '../services/networkService'
import { gameContentService } from '../services/gameContentService'
import { GameCanvas } from './GameCanvas'
import { FloatingHUDContainer } from './hud/FloatingHUDContainer'
import { AccountAuthModal } from './hud/AccountAuthModal'
import { Link } from '@tanstack/react-router'
import { Settings, ShieldCheck } from 'lucide-react'

/**
 * GameLayout — Layout Imersif Full-Viewport Mini Ragnarok (Fase 1 & Fase 2 Refactor).
 * - Canvas Phaser merender penuh di latar belakang (100vw x 100vh).
 * - Layer HUD React mengambang bebas di atas canvas dengan isolasi event pointer yang presisi.
 */
export const GameLayout: React.FC = () => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [contentStatus, setContentStatus] = useState<string>('Syncing CMS...')

  useEffect(() => {
    // Inisialisasi koneksi WebSocket saat aplikasi dibuka
    networkService.connect()

    // Sinkronisasi data konten yang dibuat dari Admin CMS (Fase 7 E2E)
    gameContentService.loadPublishedContent().then((content) => {
      if (content.publishedMap) {
        setContentStatus(`Map Active: ${content.publishedMap.name}`)
      } else {
        setContentStatus('Default Arena Active')
      }
    })
  }, [])

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans">
      {/* Tombol Shortcut Akses Admin CMS di Pojok Kanan Atas */}
      <div className="absolute top-3 right-4 z-40 flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/80 border border-slate-700/60 text-[11px] text-slate-300 backdrop-blur-sm shadow">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span className="font-mono">{contentStatus}</span>
        </div>
        <Link
          to="/admin"
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-600/90 hover:bg-indigo-500 border border-indigo-400 text-xs font-semibold text-white shadow-lg backdrop-blur-sm transition-all"
        >
          <Settings className="h-3.5 w-3.5 animate-spin-slow" />
          Admin CMS
        </Link>
      </div>

      {/* 1. Fullscreen Canvas Viewport (Phaser Game Engine - Z-Index 0) */}
      <GameCanvas />

      {/* 2. Floating RPG HUD Layer (React UI Overlay - Z-Index 10 & Pointer Isolation) */}
      <FloatingHUDContainer
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
      />

      {/* 3. Modal Login & Switch Account SQLite (Z-Index 50) */}
      <AccountAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  )
}

export default GameLayout
