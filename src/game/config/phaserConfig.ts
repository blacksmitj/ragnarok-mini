import Phaser from 'phaser'
import { MainScene } from '../scenes/MainScene'

/**
 * Konfigurasi utama instance Phaser 3/4 untuk Mini Ragnarok.
 * - Menggunakan resolusi standar 800x600 (rasio 4:3 klasik).
 * - Mengaktifkan `pixelArt: true` agar tekstur sprite nantinya tajam dan tidak blur.
 * - Menggunakan Arcade Physics dengan gravitasi 0 (karena game berjenis Top-Down 2D RPG, bukan platformer).
 */
export const createPhaserConfig = (
  parentElement: HTMLElement | string
): Phaser.Types.Core.GameConfig => ({
  type: Phaser.AUTO, // Otomatis memilih WebGL jika didukung browser, fallback ke Canvas 2D
  parent: parentElement,
  width: '100%',
  height: '100%',
  backgroundColor: '#5c9e42', // Hijau rumput Prontera
  pixelArt: true, // WAJIB: Mencegah efek anti-aliasing/blur pada grafis pixel art
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 }, // Top-down RPG tidak memiliki gravitasi jatuh ke bawah
      debug: false,
    },
  },
  scene: [MainScene],
})

