import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import {
  PlayerData,
  JoinPayload,
  PlayerMovePayload,
  PlayerMovedBroadcast,
  ChatMessage,
  ServerMonsterData,
  PlayerAttackPayload,
  CombatHitBroadcast,
  PlayerRewardBroadcast,
  GroundItemData,
  PickupLootPayload,
  LootPickedBroadcast,
  ItemType,
  CharacterSyncPayload
} from './types.js';
import { ServerMonster } from './ServerMonster.js';
import { dbService } from './db.js';

const app = express();
app.use(cors());

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    onlinePlayers: players.size,
    time: new Date().toISOString()
  });
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3001;
const TICK_RATE = 20;

// In-Memory Storage untuk Pemain yang Sedang Online
const players = new Map<string, PlayerData>();

// Inisialisasi Daftar Monster Server (Prontera Training Ground)
const MONSTER_SPAWNS = [
  // 6 Poring Pasif di Sekitar Taman & Plaza
  { id: 'poring-1', type: 'poring' as const, x: 520, y: 580 },
  { id: 'poring-2', type: 'poring' as const, x: 700, y: 380 },
  { id: 'poring-3', type: 'poring' as const, x: 900, y: 520 },
  { id: 'poring-4', type: 'poring' as const, x: 620, y: 840 },
  { id: 'poring-5', type: 'poring' as const, x: 1080, y: 680 },
  { id: 'poring-6', type: 'poring' as const, x: 960, y: 880 },

  // 4 Serigala Gurun Agresif di Pinggir & Sudut Arena
  { id: 'wolf-1', type: 'wolf' as const, x: 380, y: 380 },
  { id: 'wolf-2', type: 'wolf' as const, x: 1220, y: 380 },
  { id: 'wolf-3', type: 'wolf' as const, x: 420, y: 780 },
  { id: 'wolf-4', type: 'wolf' as const, x: 1180, y: 780 },
];

const monsters = new Map<string, ServerMonster>();
for (const s of MONSTER_SPAWNS) {
  monsters.set(s.id, new ServerMonster(s.id, s.type, s.x, s.y));
}

// In-Memory Storage untuk Ground Items (Loot Drops)
const groundItems = new Map<string, GroundItemData>();

function spawnGroundLoot(x: number, y: number, itemId: ItemType, name: string): GroundItemData {
  const loot: GroundItemData = {
    id: `loot-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    itemId,
    name,
    x: x + Math.floor(Math.random() * 24) - 12,
    y: y + Math.floor(Math.random() * 24) - 12,
    quantity: 1,
    spawnTime: Date.now()
  };
  groundItems.set(loot.id, loot);
  io.emit('loot:spawned', loot);
  return loot;
}

io.on('connection', (socket: Socket) => {
  console.log(`[MMO Server] Socket terhubung: ${socket.id}`);

  // 1. Kirim pesan selamat datang
  socket.emit('server:welcome', {
    message: 'Selamat datang di Mini Ragnarok MMORPG Server!',
    socketId: socket.id,
    serverTime: Date.now()
  });

  // 2. Event saat pemain login / bergabung ke arena (Database SQLite Authentication)
  socket.on('player:join', (payload: JoinPayload) => {
    const username = payload.username || `novice_${socket.id.slice(0, 4)}`;
    const dbChar = dbService.getOrCreateAccount(username);

    const newPlayer: PlayerData = {
      id: socket.id,
      name: dbChar.name,
      x: dbChar.pos_x,
      y: dbChar.pos_y,
      level: dbChar.level,
      hp: dbChar.hp,
      maxHp: dbChar.max_hp,
      direction: 'down'
    };

    // Simpan ke daftar pemain online
    players.set(socket.id, newPlayer);
    console.log(`[MMO Server] Akun '${dbChar.username}' (${dbChar.name}) login dari DB di (${newPlayer.x}, ${newPlayer.y}). Level: ${dbChar.level}, Zeny: ${dbChar.zeny}`);

    // Kirim data lengkap karakter dari database ke client pemain
    let parsedInventory = [];
    try {
      parsedInventory = JSON.parse(dbChar.inventory_json);
    } catch {
      parsedInventory = [];
    }

    socket.emit('character:loaded', {
      username: dbChar.username,
      name: dbChar.name,
      level: dbChar.level,
      hp: dbChar.hp,
      maxHp: dbChar.max_hp,
      exp: dbChar.exp,
      maxExp: dbChar.max_exp,
      baseAtk: dbChar.base_atk,
      zeny: dbChar.zeny,
      x: dbChar.pos_x,
      y: dbChar.pos_y,
      inventory: parsedInventory
    });

    // A. Kirim daftar semua pemain online saat ini HANYA ke pemain baru tersebut
    const onlineList = Array.from(players.values());
    socket.emit('current:players', onlineList);

    // Kirim seluruh status monster ke pemain yang baru bergabung
    const monsterList = Array.from(monsters.values()).map(m => m.toJSON());
    socket.emit('monsters:init', monsterList);

    // Kirim seluruh loot di tanah ke pemain yang baru bergabung
    socket.emit('loot:current', Array.from(groundItems.values()));

    // B. Broadcast kemunculan pemain baru ke SEMUA pemain lain yang sudah ada di arena
    socket.broadcast.emit('player:joined', newPlayer);
  });

  // Event Sinkronisasi Penyimpanan Progres ke SQLite Database
  socket.on('character:save', (payload: CharacterSyncPayload) => {
    dbService.saveCharacterProgress({
      username: payload.username,
      level: payload.level,
      hp: payload.hp,
      maxHp: payload.maxHp,
      exp: payload.exp,
      maxExp: payload.maxExp,
      baseAtk: payload.baseAtk,
      zeny: payload.zeny,
      posX: payload.x,
      posY: payload.y,
      inventoryJson: JSON.stringify(payload.inventory)
    });
    console.log(`[MMO DB] Progres karakter '${payload.username}' tersimpan ke SQLite.`);
  });

  // 3. Event perpindahan posisi pemain (WASD Movement Sync)
  socket.on('player:move', (payload: PlayerMovePayload) => {
    const existing = players.get(socket.id);
    if (!existing) return;

    // Authoritative Boundary Check: Batas peta Prontera (0 s/d 1600 x, 0 s/d 1200 y)
    const clampedX = Math.max(30, Math.min(1570, payload.x));
    const clampedY = Math.max(30, Math.min(1170, payload.y));

    // Perbarui posisi di memory server
    existing.x = clampedX;
    existing.y = clampedY;
    existing.direction = payload.direction;

    const moveBroadcast: PlayerMovedBroadcast = {
      id: socket.id,
      x: clampedX,
      y: clampedY,
      direction: payload.direction,
      isMoving: payload.isMoving
    };

    // Broadcast ke SEMUA pemain lain (kecuali pengirim)
    socket.broadcast.emit('player:moved', moveBroadcast);
  });

  // 4. Event pemain menyerang (Authoritative Combat & Anti-Cheat Validation)
  socket.on('player:attack', (payload: PlayerAttackPayload) => {
    const attacker = players.get(socket.id);
    if (!attacker) return;

    if (!payload.targetMonsterId) return;
    const monster = monsters.get(payload.targetMonsterId);
    if (!monster || monster.isDead) return;

    // ANTI-CHEAT CHECK 1: Jarak serang maksimal (85px + 20px latency buffer = 105px)
    const distance = Math.hypot(monster.x - attacker.x, monster.y - attacker.y);
    if (distance > 105) {
      console.warn(`[Anti-Cheat Blocked] Pemain ${attacker.name} mencoba menyerang dari jarak ${Math.round(distance)}px (Maks: 105px)`);
      return;
    }

    // Server-Authoritative Damage Calculation
    const baseAtk = 12 + (attacker.level - 1) * 2;
    const variance = Math.floor(Math.random() * 7) - 2; // -2 s/d +4
    const finalDamage = Math.max(1, baseAtk + variance);
    const isCritical = finalDamage >= 16;

    const { isDead, remainingHp } = monster.takeDamage(finalDamage);

    console.log(`[Combat] ${attacker.name} menyerang ${monster.name} -> ${finalDamage} DMG (Sisa HP: ${remainingHp})`);

    const hitPacket: CombatHitBroadcast = {
      attackerId: socket.id,
      targetId: monster.id,
      targetType: 'monster',
      damage: finalDamage,
      isCritical,
      remainingHp,
      isDead
    };

    // Broadcast efek hit ke semua pemain
    io.emit('combat:hit', hitPacket);

    // Jika monster mati oleh serangan pemain ini, berikan EXP & Zeny reward serta jatuhkan Item Loot
    if (isDead) {
      const rewardPacket: PlayerRewardBroadcast = {
        playerId: socket.id,
        expGained: monster.config.expReward,
        zenyGained: monster.config.zenyReward,
        monsterName: monster.name
      };
      socket.emit('player:reward', rewardPacket);

      // Probabilitas Drop Item:
      // Poring: 70% Jellopy, 30% Apple
      // Wolf: 60% Wolf Claw, 40% Red Potion
      if (monster.type === 'poring') {
        if (Math.random() < 0.75) {
          spawnGroundLoot(monster.x, monster.y, 'jellopy', 'Jellopy');
        } else {
          spawnGroundLoot(monster.x, monster.y, 'apple', 'Apple');
        }
      } else if (monster.type === 'wolf') {
        if (Math.random() < 0.6) {
          spawnGroundLoot(monster.x, monster.y, 'wolf_claw', 'Wolf Claw');
        } else {
          spawnGroundLoot(monster.x, monster.y, 'red_potion', 'Red Potion');
        }
      }
    }
  });

  // 5. Event Mengambil Loot Drop di Tanah (Race Condition & Anti-Cheat Validation)
  socket.on('loot:pickup', (payload: PickupLootPayload) => {
    const player = players.get(socket.id);
    if (!player) return;

    const item = groundItems.get(payload.groundItemId);
    if (!item) return; // Sudah diambil pemain lain (first come, first served)

    // ANTI-CHEAT: Cek jarak ke item (maks 70px)
    const dist = Math.hypot(item.x - player.x, item.y - player.y);
    if (dist > 70) {
      console.warn(`[Anti-Cheat Blocked] ${player.name} mencoba mengambil loot dari jarak ${Math.round(dist)}px`);
      return;
    }

    // Hapus dari tanah (Atomic removal mencegah double-pickup)
    groundItems.delete(item.id);
    console.log(`[Loot] ${player.name} mengambil ${item.name} (${item.id})`);

    const pickedBroadcast: LootPickedBroadcast = {
      groundItemId: item.id,
      pickerId: socket.id,
      pickerName: player.name,
      item
    };

    io.emit('loot:picked', pickedBroadcast);
  });

  // 6. Event chat pesan publik (MMO Global Chat & Chat Bubble)
  socket.on('chat:send', (rawText: string) => {
    const sender = players.get(socket.id);
    if (!sender) return;

    if (typeof rawText !== 'string') return;
    const sanitizedText = rawText.trim().slice(0, 100); // Batas maksimal 100 karakter
    if (sanitizedText.length === 0) return;

    const chatMsg: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      senderId: socket.id,
      senderName: sender.name,
      text: sanitizedText,
      timestamp: Date.now(),
      type: 'global'
    };

    console.log(`[MMO Chat] [${sender.name}]: ${sanitizedText}`);

    // Broadcast ke SEMUA pemain termasuk pengirimnya
    io.emit('chat:broadcast', chatMsg);
  });

  // 5. Event disconnect: Pemain menutup tab / terputus
  socket.on('disconnect', () => {
    const leftPlayer = players.get(socket.id);
    if (leftPlayer) {
      players.delete(socket.id);
      console.log(`[MMO Server] ${leftPlayer.name} (${socket.id}) keluar. Sisa pemain: ${players.size}`);

      // Beritahu pemain lain untuk menghapus sprite pemain ini
      io.emit('player:left', socket.id);
    } else {
      console.log(`[MMO Server] Socket terputus: ${socket.id}`);
    }
  });
});

// Server Game Loop (20 Hz - setiap 50ms)
const deltaSec = 1 / TICK_RATE;
setInterval(() => {
  // Update AI seluruh monster dan tangani serangan monster ke pemain
  const monsterSnapshots: ServerMonsterData[] = [];
  for (const m of monsters.values()) {
    m.update(deltaSec, players, (_monster, targetPlayerId, damage) => {
      const targetPlayer = players.get(targetPlayerId);
      if (!targetPlayer) return;

      targetPlayer.hp = Math.max(0, targetPlayer.hp - damage);
      const isDead = targetPlayer.hp === 0;

      const hitPacket: CombatHitBroadcast = {
        attackerId: m.id,
        targetId: targetPlayerId,
        targetType: 'player',
        damage,
        isCritical: false,
        remainingHp: targetPlayer.hp,
        isDead
      };

      io.emit('combat:hit', hitPacket);
    });

    monsterSnapshots.push(m.toJSON());
  }

  // Broadcast state monster ke semua pemain (20 FPS update)
  io.emit('monsters:update', monsterSnapshots);
}, 1000 / TICK_RATE);

server.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🚀 Mini Ragnarok Game Server berjalan di:`);
  console.log(`   http://localhost:${PORT}`);
  console.log(`   Tick Rate: ${TICK_RATE} Hz`);
  console.log(`===============================================`);
});
