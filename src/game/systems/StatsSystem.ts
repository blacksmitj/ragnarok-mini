import type { PlayerStats } from '../../stores/useGameStore'

/**
 * Hasil kalkulasi penambahan EXP, memberi tahu apakah pemain naik level
 * dan berapa banyak level yang bertambah.
 */
export interface ExpGainResult {
  updatedPlayer: PlayerStats
  leveledUp: boolean
  levelsGained: number
}

/**
 * Sistem murni (pure functions) untuk matematika statistik RPG Mini Ragnarok.
 * Dipisahkan dari Phaser dan React agar mudah diuji (unit-testable) dan konsisten.
 */
export class StatsSystem {
  // Konstanta dasar kurva leveling
  public static readonly BASE_EXP_REQ = 100
  public static readonly EXP_EXPONENT = 1.5
  public static readonly HP_PER_LEVEL = 25
  public static readonly ATK_PER_LEVEL = 3

  /**
   * Menghitung kebutuhan EXP untuk naik dari `level` saat ini ke `level + 1`.
   * Formula: ReqEXP = floor(Base * (Level ^ 1.5))
   * - Lv 1 -> 100 EXP
   * - Lv 2 -> 282 EXP
   * - Lv 3 -> 519 EXP
   */
  public static calculateRequiredExp(level: number): number {
    return Math.floor(this.BASE_EXP_REQ * Math.pow(level, this.EXP_EXPONENT))
  }

  /**
   * Memproses penambahan EXP dan menangani kenaikan level (termasuk multi-level up
   * dan pewarisan sisa EXP / overflow).
   */
  public static applyExpGain(current: PlayerStats, expAmount: number): ExpGainResult {
    let { level, exp, maxExp, maxHp, hp, baseAtk } = current
    exp += Math.max(0, expAmount)

    let levelsGained = 0

    // Loop selama EXP mencukupi batas maxExp level saat ini (mendukung multi-level up)
    while (exp >= maxExp) {
      exp -= maxExp // Sisa kelebihan EXP (overflow) diteruskan ke level berikutnya
      level += 1
      levelsGained += 1

      maxExp = this.calculateRequiredExp(level)
      maxHp += this.HP_PER_LEVEL
      hp = maxHp // Aturan klasik Ragnarok Online: HP pulih 100% penuh saat Level Up!
      baseAtk += this.ATK_PER_LEVEL
    }

    return {
      updatedPlayer: {
        ...current,
        level,
        exp,
        maxExp,
        maxHp,
        hp,
        baseAtk,
      },
      leveledUp: levelsGained > 0,
      levelsGained,
    }
  }
}

