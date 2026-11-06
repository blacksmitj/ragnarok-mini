import React, { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { createPhaserConfig } from '../game/config/phaserConfig'
import { useGameStore } from '../stores/useGameStore'

/**
 * Komponen pembungkus (wrapper) tempat Canvas Phaser di-mount ke dalam DOM React.
 * Mengelola inisialisasi dan pembersihan (destroy) instance Phaser secara aman
 * pada mode React 19 StrictMode.
 */
export const GameCanvas: React.FC = () => {
  // Ref untuk menunjuk ke elemen DOM <div id="phaser-container">
  const containerRef = useRef<HTMLDivElement | null>(null)
  // Ref untuk menyimpan instance Phaser.Game agar tidak dibuat ganda
  const gameRef = useRef<Phaser.Game | null>(null)

  useEffect(() => {
    // Guard: Pastikan elemen container tersedia dan instance belum dibuat
    if (!containerRef.current || gameRef.current) {
      return
    }

    // Buat konfigurasi dan inisialisasi Phaser.Game
    const config = createPhaserConfig(containerRef.current)
    const game = new Phaser.Game(config)
    gameRef.current = game

    // Cleanup function: Wajib dijalankan saat komponen unmount (atau StrictMode remount)
    return () => {
      useGameStore.getState().setGameReady(false)
      game.destroy(true) // Hapus elemen <canvas> dari DOM dan bebaskan memori WebGL/Audio
      gameRef.current = null
    }
  }, [])

  return (
    <div
      id="phaser-container"
      ref={containerRef}
      className="fixed inset-0 w-full h-full overflow-hidden bg-slate-950 z-0"
    />
  )
}

export default GameCanvas

