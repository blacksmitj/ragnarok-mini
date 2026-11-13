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
import { redisAdapter, redisService, pubClient } from './redis/index.js';
import { uploadRouter } from './routes/admin-upload.js';
import { adminCharactersRouter } from './routes/admin-characters.js';
import { adminItemsRouter } from './routes/admin-items.js';
import { adminMonstersRouter } from './routes/admin-monsters.js';
import { adminMapsRouter } from './routes/admin-maps.js';
import { adminSpriteAiRouter } from './routes/admin-sprite-ai.js';

const app = express();
app.use(cors());
app.use(express.json());

// Admin Content Management REST Endpoints
app.use('/api/admin/upload', uploadRouter);
app.use('/api/admin/characters', adminCharactersRouter);
app.use('/api/admin/items', adminItemsRouter);
app.use('/api/admin/monsters', adminMonstersRouter);
app.use('/api/admin/maps', adminMapsRouter);
app.use('/api/admin', adminSpriteAiRouter);

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    onlinePlayers: players.size,
    time: new Date().toISOString()
  });
});

app.get('/leaderboard', async (_req, res) => {
  try {
    const topLevels = await redisService.getTopLeaderboard('level', 10);
    const topKills = await redisService.getTopLeaderboard('kills', 10);
    res.json({
      level: topLevels,
      kills: topKills
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  adapter: redisAdapter
});

const PORT = process.env.PORT || 3001;
const TICK_RATE = 20;

// In-Memory Storage untuk Pemain yang Sedang Online
const players = new Map<string, PlayerData & { username?: string }>();

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

  // 2. Event saat pemain login / bergabung ke arena (Database PostgreSQL Authentication)
  socket.on('player:join', async (payload: JoinPayload) => {
    try {
      const username = payload.username || `novice_${socket.id.slice(0, 4)}`;
      const dbChar = await dbService.getOrCreateAccount(username);

      const newPlayer: PlayerData & { username?: string } = {
        id: socket.id,
        username: dbChar.username,
        name: dbChar.name,
        x: dbChar.pos_x,
        y: dbChar.pos_y,
        level: dbChar.level,
        hp: dbChar.hp,
        maxHp: dbChar.max_hp,
        direction: 'down'
      };

      // Simpan ke daftar pemain online & Redis session & initial state
      players.set(socket.id, newPlayer);
      await redisService.savePlayerSession(socket.id, dbChar.username, dbChar.name);
      await redisService.updatePlayerTransientState(socket.id, {
        username: dbChar.username,
        name: dbChar.name,
        x: newPlayer.x,
        y: newPlayer.y,
        hp: newPlayer.hp,
        maxHp: newPlayer.maxHp,
        level: newPlayer.level,
        direction: newPlayer.direction,
      });
      console.log(`[MMO Server] Akun '${dbChar.username}' (${dbChar.name}) login dari DB di (${newPlayer.x}, ${newPlayer.y}). Level: ${dbChar.level}, Zeny: ${dbChar.zeny}`);

      // Update Redis Leaderboard Level
      await redisService.updateLeaderboard('level', dbChar.name, dbChar.level);

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
    } catch (err) {
      console.error('[MMO Server] Error saat player:join:', err);
    }
  });

  // Event Sinkronisasi Penyimpanan Progres ke PostgreSQL Database
  socket.on('character:save', async (payload: CharacterSyncPayload) => {
    try {
      await dbService.saveCharacterProgress({
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
      console.log(`[MMO DB] Progres karakter '${payload.username}' tersimpan ke PostgreSQL.`);
    } catch (err) {
      console.error(`[MMO DB] Gagal menyimpan karakter '${payload.username}':`, err);
    }
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

    // Simpan transient state ke Redis Hash secara asynchronous
    if (existing.username) {
      redisService.updatePlayerTransientState(socket.id, {
        username: existing.username,
        name: existing.name,
        x: existing.x,
        y: existing.y,
        hp: existing.hp,
        maxHp: existing.maxHp,
        level: existing.level,
        direction: existing.direction,
      }).catch((err) => console.error('[Redis State Error]:', err));
    }

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
  socket.on('player:attack', async (payload: PlayerAttackPayload) => {
    const attacker = players.get(socket.id);
    if (!attacker) return;

    if (!payload.targetMonsterId) return;
    const monster = monsters.get(payload.targetMonsterId);
    if (!monster || monster.isDead) return;

    // ANTI-CHEAT CHECK 1: Cooldown Serangan via Redis Atomic Token (550ms cooldown)
    const canAttack = await redisService.checkActionCooldown(socket.id, 'attack', 550);
    if (!canAttack) {
      // Cooldown belum usai, cegah auto-clicker / spam script
      return;
    }

    // ANTI-CHEAT CHECK 2: Jarak serang maksimal (85px + 20px latency buffer = 105px)
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
      // Perbarui Redis Leaderboard Kills
      await pubClient.zincrby('leaderboard:kills', 1, attacker.name);

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
  socket.on('disconnect', async () => {
    // Hapus session dari Redis
    await redisService.deletePlayerSession(socket.id);

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

// Write-Behind Periodic Snapshot: Sync state dari Redis/Memory ke PostgreSQL setiap 30 detik
const SYNC_INTERVAL_MS = 30000;
setInterval(async () => {
  if (players.size === 0) return;

  const onlineSocketIds = Array.from(players.keys());
  const redisStates = await redisService.getActivePlayerStates(onlineSocketIds);

  for (const socketId of onlineSocketIds) {
    const player = players.get(socketId);
    if (!player || !player.username) continue;

    const state = redisStates[socketId];
    const posX = state?.x ? parseInt(state.x, 10) : player.x;
    const posY = state?.y ? parseInt(state.y, 10) : player.y;
    const hp = state?.hp ? parseInt(state.hp, 10) : player.hp;

    try {
      await dbService.saveCharacterProgress({
        username: player.username,
        level: player.level,
        hp,
        maxHp: player.maxHp,
        exp: 0,
        maxExp: 100,
        baseAtk: 12 + (player.level - 1) * 2,
        zeny: 100,
        posX,
        posY,
        inventoryJson: '[]'
      });
    } catch (err) {
      console.error(`[Write-Behind Sync Error] ${player.username}:`, err);
    }
  }
  console.log(`[Write-Behind Sync] Berhasil melakukan snapshot ${onlineSocketIds.length} karakter aktif ke PostgreSQL.`);
}, SYNC_INTERVAL_MS);

server.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🚀 Mini Ragnarok Game Server berjalan di:`);
  console.log(`   http://localhost:${PORT}`);
  console.log(`   Tick Rate: ${TICK_RATE} Hz`);
  console.log(`===============================================`);
});
