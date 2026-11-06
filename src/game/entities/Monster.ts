import Phaser from 'phaser'
import { DamageText } from '../effects/DamageText'
import { LevelUpEffect } from '../effects/LevelUpEffect'
import { useGameStore } from '../../stores/useGameStore'
import type { ServerMonsterData, MonsterType } from '../../types/network'

export interface MonsterConfig {
  type: MonsterType
  name: string
  texture: string
  maxHp: number
  expReward: number
  zenyReward: number
  isAggressive: boolean
}

const MONSTER_PROFILES: Record<MonsterType, MonsterConfig> = {
  poring: {
    type: 'poring',
    name: 'Poring',
    texture: 'poring',
    maxHp: 50,
    expReward: 35,
    zenyReward: 15,
    isAggressive: false,
  },
  wolf: {
    type: 'wolf',
    name: 'Desert Wolf',
    texture: 'wolf',
    maxHp: 85,
    expReward: 80,
    zenyReward: 40,
    isAggressive: true,
  },
}

/**
 * Entitas Monster Client (Authoritative Server Replica).
 * Monster tidak lagi menjalankan kalkulasi AI sendiri di browser,
 * melainkan menginterpolasi koordinat X/Y, HP, dan status hidup/mati dari server.
 */
export class Monster extends Phaser.Physics.Arcade.Sprite {
  public readonly id: string
  public readonly config: MonsterConfig
  public readonly monsterName: string
  public readonly maxHp: number
  public currentHp: number
  public isDead = false

  // Target interpolasi koordinat dari paket server
  private targetX: number
  private targetY: number

  // Elemen visual pendamping (HP Bar Graphics & Label Nama)
  private hpBarGraphics: Phaser.GameObjects.Graphics
  private nameLabel: Phaser.GameObjects.Text

  constructor(scene: Phaser.Scene, data: ServerMonsterData) {
    const config = MONSTER_PROFILES[data.type]
    super(scene, data.x, data.y, config.texture, 0)

    this.id = data.id
    this.config = config
    this.monsterName = config.name
    this.maxHp = data.maxHp
    this.currentHp = data.hp
    this.isDead = data.isDead
    this.targetX = data.x
    this.targetY = data.y

    scene.add.existing(this)
    scene.physics.add.existing(this)

    this.setScale(2)
    this.setDepth(8)

    const body = this.body as Phaser.Physics.Arcade.Body
    if (body) {
      body.setImmovable(true)
      if (data.type === 'wolf') {
        body.setSize(22, 16)
        body.setOffset(5, 12)
      } else {
        body.setSize(18, 14)
        body.setOffset(7, 13)
      }
    }

    this.hpBarGraphics = scene.add.graphics()
    this.hpBarGraphics.setDepth(15)

    const nameColor = config.isAggressive ? '#fca5a5' : '#fbcfe8'
    this.nameLabel = scene.add
      .text(data.x, data.y + 32, this.monsterName, {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: nameColor,
        backgroundColor: '#0f172a99',
        padding: { x: 4, y: 1 },
      })
      .setOrigin(0.5)
      .setDepth(15)

    this.drawHpBar()
    this.play(`${this.config.type}_idle`)
  }

  /**
   * Menerima sinkronisasi data dari server tick loop
   */
  public syncFromServer(data: ServerMonsterData): void {
    this.targetX = data.x
    this.targetY = data.y

    // Jika terjadi perubahan HP dari server
    if (this.currentHp !== data.hp) {
      const diff = this.currentHp - data.hp
      if (diff > 0) {
        DamageText.show(this.scene, this.x, this.y - 28, diff, diff >= 15)
        this.setTint(0xff5555)
        this.scene.time.delayedCall(150, () => this.clearTint())
      }
      this.currentHp = data.hp
      this.drawHpBar()
    }

    // Tangani perubahan status mati/hidup
    if (!this.isDead && data.isDead) {
      this.handleDeath()
    } else if (this.isDead && !data.isDead) {
      this.handleRespawn(data.x, data.y)
    }
  }

  /**
   * Menerima serangan (akan diotorisasi sepenuhnya oleh Server di Fase 6)
   */
  public takeDamage(amount: number, _attackerX: number, _attackerY: number): void {
    if (this.isDead) return
    this.currentHp = Math.max(0, this.currentHp - amount)
    DamageText.show(this.scene, this.x, this.y - 28, amount, amount >= 15)
    this.drawHpBar()
    useGameStore.getState().setTargetMonster({
      name: this.monsterName,
      hp: this.currentHp,
      maxHp: this.maxHp,
      level: this.config.type === 'wolf' ? 4 : 1,
    })
    if (this.currentHp === 0) {
      this.handleDeath()
    }
  }

  private handleDeath(): void {
    this.isDead = true
    this.hpBarGraphics.clear()
    this.nameLabel.setVisible(false)

    LevelUpEffect.showExpGain(this.scene, this.x, this.y - 16, this.config.expReward)

    const store = useGameStore.getState()
    store.incrementMonstersDefeated()
    store.addZeny(this.config.zenyReward)
    store.addExp(this.config.expReward)

    this.scene.tweens.add({
      targets: this,
      scaleX: 2.6,
      scaleY: 0.4,
      alpha: 0,
      duration: 320,
      ease: 'Power2',
      onComplete: () => {
        this.setVisible(false)
        this.clearTint()
      },
    })
  }

  private handleRespawn(x: number, y: number): void {
    this.isDead = false
    this.setPosition(x, y)
    this.targetX = x
    this.targetY = y
    this.currentHp = this.maxHp
    this.setScale(0.5)
    this.setAlpha(1)
    this.setVisible(true)
    this.nameLabel.setVisible(true)
    this.nameLabel.setPosition(x, y + 32)
    this.drawHpBar()

    this.scene.tweens.add({
      targets: this,
      scaleX: 2,
      scaleY: 2,
      duration: 250,
      ease: 'Back.easeOut',
    })
  }

  /**
   * Update 60 FPS: Interpolasi pergerakan monster (Lerp)
   */
  public update(): void {
    if (this.isDead || !this.active) return

    const lerpFactor = 0.2
    const dx = this.targetX - this.x
    const dy = this.targetY - this.y
    const distance = Math.hypot(dx, dy)

    if (distance > 0.5) {
      this.x = Phaser.Math.Linear(this.x, this.targetX, lerpFactor)
      this.y = Phaser.Math.Linear(this.y, this.targetY, lerpFactor)
      this.setFlipX(dx > 0)
      this.play(`${this.config.type}_walk`, true)
    } else {
      this.x = this.targetX
      this.y = this.targetY
      this.play(`${this.config.type}_idle`, true)
    }

    this.nameLabel.setPosition(this.x, this.y + 32)
    this.drawHpBar()
  }

  private drawHpBar(): void {
    this.hpBarGraphics.clear()
    if (this.isDead) return

    const barWidth = 36
    const barHeight = 4
    const barX = this.x - barWidth / 2
    const barY = this.y - 32

    // Background Bar Hitam
    this.hpBarGraphics.fillStyle(0x0f172a, 0.85)
    this.hpBarGraphics.fillRoundedRect(barX - 1, barY - 1, barWidth + 2, barHeight + 2, 2)

    // Fill HP Bar (Hijau jika >50%, Kuning jika >20%, Merah jika kritis)
    const hpRatio = Math.max(0, Math.min(1, this.currentHp / this.maxHp))
    let barColor = 0x22c55e
    if (hpRatio < 0.25) {
      barColor = 0xef4444
    } else if (hpRatio < 0.5) {
      barColor = 0xeab308
    }

    this.hpBarGraphics.fillStyle(barColor, 1)
    this.hpBarGraphics.fillRoundedRect(barX, barY, Math.max(2, barWidth * hpRatio), barHeight, 1)
  }

  public override destroy(fromScene?: boolean): void {
    this.hpBarGraphics.destroy()
    this.nameLabel.destroy()
    super.destroy(fromScene)
  }
}
