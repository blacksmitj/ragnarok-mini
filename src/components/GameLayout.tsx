import React, { useEffect, useState } from 'react'
import { networkService } from '../services/networkService'
import { GameCanvas } from './GameCanvas'
import { FloatingHUDContainer } from './hud/FloatingHUDContainer'
import { AccountAuthModal } from './hud/AccountAuthModal'

/**
 * GameLayout — Layout Imersif Full-Viewport Mini Ragnarok (Fase 1 & Fase 2 Refactor).
 * - Canvas Phaser merender penuh di latar belakang (100vw x 100vh).
 * - Layer HUD React mengambang bebas di atas canvas dengan isolasi event pointer yang presisi.
 */
export const GameLayout: React.FC = () => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)

  useEffect(() => {
    // Inisialisasi koneksi WebSocket saat aplikasi dibuka
    networkService.connect()
  }, [])

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans">
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
