import Phaser from 'phaser'

/**
 * ChatBubble: Balon teks mengambang di atas kepala karakter RPG.
 * Mengikuti koordinat karakter dan otomatis hilang dengan efek Fade-Out setelah beberapa detik.
 */
export class ChatBubble extends Phaser.GameObjects.Container {
  private bubbleBg: Phaser.GameObjects.Graphics
  private bubbleText: Phaser.GameObjects.Text
  private fadeTimer?: Phaser.Time.TimerEvent

  constructor(scene: Phaser.Scene, x: number, y: number, text: string) {
    super(scene, x, y)

    // Teks pesan (maksimal lebar wrap 180px)
    this.bubbleText = scene.add.text(0, 0, text, {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#0f172a',
      wordWrap: { width: 170, useAdvancedWrap: true },
      align: 'center'
    }).setOrigin(0.5, 0.5)

    const textBounds = this.bubbleText.getBounds()
    const paddingX = 14
    const paddingY = 8
    const width = Math.max(50, textBounds.width + paddingX)
    const height = Math.max(24, textBounds.height + paddingY)

    // Background Balon Putih Retro Ragnarok
    this.bubbleBg = scene.add.graphics()
    this.bubbleBg.fillStyle(0xffffff, 0.95)
    this.bubbleBg.lineStyle(1.5, 0x334155, 1)
    this.bubbleBg.fillRoundedRect(-width / 2, -height / 2, width, height, 6)
    this.bubbleBg.strokeRoundedRect(-width / 2, -height / 2, width, height, 6)

    // Segitiga ekor balon menunjuk ke arah kepala
    this.bubbleBg.fillStyle(0xffffff, 0.95)
    this.bubbleBg.lineStyle(1.5, 0x334155, 1)
    this.bubbleBg.fillTriangle(
      -4, height / 2,
      4, height / 2,
      0, height / 2 + 5
    )
    this.bubbleBg.strokeTriangle(
      -4, height / 2,
      4, height / 2,
      0, height / 2 + 5
    )

    this.add([this.bubbleBg, this.bubbleText])
    this.setDepth(20) // Di atas nameplate
    scene.add.existing(this)

    // Animasi kemunculan Pop-Up kecil (Scale 0 -> 1)
    this.setScale(0.2)
    scene.tweens.add({
      targets: this,
      scale: 1,
      duration: 150,
      ease: 'Back.easeOut'
    })

    // Fade Out setelah 4 detik
    this.fadeTimer = scene.time.delayedCall(4000, () => {
      scene.tweens.add({
        targets: this,
        alpha: 0,
        y: this.y - 15,
        duration: 400,
        onComplete: () => {
          this.destroy()
        }
      })
    })
  }

  public updatePosition(x: number, y: number): void {
    this.setPosition(x, y - 56) // Menempel di atas nameplate
  }

  public destroy(fromScene?: boolean): void {
    if (this.fadeTimer) {
      this.fadeTimer.remove()
    }
    super.destroy(fromScene)
  }
}

