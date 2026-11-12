import Phaser from 'phaser'
import { useGameStore } from '../../stores/useGameStore'
import { Player, type WasdKeys } from '../entities/Player'
import { RemotePlayer } from '../entities/RemotePlayer'
import { Monster } from '../entities/Monster'
import { GroundItem } from '../entities/GroundItem'
import { networkService } from '../../services/networkService'
import type { PlayerData, CombatHitBroadcast, PlayerRewardBroadcast, GroundItemData, LootPickedBroadcast, CharacterSyncPayload } from '../../types/network'

/**
 * Koordinat rintangan (pohon, batu, & pilar latihan) di dalam arena Prontera (1600x1200 px).
 */
interface ObstaclePlacement {
  x: number
  y: number
  type: 'tree' | 'rock' | 'pillar'
}

const ARENA_OBSTACLES: ObstaclePlacement[] = [
  // Area Kiri Atas
  { x: 260, y: 220, type: 'tree' },
  { x: 420, y: 300, type: 'rock' },
  { x: 220, y: 450, type: 'tree' },

  // Area Kanan Atas
  { x: 1180, y: 240, type: 'tree' },
  { x: 1350, y: 320, type: 'tree' },
  { x: 1080, y: 360, type: 'rock' },

  // Sekitar Tengah Arena (Prontera Training Ground Plaza)
  { x: 620, y: 460, type: 'pillar' },
  { x: 980, y: 460, type: 'pillar' },
  { x: 620, y: 740, type: 'pillar' },
  { x: 980, y: 740, type: 'pillar' },

  // Area Kiri Bawah
  { x: 300, y: 820, type: 'tree' },
  { x: 480, y: 950, type: 'rock' },
  { x: 240, y: 1020, type: 'tree' },

  // Area Kanan Bawah
  { x: 1280, y: 860, type: 'tree' },
  { x: 1120, y: 960, type: 'rock' },
  { x: 1380, y: 1040, type: 'tree' },
]

/**
 * MainScene — Scene utama untuk arena permainan Mini Ragnarok.
 * Fase 5: Authoritative Monster System (Server-Driven Poring & Desert Wolves).
 */
export class MainScene extends Phaser.Scene {
  private readonly worldWidth = 1600
  private readonly worldHeight = 1200

  private player?: Player
  private obstacles?: Phaser.Physics.Arcade.StaticGroup
  private monsters?: Phaser.Physics.Arcade.Group
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys
  private wasdKeys?: WasdKeys
  private fpsText?: Phaser.GameObjects.Text
  private helpText?: Phaser.GameObjects.Text
  private remotePlayers: Map<string, RemotePlayer> = new Map()
  private serverMonsters: Map<string, Monster> = new Map()
  private groundItemsMap: Map<string, GroundItem> = new Map()
  private cleanupNetworkListeners?: () => void

  constructor() {
    super({ key: 'MainScene' })
  }

  /**
   * 1. PRELOAD: Memuat spritesheet karakter Novice dan monster Poring ke dalam memori Phaser.
   */
  preload(): void {
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.error(`[Phaser Loader] Gagal memuat aset: ${file.key} dari ${file.url}`)
    })

    this.load.spritesheet('novice', '/assets/characters/novice.png', {
      frameWidth: 32,
      frameHeight: 32,
    })

    this.load.spritesheet('poring', '/assets/monsters/poring.png', {
      frameWidth: 32,
      frameHeight: 32,
    })

    this.load.spritesheet('wolf', '/assets/monsters/wolf.png', {
      frameWidth: 32,
      frameHeight: 32,
    })
  }

  /**
   * 2. CREATE: Membangun map, rintangan, karakter pemain, dan grup monster Poring.
   */
  create(): void {
    const { width: viewportWidth, height: viewportHeight } = this.scale

    // 1. Atur batas dunia fisika (Physics World Bounds) ke 1600x1200 px
    this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight)

    // 2. Buat tekstur prosedural untuk pohon, batu, dan pilar latihan
    this.createEnvironmentTextures()

    // 3. Gambar lantai arena
    this.drawArenaGround()

    // 4. Bangun grup rintangan statis (StaticGroup)
    this.obstacles = this.physics.add.staticGroup()
    this.spawnObstacles()

    // 5. Daftarkan animasi karakter Novice dan animasi monster Poring
    this.createCharacterAnimations()
    this.createMonsterAnimations()

    // 6. Munculkan karakter Player tepat di tengah dunia (800, 600)
    const startX = this.worldWidth / 2
    const startY = this.worldHeight / 2
    this.player = new Player(this, startX, startY)
    this.player.setDepth(10)

    // 7. Buat Physics Group untuk menampung para monster (Server-Driven)
    this.monsters = this.physics.add.group()

    // 8. Daftarkan Collider:
    // - Player vs Obstacles (pohon/batu/pilar)
    // - Monsters vs Obstacles (agar Poring memantul saat menabrak pohon/pilar)
    // - Monsters vs Monsters (agar sesama Poring tidak saling menumpuk)
    this.physics.add.collider(this.player, this.obstacles)
    this.physics.add.collider(this.monsters, this.obstacles)
    this.physics.add.collider(this.monsters, this.monsters)

    // 9. Konfigurasi Kamera Utama mengikuti Player
    this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight)
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1)
    this.cameras.main.setDeadzone(80, 60)

    // 10. Siapkan input Keyboard (Arrow Keys, WASD, serta Space/Z untuk Basic Attack)
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys()
      this.wasdKeys = this.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D,
        attackZ: Phaser.Input.Keyboard.KeyCodes.Z,
      }) as WasdKeys
    }

    // 11. UI Overlay di dalam Canvas
    this.fpsText = this.add
      .text(12, 12, 'FPS: 60 | Porings: 6', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#fef08a',
        backgroundColor: '#0f172acc',
        padding: { x: 8, y: 4 },
      })
      .setScrollFactor(0)
      .setDepth(100)

    this.helpText = this.add
      .text(
        viewportWidth / 2,
        viewportHeight - 18,
        'WASD/Arrow: Jalan | SPACE atau Z: Serang Poring terdekat (Range: 85px)',
        {
          fontFamily: 'monospace',
          fontSize: '11px',
          color: '#fde047',
          backgroundColor: '#0f172acc',
          padding: { x: 10, y: 4 },
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(100)

    // Handle resize event dari Phaser Scale Manager agar kamera dan elemen layar tetap responsif
    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      const { width, height } = gameSize
      this.cameras.main.setViewport(0, 0, width, height)
      if (this.helpText) {
        this.helpText.setPosition(width / 2, height - 18)
      }
    })

    // Beri tahu Zustand store bahwa Phaser sudah siap
    useGameStore.getState().setGameReady(true)

    // 12. Setup Multiplayer Network Listeners (Fase 2)
    this.setupNetworkListeners()
  }

  /**
   * Menyiapkan pendengar event WebSocket untuk Remote Players
   */
  private setupNetworkListeners(): void {
    // A. Terima daftar semua pemain yang sudah online saat kita masuk
    const unsubCurrent = networkService.onCurrentPlayers((players: PlayerData[]) => {
      const currentSocketId = networkService.getSocket()?.id
      for (const p of players) {
        if (p.id !== currentSocketId && !this.remotePlayers.has(p.id)) {
          this.addRemotePlayer(p)
        }
      }
      useGameStore.getState().setOnlineCount(this.remotePlayers.size + 1)
    })

    // B. Ada pemain lain yang baru bergabung
    const unsubJoin = networkService.onPlayerJoined((player: PlayerData) => {
      const currentSocketId = networkService.getSocket()?.id
      if (player.id !== currentSocketId && !this.remotePlayers.has(player.id)) {
        this.addRemotePlayer(player)
        useGameStore.getState().setOnlineCount(this.remotePlayers.size + 1)
      }
    })

    // C. Ada pemain yang disconnect/keluar
    const unsubLeft = networkService.onPlayerLeft((id: string) => {
      const remote = this.remotePlayers.get(id)
      if (remote) {
        remote.destroy(true)
        this.remotePlayers.delete(id)
        useGameStore.getState().setOnlineCount(this.remotePlayers.size + 1)
      }
    })

    // D. Sinkronisasi pergerakan pemain lain (Lerp & Animasi hadap)
    const unsubMoved = networkService.onPlayerMoved((data) => {
      const remote = this.remotePlayers.get(data.id)
      if (remote) {
        remote.setTargetPosition(data)
      }
    })

    // E. Terima pesan chat untuk memunculkan Balon Teks (Chat Bubble)
    const unsubChat = networkService.onChatMessage((msg) => {
      useGameStore.getState().addChatMessage(msg)

      const myId = networkService.getSocket()?.id
      if (msg.senderId === myId) {
        // Balon chat untuk pemain lokal
        this.player?.showChatBubble(msg.text)
      } else {
        // Balon chat untuk remote player
        const remote = this.remotePlayers.get(msg.senderId)
        if (remote) {
          remote.showChatBubble(msg.text)
        }
      }
    })

    // F. Sinkronisasi Seluruh Monster dari Server (Fase 5)
    const unsubMonsters = networkService.onMonstersUpdate((monsterList) => {
      for (const mData of monsterList) {
        let m = this.serverMonsters.get(mData.id)
        if (!m) {
          m = new Monster(this, mData)
          this.serverMonsters.set(mData.id, m)
          if (this.monsters) {
            this.monsters.add(m)
          }
        } else {
          m.syncFromServer(mData)
        }
      }
    })

    // G. Efek Serangan & Hit Synchronized (Fase 6)
    const unsubHit = networkService.onCombatHit((data: CombatHitBroadcast) => {
      const myId = networkService.getSocket()?.id

      if (data.targetType === 'monster') {
        const monster = this.serverMonsters.get(data.targetId)
        if (monster) {
          monster.takeDamage(data.damage, 0, 0)
        }
      } else if (data.targetType === 'player') {
        if (data.targetId === myId && this.player) {
          const attackerMonster = this.serverMonsters.get(data.attackerId)
          const atkX = attackerMonster?.x ?? this.player.x
          const atkY = attackerMonster?.y ?? this.player.y
          this.player.takeDamage(data.damage, atkX, atkY)
        }
      }
    })

    // H. Reward EXP & Zeny dari Server
    const unsubReward = networkService.onPlayerReward((reward: PlayerRewardBroadcast) => {
      const store = useGameStore.getState()
      store.addZeny(reward.zenyGained)
      store.incrementMonstersDefeated()
      const didLevelUp = store.addExp(reward.expGained)
      if (didLevelUp && this.player) {
        import('../effects/LevelUpEffect').then(({ LevelUpEffect }) => {
          LevelUpEffect.show(this, this.player!.x, this.player!.y, store.player.level)
        })
      }
    })

    // I. Sinkronisasi Loot Drops di Tanah (Fase 7)
    const unsubLootCurrent = networkService.onLootCurrent((items: GroundItemData[]) => {
      for (const item of items) {
        if (!this.groundItemsMap.has(item.id)) {
          const gItem = new GroundItem(this, item)
          this.groundItemsMap.set(item.id, gItem)
        }
      }
    })

    const unsubLootSpawn = networkService.onLootSpawn((loot: GroundItemData) => {
      if (!this.groundItemsMap.has(loot.id)) {
        const gItem = new GroundItem(this, loot)
        this.groundItemsMap.set(loot.id, gItem)
      }
    })

    const unsubLootPicked = networkService.onLootPicked((data: LootPickedBroadcast) => {
      const gItem = this.groundItemsMap.get(data.groundItemId)
      if (gItem) {
        gItem.playPickupAnimation(() => {
          this.groundItemsMap.delete(data.groundItemId)
        })
      }

      const myId = networkService.getSocket()?.id
      if (data.pickerId === myId) {
        // Tambahkan ke inventaris pemain lokal di Zustand
        useGameStore.getState().addItemToInventory(data.item.itemId, data.item.name)
      }
    })

    // J. Data Karakter Dimuat dari SQLite Server (Fase 8)
    const unsubCharLoaded = networkService.onCharacterLoaded((char: CharacterSyncPayload) => {
      useGameStore.getState().loadServerCharacter(char)
      if (this.player) {
        this.player.setPosition(char.x, char.y)
      }
    })

    this.cleanupNetworkListeners = () => {
      unsubCurrent()
      unsubJoin()
      unsubLeft()
      unsubMoved()
      unsubChat()
      unsubMonsters()
      unsubHit()
      unsubReward()
      unsubLootCurrent()
      unsubLootSpawn()
      unsubLootPicked()
      unsubCharLoaded()
      this.remotePlayers.forEach((p) => p.destroy(true))
      this.remotePlayers.clear()
      this.serverMonsters.forEach((m) => m.destroy(true))
      this.serverMonsters.clear()
      this.groundItemsMap.forEach((i) => i.destroy(true))
      this.groundItemsMap.clear()
    }

    // Jika socket sudah terhubung sebelum scene di-mount, minta daftar pemain
    if (networkService.getIsConnected() && this.player) {
      const store = useGameStore.getState()
      networkService.joinGame({
        username: store.accountUsername,
        name: store.player.name,
        level: store.player.level,
        hp: store.player.hp,
        maxHp: store.player.maxHp,
        x: Math.round(this.player.x),
        y: Math.round(this.player.y)
      })
    }
  }

  /**
   * Menambahkan entitas pemain lain ke arena
   */
  private addRemotePlayer(data: PlayerData): void {
    const remote = new RemotePlayer(this, data)
    this.remotePlayers.set(data.id, remote)

    // Tambahkan collision remote player dengan rintangan agar natural
    if (this.obstacles) {
      this.physics.add.collider(remote, this.obstacles)
    }
  }

  /**
   * Mendaftarkan animasi monster Poring dan Desert Wolf.
   */
  private createMonsterAnimations(): void {
    if (!this.anims.exists('poring_idle')) {
      this.anims.create({
        key: 'poring_idle',
        frames: this.anims.generateFrameNumbers('poring', { frames: [0, 1, 3, 0] }),
        frameRate: 4,
        repeat: -1,
      })
    }

    if (!this.anims.exists('poring_walk')) {
      this.anims.create({
        key: 'poring_walk',
        frames: this.anims.generateFrameNumbers('poring', { start: 0, end: 3 }),
        frameRate: 7,
        repeat: -1,
      })
    }

    // Animasi Serigala Gurun (Desert Wolf)
    if (!this.anims.exists('wolf_idle')) {
      this.anims.create({
        key: 'wolf_idle',
        frames: this.anims.generateFrameNumbers('wolf', { frames: [0, 1] }),
        frameRate: 3,
        repeat: -1,
      })
    }

    if (!this.anims.exists('wolf_walk')) {
      this.anims.create({
        key: 'wolf_walk',
        frames: this.anims.generateFrameNumbers('wolf', { start: 0, end: 3 }),
        frameRate: 9,
        repeat: -1,
      })
    }
  }

  /**
   * Menggambar permukaan tanah, jalan setapak tengah, grid tile, dan pagar keliling arena.
   */
  private drawArenaGround(): void {
    this.cameras.main.setBackgroundColor('#5c9e42')

    const ground = this.add.graphics()

    const tileSize = 32
    ground.lineStyle(1, 0x4e8a36, 0.45)
    for (let x = 0; x <= this.worldWidth; x += tileSize) {
      ground.moveTo(x, 0)
      ground.lineTo(x, this.worldHeight)
    }
    for (let y = 0; y <= this.worldHeight; y += tileSize) {
      ground.moveTo(0, y)
      ground.lineTo(this.worldWidth, y)
    }
    ground.strokePath()

    ground.fillStyle(0xc2a675, 1)
    ground.fillRect(0, this.worldHeight / 2 - 48, this.worldWidth, 96)
    ground.fillRect(this.worldWidth / 2 - 48, 0, 96, this.worldHeight)

    ground.fillStyle(0x94a3b8, 1)
    ground.fillRoundedRect(
      this.worldWidth / 2 - 180,
      this.worldHeight / 2 - 140,
      360,
      280,
      12
    )
    ground.lineStyle(4, 0x64748b, 1)
    ground.strokeRoundedRect(
      this.worldWidth / 2 - 180,
      this.worldHeight / 2 - 140,
      360,
      280,
      12
    )

    ground.lineStyle(16, 0x5c4033, 1)
    ground.strokeRect(8, 8, this.worldWidth - 16, this.worldHeight - 16)
  }

  /**
   * Membuat tekstur pixel-art untuk pohon, batu, dan pilar latihan.
   */
  private createEnvironmentTextures(): void {
    if (!this.textures.exists('obstacle_tree')) {
      const g = this.make.graphics({ x: 0, y: 0 })
      g.fillStyle(0x000000, 0.25)
      g.fillEllipse(32, 58, 44, 14)
      g.fillStyle(0x6b4423, 1)
      g.fillRect(24, 36, 16, 22)
      g.fillStyle(0x2d6a3e, 1)
      g.fillCircle(32, 26, 24)
      g.fillStyle(0x3b854f, 1)
      g.fillCircle(26, 22, 18)
      g.fillCircle(38, 24, 16)
      g.generateTexture('obstacle_tree', 64, 64)
      g.destroy()
    }

    if (!this.textures.exists('obstacle_rock')) {
      const g = this.make.graphics({ x: 0, y: 0 })
      g.fillStyle(0x000000, 0.25)
      g.fillEllipse(24, 40, 38, 12)
      g.fillStyle(0x64748b, 1)
      g.fillRoundedRect(6, 12, 36, 28, 8)
      g.fillStyle(0x94a3b8, 1)
      g.fillRoundedRect(10, 14, 26, 16, 6)
      g.generateTexture('obstacle_rock', 48, 48)
      g.destroy()
    }

    if (!this.textures.exists('obstacle_pillar')) {
      const g = this.make.graphics({ x: 0, y: 0 })
      g.fillStyle(0x000000, 0.25)
      g.fillEllipse(24, 56, 36, 12)
      g.fillStyle(0xcbd5e1, 1)
      g.fillRect(10, 10, 28, 46)
      g.fillStyle(0x94a3b8, 1)
      g.fillRect(6, 8, 36, 8)
      g.fillRect(6, 48, 36, 10)
      g.generateTexture('obstacle_pillar', 48, 64)
      g.destroy()
    }
  }

  /**
   * Menempatkan rintangan statis di koordinat map.
   */
  private spawnObstacles(): void {
    if (!this.obstacles) return

    for (const item of ARENA_OBSTACLES) {
      const textureKey = `obstacle_${item.type}`
      const obstacle = this.obstacles.create(
        item.x,
        item.y,
        textureKey
      ) as Phaser.Physics.Arcade.Sprite

      obstacle.setDepth(5)

      const body = obstacle.body as Phaser.Physics.Arcade.StaticBody | null
      if (body) {
        if (item.type === 'tree') {
          body.setSize(28, 22)
          body.setOffset(18, 36)
        } else if (item.type === 'rock') {
          body.setSize(34, 22)
          body.setOffset(7, 18)
        } else if (item.type === 'pillar') {
          body.setSize(32, 24)
          body.setOffset(8, 34)
        }
      }
    }
  }

  /**
   * Mendaftarkan animasi karakter (Mendukung 8 Arah Lengkap Termasuk Serong & 4 Arah Kardinal).
   */
  private createCharacterAnimations(): void {
    const noviceTexture = this.textures.get('novice')
    // frameTotal termasuk frame '__BASE__', kurangi 1 untuk mendapatkan frame spritesheet sebenarnya
    const actualFrames = noviceTexture ? noviceTexture.frameTotal - 1 : 16
    const hasEightDirections = actualFrames >= 32

    // Urutan 8 Arah Clockwise sesuai standar RO: Bawah, Kiri Bawah, Kiri, Kiri Atas, Atas, Kanan Atas, Kanan, Kanan Bawah
    const directions8 = hasEightDirections
      ? [
          { dir: 'down', startRowFrame: 0 },
          { dir: 'down_left', startRowFrame: 4 },
          { dir: 'left', startRowFrame: 8 },
          { dir: 'up_left', startRowFrame: 12 },
          { dir: 'up', startRowFrame: 16 },
          { dir: 'up_right', startRowFrame: 20 },
          { dir: 'right', startRowFrame: 24 },
          { dir: 'down_right', startRowFrame: 28 },
        ]
      : [
          // Fallback cerdas untuk spritesheet 4 arah retro (16 frame)
          { dir: 'down', startRowFrame: 0 },
          { dir: 'down_left', startRowFrame: 0 },
          { dir: 'left', startRowFrame: 4 },
          { dir: 'up_left', startRowFrame: 12 },
          { dir: 'up', startRowFrame: 12 },
          { dir: 'up_right', startRowFrame: 12 },
          { dir: 'right', startRowFrame: 8 },
          { dir: 'down_right', startRowFrame: 0 },
        ]

    for (const { dir, startRowFrame } of directions8) {
      const idleKey = `idle_${dir}`
      const walkKey = `walk_${dir}`

      if (!this.anims.exists(idleKey)) {
        this.anims.create({
          key: idleKey,
          frames: [{ key: 'novice', frame: startRowFrame }],
          frameRate: 1,
          repeat: -1,
        })
      }

      if (!this.anims.exists(walkKey)) {
        this.anims.create({
          key: walkKey,
          frames: this.anims.generateFrameNumbers('novice', {
            start: startRowFrame,
            end: startRowFrame + 3,
          }),
          frameRate: 8,
          repeat: -1,
        })
      }
    }
  }

  /**
   * 3. UPDATE: Game Loop 60 FPS
   */
  update(_time: number, _delta: number): void {
    const storeState = useGameStore.getState()

    // Sinkronkan status Pause dari React HUD ke Physics World Phaser
    if (storeState.isPaused) {
      if (!this.physics.world.isPaused) {
        this.physics.world.pause()
      }
      return
    } else if (this.physics.world.isPaused) {
      this.physics.world.resume()
    }

    this.player?.update(this.cursors, this.wasdKeys, this.monsters)

    // Update Remote Players nameplate & state
    this.remotePlayers.forEach((remote) => {
      remote.update()
    })

    // Update seluruh monster server-driven (Lerp & Animasi)
    let aliveMonsters = 0
    this.serverMonsters.forEach((monster) => {
      monster.update()
      if (!monster.isDead) aliveMonsters += 1
    })

    // Auto-pickup check jika karakter pemain melangkah dekat ke ground item (radius 36px)
    if (this.player && this.groundItemsMap.size > 0) {
      this.groundItemsMap.forEach((gItem) => {
        const dist = Phaser.Math.Distance.Between(this.player!.x, this.player!.y, gItem.x, gItem.y)
        if (dist <= 36) {
          networkService.sendPickupLoot({ groundItemId: gItem.id })
        }
      })
    }

    // Sinkronisasi auto-save ke SQLite Server setiap 5 detik
    if (this.player && this.time.now % 300 === 0) {
      const store = useGameStore.getState()
      networkService.saveCharacter({
        username: store.accountUsername,
        name: store.player.name,
        level: store.player.level,
        hp: store.player.hp,
        maxHp: store.player.maxHp,
        exp: store.player.exp,
        maxExp: store.player.maxExp,
        baseAtk: store.player.baseAtk,
        zeny: store.player.zeny,
        x: Math.round(this.player.x),
        y: Math.round(this.player.y),
        inventory: store.inventory
      })
    }

    if (this.fpsText && this.game.loop && this.player) {
      const currentFps = Math.round(this.game.loop.actualFps)
      const posX = Math.round(this.player.x)
      const posY = Math.round(this.player.y)
      const defeated = useGameStore.getState().monstersDefeated
      this.fpsText.setText(
        `FPS: ${currentFps} | Pos: (${posX}, ${posY}) | Online: ${this.remotePlayers.size + 1} | Monsters: ${aliveMonsters}/10 | Defeated: ${defeated}`
      )
    }
  }

  /**
   * Cleanup saat scene ditutup/dimatikan
   */
  destroy(): void {
    if (this.cleanupNetworkListeners) {
      this.cleanupNetworkListeners()
    }
  }
}
