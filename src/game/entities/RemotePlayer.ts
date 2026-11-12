import Phaser from 'phaser'
import type { PlayerData, PlayerMovedBroadcast, GameDirection } from '../../types/network'
import { ChatBubble } from '../effects/ChatBubble'

/**
 * Entitas RemotePlayer: Me-render dan menginterpolasi posisi pemain lain di arena.
 * Menggunakan Linear Interpolation (Lerp) untuk menghasilkan gerakan halus 60 FPS
 * meskipun paket update server hanya tiba ~20 kali per detik.
 */
export class RemotePlayer extends Phaser.Physics.Arcade.Sprite {
  public readonly id: string
  public playerName: string
  public playerLevel: number

  // Target koordinat untuk Linear Interpolation (Lerp)
  private targetX: number
  private targetY: number
  private targetDirection: GameDirection = 'down'
  private isRemoteMoving: boolean = false

  // UI elemen pendukung: Nameplate retro di atas kepala
  private nameContainer: Phaser.GameObjects.Container
  private nameLabel: Phaser.GameObjects.Text
  private levelBadge: Phaser.GameObjects.Text

  // Balon chat aktif di atas kepala
  private currentChatBubble: ChatBubble | null = null

  constructor(scene: Phaser.Scene, data: PlayerData) {
    super(scene, data.x, data.y, 'novice', 0)
    this.id = data.id
    this.playerName = data.name
    this.playerLevel = data.level
    this.targetX = data.x
    this.targetY = data.y
    this.targetDirection = data.direction || 'down'

    scene.add.existing(this)
    scene.physics.add.existing(this)

    const body = this.body as Phaser.Physics.Arcade.Body
    if (body) {
      body.setImmovable(true)
      body.setSize(22, 28)
      body.setOffset(5, 4)
    }

    // Nameplate Cyan/Sky
    this.nameLabel = scene.add.text(0, 0, this.playerName, {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#38bdf8',
      stroke: '#030712',
      strokeThickness: 3,
      align: 'center',
    }).setOrigin(0.5, 0.5)

    this.levelBadge = scene.add.text(0, -13, `Lv.${this.playerLevel}`, {
      fontFamily: 'monospace',
      fontSize: '9px',
      color: '#94a3b8',
      stroke: '#030712',
      strokeThickness: 2,
      align: 'center',
    }).setOrigin(0.5, 0.5)

    this.nameContainer = scene.add.container(data.x, data.y - 32, [
      this.nameLabel,
      this.levelBadge,
    ])
    this.nameContainer.setDepth(10)
    this.setDepth(5)

    this.playAnimation('idle', this.targetDirection)
  }

  /**
   * Menjalankan animasi sprite RemotePlayer (Walk / Idle)
   */
  public playAnimation(type: 'idle' | 'walk', direction: GameDirection): void {
    const animKey = `${type}_${direction}`
    if (this.anims && this.anims.currentAnim?.key !== animKey) {
      this.anims.play(animKey, true)
    }
  }

  /**
   * Menerima target posisi baru dari paket WebSocket server
   */
  public setTargetPosition(data: PlayerMovedBroadcast): void {
    this.targetX = data.x
    this.targetY = data.y
    this.targetDirection = data.direction
    this.isRemoteMoving = data.isMoving
  }

  /**
   * Update dipanggil setiap frame (60 FPS) oleh MainScene.
   * Menerapkan Lerp (Linear Interpolation) terhadap posisi X & Y.
   */
  public update(): void {
    if (!this.active) return

    // Faktor Lerp: 0.25 (interpolasi mulus menuju target koordinat)
    const lerpFactor = 0.25
    const dx = this.targetX - this.x
    const dy = this.targetY - this.y
    const distance = Math.hypot(dx, dy)

    if (distance > 0.5) {
      this.x = Phaser.Math.Linear(this.x, this.targetX, lerpFactor)
      this.y = Phaser.Math.Linear(this.y, this.targetY, lerpFactor)
    } else {
      this.x = this.targetX
      this.y = this.targetY
    }

    // Sinkronkan animasi gerak / diam
    if (this.isRemoteMoving || distance > 2) {
      this.playAnimation('walk', this.targetDirection)
    } else {
      this.playAnimation('idle', this.targetDirection)
    }

    // Ikuti posisi sprite untuk nameplate
    if (this.nameContainer) {
      this.nameContainer.setPosition(this.x, this.y - 32)
    }

    // Ikuti posisi balon chat
    if (this.currentChatBubble && this.currentChatBubble.active) {
      this.currentChatBubble.updatePosition(this.x, this.y)
    }
  }

  /**
   * Menampilkan balon teks chat di atas kepala Remote Player
   */
  public showChatBubble(text: string): void {
    if (this.currentChatBubble) {
      this.currentChatBubble.destroy()
    }
    this.currentChatBubble = new ChatBubble(this.scene, this.x, this.y - 56, text)
  }

  public destroy(fromScene?: boolean): void {
    if (this.currentChatBubble) {
      this.currentChatBubble.destroy()
    }
    if (this.nameContainer) {
      this.nameContainer.destroy(true)
    }
    super.destroy(fromScene)
  }
}
