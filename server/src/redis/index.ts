import { Redis } from 'ioredis';
import { createAdapter } from '@socket.io/redis-adapter';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Client khusus Pub dan Sub untuk Socket.IO Redis Adapter
export const pubClient = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  retryStrategy(times) {
    const delay = Math.min(times * 200, 2000);
    return delay;
  },
});

export const subClient = pubClient.duplicate();

pubClient.on('connect', () => {
  console.log('✅ [Redis] Pub Client connected to VPS Redis');
});

pubClient.on('error', (err) => {
  console.error('❌ [Redis] Pub Client Error:', err.message);
});

subClient.on('connect', () => {
  console.log('✅ [Redis] Sub Client connected to VPS Redis');
});

subClient.on('error', (err) => {
  console.error('❌ [Redis] Sub Client Error:', err.message);
});

export const redisAdapter = createAdapter(pubClient, subClient);

/**
 * Helper Session Management di Redis
 */
export const redisService = {
  /**
   * Menyimpan session player yang sedang aktif (TTL 2 jam)
   */
  async savePlayerSession(socketId: string, username: string, name: string): Promise<void> {
    const key = `player:session:${socketId}`;
    await pubClient.hset(key, {
      socketId,
      username,
      name,
      connectedAt: new Date().toISOString(),
    });
    await pubClient.expire(key, 7200); // 2 jam TTL
  },

  /**
   * Mengambil data session player
   */
  async getPlayerSession(socketId: string): Promise<Record<string, string> | null> {
    const key = `player:session:${socketId}`;
    const data = await pubClient.hgetall(key);
    return Object.keys(data).length > 0 ? data : null;
  },

  /**
   * Menghapus session saat socket disconnect
   */
  async deletePlayerSession(socketId: string): Promise<void> {
    const sessionKey = `player:session:${socketId}`;
    const stateKey = `player:${socketId}:state`;
    await pubClient.del(sessionKey, stateKey);
  },

  /**
   * Menyimpan transient state pemain di Redis (Posisi X/Y, HP, Level, Direction)
   */
  async updatePlayerTransientState(
    socketId: string,
    state: {
      username: string;
      name: string;
      x: number;
      y: number;
      hp: number;
      maxHp: number;
      level: number;
      direction: string;
    }
  ): Promise<void> {
    const key = `player:${socketId}:state`;
    await pubClient.hset(key, {
      username: state.username,
      name: state.name,
      x: Math.round(state.x).toString(),
      y: Math.round(state.y).toString(),
      hp: state.hp.toString(),
      maxHp: state.maxHp.toString(),
      level: state.level.toString(),
      direction: state.direction,
      updatedAt: Date.now().toString(),
    });
    await pubClient.expire(key, 300); // 5 menit TTL jika tidak aktif
  },

  /**
   * Mengambil semua key state pemain yang aktif di Redis
   */
  async getActivePlayerStates(socketIds: string[]): Promise<Record<string, Record<string, string>>> {
    if (socketIds.length === 0) return {};
    const pipeline = pubClient.pipeline();
    for (const id of socketIds) {
      pipeline.hgetall(`player:${id}:state`);
    }
    const results = await pipeline.exec();
    const map: Record<string, Record<string, string>> = {};
    if (!results) return map;

    socketIds.forEach((id, idx) => {
      const [err, res] = results[idx];
      if (!err && res && Object.keys(res as object).length > 0) {
        map[id] = res as Record<string, string>;
      }
    });
    return map;
  },

  /**
   * Anti-Cheat Cooldown via Redis Atomic Key (SET key value NX PX cooldownMs)
   * Mengembalikan true jika aksi diizinkan, false jika sedang cooldown.
   */
  async checkActionCooldown(playerId: string, actionType: string, cooldownMs: number): Promise<boolean> {
    const key = `cooldown:${actionType}:${playerId}`;
    // SET NX PX mengembalikan 'OK' jika key belum ada, null jika sudah ada
    const result = await pubClient.set(key, '1', 'PX', cooldownMs, 'NX');
    return result === 'OK';
  },

  /**
   * Update skor / level pada Redis Leaderboard (Sorted Set)
   */
  async updateLeaderboard(category: 'level' | 'kills', playerName: string, score: number): Promise<void> {
    const key = `leaderboard:${category}`;
    await pubClient.zadd(key, score, playerName);
  },

  /**
   * Mengambil top N ranking leaderboard
   */
  async getTopLeaderboard(
    category: 'level' | 'kills',
    limit: number = 10
  ): Promise<Array<{ rank: number; name: string; score: number }>> {
    const key = `leaderboard:${category}`;
    // ZREVRANGE with scores (peringkat tertinggi ke terendah)
    const raw = await pubClient.zrevrange(key, 0, limit - 1, 'WITHSCORES');
    const result: Array<{ rank: number; name: string; score: number }> = [];

    for (let i = 0; i < raw.length; i += 2) {
      result.push({
        rank: Math.floor(i / 2) + 1,
        name: raw[i],
        score: parseFloat(raw[i + 1]),
      });
    }

    return result;
  },
};

