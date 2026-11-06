import Phaser from 'phaser'
import { useGameStore } from '../../stores/useGameStore'
import { Monster } from './Monster'
import { DamageText } from '../effects/DamageText'
import { ChatBubble } from '../effects/ChatBubble'
import { soundService } from '../../services/soundService'
import { networkService } from '../../services/networkService'

/**
 * Tipe arah hadap karakter (4 arah mata angin).
 */
export type Direction = 'down' | 'left' | 'right' | 'up'

/**
 * Interface untuk tombol pergerakan WASD dan tombol serang Z.
 */
export interface WasdKeys {
  up: Phaser.Input.Keyboard.Key
  down: Phaser.Input.Keyboard.Key
  left: Phaser.Input.Keyboard.Key
  right: Phaser.Input.Keyboard.Key
  attackZ: Phaser.Input.Keyboard.Key
}

/**
 * Entitas Player (Karakter Novice) yang mewarisi Phaser.Physics.Arcade.Sprite.
 * Fase 7: Menambahkan sistem Basic Attack (Space / Z), jangkauan serang (attackRange),
 * jeda serangan (attackCooldown), efek visual tebasan pedang, dan kalkulasi damage acak.
 */
export class Player extends Phaser.Physics.Arcade.Sprite {
  // Kecepatan gerak karakter dalam piksel per detik (px/s)
  public speed = 150

  // Parameter Combat (Jarak jangkauan tebasan & Cooldown antar serangan)
  public attackRange = 85
  public attackCooldown = 400
  private lastAttackTime = 0
  private isAttacking = false

  // Menyimpan arah hadap terakhir
  private lastDirection: Direction = 'down'

  // Label nama yang mengikuti posisi karakter di bawah kakinya
  private nameLabel: Phaser.GameObjects.Text

  // Balon chat aktif di atas kepala
  private currentChatBubble: ChatBubble | null = null

  // Status kebal sesaat setelah terkena hit (Invincibility Frames / i-frames)
  public isInvulnerable = false

  // Throttle jaringan untuk broadcast pergerakan (~20Hz / 50ms)
  private lastNetworkSyncTime = 0
  private lastSyncedX = 0
  private lastSyncedY = 0
  private lastSyncedIsMoving = false

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'novice', 0)

    scene.add.existing(this)
    scene.physics.add.existing(this)

    this.setScale(2)
    this.setCollideWorldBounds(true)

    if (this.body) {
      this.body.setSize(16, 16)
      this.body.setOffset(8, 12)
    }

    this.nameLabel = scene.add
      .text(x, y + 40, 'Novice Adventurer', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#86efac',
        backgroundColor: '#0f172acc',
        padding: { x: 6, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(15)

    this.play('idle_down')
  }

  /**
   * Dipanggil setiap frame (60 FPS) dari MainScene.update().
   * Menangani input pergerakan (WASD / Arrow) serta input serangan (Space / Z).
   */
  public update(
    cursors?: Phaser.Types.Input.Keyboard.CursorKeys,
    wasdKeys?: WasdKeys,
    monstersGroup?: Phaser.Physics.Arcade.Group
  ): void {
    const body = this.body as Phaser.Physics.Arcade.Body | null
    if (!body) return

    const { isChatFocused, isPlayerDead, isAutoFarming } = useGameStore.getState()

    // Jika karakter mati, hentikan pergerakan dan mainkan animasi terbaring/tenggelam
    if (isPlayerDead) {
      this.setVelocity(0, 0)
      this.setTint(0x64748b)
      this.setAlpha(0.6)
      this.setAngle(90) // Karakter roboh ke samping
      this.nameLabel.setText('Novice (DEAD)')
      this.nameLabel.setPosition(this.x, this.y + 40)
      return
    } else if (this.angle !== 0) {
      this.setAngle(0)
      this.setAlpha(1)
      this.clearTint()
    }

    const activeMonsters = (monstersGroup?.getChildren() as Monster[]) ?? []

    // 1. Cek apakah pemain menekan tombol Serang (Space atau Z) — hanya jika tidak sedang mengetik chat
    const spacePressed = !isChatFocused && cursors?.space ? Phaser.Input.Keyboard.JustDown(cursors.space) : false
    const zPressed = !isChatFocused && wasdKeys?.attackZ ? Phaser.Input.Keyboard.JustDown(wasdKeys.attackZ) : false

    if (spacePressed || zPressed) {
      this.attack(activeMonsters)
    }

    // 2. Baca status tombol arah (gabungan Arrow Keys dan WASD) — abaikan jika chat sedang aktif
    const leftPressed = !isChatFocused && Boolean(cursors?.left.isDown || wasdKeys?.left.isDown)
    const rightPressed = !isChatFocused && Boolean(cursors?.right.isDown || wasdKeys?.right.isDown)
    const upPressed = !isChatFocused && Boolean(cursors?.up.isDown || wasdKeys?.up.isDown)
    const downPressed = !isChatFocused && Boolean(cursors?.down.isDown || wasdKeys?.down.isDown)

    const hasManualMovementInput = leftPressed || rightPressed || upPressed || downPressed

    let vx = 0
    let vy = 0

    if (hasManualMovementInput) {
      if (leftPressed) vx -= 1
      if (rightPressed) vx += 1
      if (upPressed) vy -= 1
      if (downPressed) vy += 1
    } else if (isAutoFarming) {
      // Logika Navigasi & Serangan Otomatis (Auto Farming)
      // 1. Cari monster hidup terdekat
      let targetMonster: Monster | null = null
      let minDistance = Infinity

      for (const m of activeMonsters) {
        if (!m.active || m.isDead) continue
        const dist = Phaser.Math.Distance.Between(this.x, this.y, m.x, m.y)
        if (dist < minDistance) {
          minDistance = dist
          targetMonster = m
        }
      }

      if (targetMonster) {
        // Jika sudah dalam jarak serang (attackRange - 10px), serang!
        if (minDistance <= this.attackRange - 5) {
          vx = 0
          vy = 0
          this.attack(activeMonsters)
        } else {
          // Gerak mendekati target monster
          const dx = targetMonster.x - this.x
          const dy = targetMonster.y - this.y
          const angle = Math.atan2(dy, dx)
          vx = Math.cos(angle)
          vy = Math.sin(angle)
        }
      }
    }

    // 3. Terapkan kecepatan dan normalisasi vektor diagonal
    if (vx !== 0 || vy !== 0) {
      this.setVelocity(vx, vy)
      body.velocity.normalize().scale(this.speed)

      if (vy > 0) {
        this.lastDirection = 'down'
      } else if (vy < 0) {
        this.lastDirection = 'up'
      } else if (vx < 0) {
        this.lastDirection = 'left'
      } else if (vx > 0) {
        this.lastDirection = 'right'
      }

      if (!this.isAttacking) {
        this.play(`walk_${this.lastDirection}`, true)
      }
    } else {
      this.setVelocity(0, 0)
      if (!this.isAttacking) {
        this.play(`idle_${this.lastDirection}`, true)
      }
    }

    // 4. Sinkronkan posisi dan teks label nama + level tepat di bawah kaki karakter
    const currentLevel = useGameStore.getState().player.level
    this.nameLabel.setText(`Novice (Lv.${currentLevel})`)
    this.nameLabel.setPosition(this.x, this.y + 40)

    // Perbarui posisi balon chat jika ada
    if (this.currentChatBubble && this.currentChatBubble.active) {
      this.currentChatBubble.updatePosition(this.x, this.y)
    }

    // 5. Kirim data pergerakan ke Game Server via WebSocket (~20 Hz / 50ms interval)
    this.syncMovementNetwork(vx !== 0 || vy !== 0)
  }

  /**
   * Mengirim posisi karakter ke server jika berpindah koordinat atau berubah status gerak
   */
  private syncMovementNetwork(isMoving: boolean): void {
    const now = Date.now()
    const dx = Math.abs(this.x - this.lastSyncedX)
    const dy = Math.abs(this.y - this.lastSyncedY)
    const stateChanged = isMoving !== this.lastSyncedIsMoving

    // Kirim jika interval > 50ms DAN (posisi berpindah > 1.5px ATAU status gerak berubah)
    if ((now - this.lastNetworkSyncTime >= 50 && (dx > 1.5 || dy > 1.5)) || stateChanged) {
      this.lastNetworkSyncTime = now
      this.lastSyncedX = this.x
      this.lastSyncedY = this.y
      this.lastSyncedIsMoving = isMoving

      networkService.sendMovement({
        x: Math.round(this.x),
        y: Math.round(this.y),
        direction: this.lastDirection,
        isMoving
      })
    }
  }

  /**
   * Menerima serangan dari monster agresif (mengurangi HP di Zustand, efek knockback & flash merah).
   */
  public takeDamage(amount: number, attackerX: number, attackerY: number): void {
    if (this.isInvulnerable) return

    this.isInvulnerable = true
    const { soundEnabled } = useGameStore.getState()
    soundService.playPlayerHurt(soundEnabled)

    // Kurangi HP di Zustand (otomatis memicu re-render di React HUD!)
    useGameStore.getState().takeDamage(amount)

    // Tampilkan damage text merah di atas kepala pemain
    DamageText.show(this.scene, this.x, this.y - 28, amount, false)

    // Efek flash merah pada pemain
    this.setTint(0xff5555)
    this.setTintMode(Phaser.TintModes.FILL)

    // Knockback menjauh dari penyerang
    const knockbackAngle = Phaser.Math.Angle.Between(attackerX, attackerY, this.x, this.y)
    this.setVelocity(Math.cos(knockbackAngle) * 160, Math.sin(knockbackAngle) * 160)

    // Setelah 200ms hilangkan tint, setelah 800ms hilangkan invulnerability (i-frames)
    this.scene.time.delayedCall(200, () => {
      this.clearTint()
    })

    // Efek berkedip selama masa kebal
    this.scene.tweens.add({
      targets: this,
      alpha: 0.3,
      yoyo: true,
      repeat: 3,
      duration: 100,
      onComplete: () => {
        this.setAlpha(1)
        this.isInvulnerable = false
      },
    })
  }

  /**
   * Melakukan serangan dasar (Basic Attack):
   * - Memvalidasi cooldown agar tidak bisa spam tanpa jeda.
   * - Menampilkan efek visual busur tebasan (slash arc) di depan karakter.
   * - Mencari monster hidup terdekat di dalam radius `attackRange`.
   * - Menghitung damage: BaseATK ± Variasi Acak (-2 s/d +4).
   */
  public attack(monsters: Monster[]): void {
    const now = this.scene.time.now

    // Cek apakah masih dalam masa jeda (cooldown 400ms)
    if (now - this.lastAttackTime < this.attackCooldown) {
      return
    }

    this.lastAttackTime = now
    this.isAttacking = true

    // Cari monster hidup terdekat di sekitar pemain
    let closestMonster: Monster | null = null
    let minDistance = this.attackRange

    for (const monster of monsters) {
      if (monster.isDead || !monster.active) continue

      const dist = Phaser.Math.Distance.Between(this.x, this.y, monster.x, monster.y)
      if (dist <= minDistance) {
        minDistance = dist
        closestMonster = monster
      }
    }

    // Jika ada monster di dalam jangkauan, otomatis hadapkan karakter ke arah monster tersebut
    if (closestMonster) {
      const dx = closestMonster.x - this.x
      const dy = closestMonster.y - this.y
      if (Math.abs(dx) > Math.abs(dy)) {
        this.lastDirection = dx >= 0 ? 'right' : 'left'
      } else {
        this.lastDirection = dy >= 0 ? 'down' : 'up'
      }
    }

    // Mainkan animasi ayunan langkah/serang singkat & efek busur pedang
    this.play(`walk_${this.lastDirection}`, true)
    this.drawSlashEffect(this.lastDirection)

    // Efek dorongan badan sedikit maju saat menebas (lunge tween)
    this.scene.time.delayedCall(180, () => {
      this.isAttacking = false
    })

    // Kirim request serangan Authoritative ke Server Game
    const { soundEnabled } = useGameStore.getState()
    if (closestMonster) {
      soundService.playHit(soundEnabled)
      networkService.sendAttack({
        targetMonsterId: closestMonster.id
      })
    } else {
      // Jika menebas angin (tidak ada monster dalam radius 85px), mainkan suara swing & indikator MISS
      soundService.playSwing(soundEnabled)
      const offset = this.getDirectionOffset(this.lastDirection, 36)
      DamageText.show(this.scene, this.x + offset.x, this.y + offset.y - 10, 0, false)
    }
  }

  /**
   * Menggambar efek visual tebasan belati/pedang Novice (slash arc) di arah hadap karakter.
   */
  private drawSlashEffect(dir: Direction): void {
    const offset = this.getDirectionOffset(dir, 30)
    const slashX = this.x + offset.x
    const slashY = this.y + offset.y

    const slashGraphics = this.scene.add.graphics()
    slashGraphics.setPosition(slashX, slashY)
    slashGraphics.setDepth(25)

    // Gambar sabit tebasan putih-kuning bercahaya
    slashGraphics.lineStyle(5, 0xfef08a, 0.95)
    slashGraphics.beginPath()

    if (dir === 'down') {
      slashGraphics.arc(0, 0, 24, Phaser.Math.DegToRad(20), Phaser.Math.DegToRad(160), false)
    } else if (dir === 'up') {
      slashGraphics.arc(0, 0, 24, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(340), false)
    } else if (dir === 'left') {
      slashGraphics.arc(0, 0, 24, Phaser.Math.DegToRad(110), Phaser.Math.DegToRad(250), false)
    } else {
      slashGraphics.arc(0, 0, 24, Phaser.Math.DegToRad(-70), Phaser.Math.DegToRad(70), false)
    }

    slashGraphics.strokePath()

    // Animasi membesar & menghilang dalam 160ms
    this.scene.tweens.add({
      targets: slashGraphics,
      scaleX: 1.35,
      scaleY: 1.35,
      alpha: 0,
      duration: 160,
      ease: 'Quad.easeOut',
      onComplete: () => {
        slashGraphics.destroy()
      },
    })
  }

  /**
   * Menampilkan balon teks chat di atas kepala karakter
   */
  public showChatBubble(text: string): void {
    if (this.currentChatBubble) {
      this.currentChatBubble.destroy()
    }
    this.currentChatBubble = new ChatBubble(this.scene, this.x, this.y - 56, text)
  }

  /**
   * Helper menghitung titik koordinat di depan karakter sesuai arah hadap.
   */
  private getDirectionOffset(dir: Direction, distance: number): { x: number; y: number } {
    switch (dir) {
      case 'up':
        return { x: 0, y: -distance }
      case 'down':
        return { x: 0, y: distance }
      case 'left':
        return { x: -distance, y: 0 }
      case 'right':
        return { x: distance, y: 0 }
    }
  }
}
