import Phaser from 'phaser'

/**
 * Efek visual perayaan kenaikan level ("LEVEL UP!") ala Ragnarok Online.
 * Menampilkan pilar/cincin cahaya keemasan, percikan partikel bintang, dan teks melayang.
 */
export class LevelUpEffect {
  /**
   * Memainkan animasi Level Up pada koordinat (x, y) karakter.
   */
  public static show(scene: Phaser.Scene, x: number, y: number, newLevel: number): void {
    // 1. Cincin gelombang cahaya emas di tanah (expanding shockwave ring)
    const ring = scene.add.circle(x, y + 16, 12)
    ring.setStrokeStyle(4, 0xfef08a, 1)
    ring.setDepth(30)

    scene.tweens.add({
      targets: ring,
      radius: 75,
      alpha: 0,
      duration: 700,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    })

    // 2. Pilar cahaya vertikal tipis di tubuh karakter (Golden Angelic Pillar)
    const pillar = scene.add.rectangle(x, y - 20, 44, 110, 0xfde047, 0.45)
    pillar.setDepth(28)

    scene.tweens.add({
      targets: pillar,
      scaleX: 1.5,
      scaleY: 1.3,
      alpha: 0,
      duration: 650,
      ease: 'Quad.easeOut',
      onComplete: () => pillar.destroy(),
    })

    // 3. Percikan 8 partikel cahaya emas menyebar ke segala arah
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8
      const spark = scene.add.circle(x, y, 4, 0xfef08a, 1)
      spark.setDepth(35)

      scene.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * 55,
        y: y + Math.sin(angle) * 55 - 15,
        scaleX: 0.2,
        scaleY: 0.2,
        alpha: 0,
        duration: 600,
        ease: 'Quad.easeOut',
        onComplete: () => spark.destroy(),
      })
    }

    // 4. Teks utama "LEVEL UP! (Lv. X)" melayang megah di atas kepala karakter
    const banner = scene.add
      .text(x, y - 48, `✨ LEVEL UP! (Lv.${newLevel}) ✨`, {
        fontFamily: 'monospace',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#fef08a',
        stroke: '#b45309',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(60)
      .setScale(0.6)

    scene.tweens.add({
      targets: banner,
      y: y - 96,
      scaleX: 1.15,
      scaleY: 1.15,
      alpha: 0,
      duration: 1400,
      ease: 'Back.easeOut',
      onComplete: () => banner.destroy(),
    })
  }

  /**
   * Menampilkan floating badge kecil "+XX EXP" saat monster dikalahkan.
   */
  public static showExpGain(scene: Phaser.Scene, x: number, y: number, expAmount: number): void {
    const expText = scene.add
      .text(x, y - 10, `+${expAmount} EXP`, {
        fontFamily: 'monospace',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#38bdf8',
        stroke: '#0f172a',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(45)

    scene.tweens.add({
      targets: expText,
      y: y - 45,
      alpha: 0,
      duration: 900,
      ease: 'Cubic.easeOut',
      onComplete: () => expText.destroy(),
    })
  }
}

