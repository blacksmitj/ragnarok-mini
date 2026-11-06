import Phaser from 'phaser'
import type { GroundItemData } from '../../types/network'

/**
 * Visual GroundItem di Phaser Canvas.
 * Menampilkan ikon item pixel art dengan efek animasi melayang (bobbing tween)
 * dan label nama retro di atasnya.
 */
export class GroundItem extends Phaser.GameObjects.Container {
  public readonly id: string
  public readonly itemData: GroundItemData
  private itemIcon: Phaser.GameObjects.Text
  private itemLabel: Phaser.GameObjects.Text
  private shadow: Phaser.GameObjects.Graphics
  private bobTween?: Phaser.Tweens.Tween

  constructor(scene: Phaser.Scene, data: GroundItemData) {
    super(scene, data.x, data.y)
    this.id = data.id
    this.itemData = data

    // Bayangan item di tanah
    this.shadow = scene.add.graphics()
    this.shadow.fillStyle(0x000000, 0.3)
    this.shadow.fillEllipse(0, 10, 16, 6)

    let emoji = '📦'
    let labelColor = '#e2e8f0'
    if (data.itemId === 'jellopy') {
      emoji = '💎'
      labelColor = '#38bdf8'
    } else if (data.itemId === 'apple') {
      emoji = '🍎'
      labelColor = '#f87171'
    } else if (data.itemId === 'wolf_claw') {
      emoji = '🐾'
      labelColor = '#fdba74'
    } else if (data.itemId === 'red_potion') {
      emoji = '🧪'
      labelColor = '#fb7185'
    }

    this.itemIcon = scene.add.text(0, 0, emoji, {
      fontSize: '16px'
    }).setOrigin(0.5, 0.5)

    this.itemLabel = scene.add.text(0, -14, data.name, {
      fontFamily: 'monospace',
      fontSize: '9px',
      color: labelColor,
      backgroundColor: '#0f172ae6',
      padding: { x: 3, y: 1 }
    }).setOrigin(0.5, 0.5)

    this.add([this.shadow, this.itemIcon, this.itemLabel])
    this.setDepth(6)
    scene.add.existing(this as unknown as Phaser.GameObjects.GameObject)

    // Animasi melayang turun-naik (Bobbing Effect)
    this.bobTween = scene.tweens.add({
      targets: this.itemIcon,
      y: -5,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    })
  }

  public playPickupAnimation(onComplete: () => void): void {
    if (this.bobTween) {
      this.bobTween.stop()
    }

    this.scene.tweens.add({
      targets: this,
      y: this.y - 25,
      alpha: 0,
      scale: 1.3,
      duration: 250,
      ease: 'Back.easeIn',
      onComplete: () => {
        onComplete()
        this.destroy()
      }
    })
  }

  public override destroy(fromScene?: boolean): void {
    if (this.bobTween) {
      this.bobTween.stop()
    }
    super.destroy(fromScene)
  }
}
