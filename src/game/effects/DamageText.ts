import Phaser from 'phaser'

/**
 * Menampilkan angka damage atau teks status ("MISS!") yang melayang ke atas
 * lalu memudar (fade out) ala Ragnarok Online klasik menggunakan Phaser Tween.
 */
export class DamageText {
  /**
   * Memunculkan angka damage di koordinat (x, y).
   * @param scene Scene Phaser aktif
   * @param x Koordinat X munculnya teks
   * @param y Koordinat Y munculnya teks
   * @param amount Nilai damage (atau 0 jika serangan luput / tidak ada target)
   * @param isCritical Apakah serangan bernilai tinggi / kritikal
   */
  public static show(
    scene: Phaser.Scene,
    x: number,
    y: number,
    amount: number,
    isCritical = false
  ): void {
    const label = amount > 0 ? `${amount}` : 'MISS!'
    const textColor = amount === 0 ? '#94a3b8' : isCritical ? '#fde047' : '#ffffff'
    const strokeColor = amount === 0 ? '#1e293b' : isCritical ? '#b91c1c' : '#dc2626'
    const fontSize = isCritical ? '20px' : '16px'

    // Sedikit variasi posisi X agar angka tidak saling menumpuk persis jika menyerang cepat
    const jitterX = Phaser.Math.Between(-10, 10)

    const textObj = scene.add
      .text(x + jitterX, y, label, {
        fontFamily: 'monospace',
        fontSize,
        fontStyle: 'bold',
        color: textColor,
        stroke: strokeColor,
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(50)

    // Efek pop-up melayang ke atas lalu menghilang
    scene.tweens.add({
      targets: textObj,
      y: y - 42,
      scaleX: isCritical ? 1.25 : 1.05,
      scaleY: isCritical ? 1.25 : 1.05,
      alpha: 0,
      duration: 750,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        textObj.destroy()
      },
    })
  }
}

