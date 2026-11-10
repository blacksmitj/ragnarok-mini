import { redisService, pubClient } from './src/redis/index.js';

async function testPhase4() {
  console.log('--- 1. Testing Redis Atomic Anti-Cheat Cooldown ---');
  const playerId = 'player_anticheat_1';
  const firstAttack = await redisService.checkActionCooldown(playerId, 'attack', 600);
  console.log('Serangan 1 (Harus TRUE / Allowed):', firstAttack);

  const rapidAttack = await redisService.checkActionCooldown(playerId, 'attack', 600);
  console.log('Serangan 2 spam instan (Harus FALSE / Blocked):', rapidAttack);

  if (!firstAttack || rapidAttack) {
    throw new Error('Anti-cheat cooldown gagal bekerja dengan benar!');
  }

  console.log('--- 2. Testing Redis Sorted Set (ZSET) Leaderboard ---');
  await redisService.updateLeaderboard('level', 'NoviceHero', 12);
  await redisService.updateLeaderboard('level', 'PoringHunter', 8);
  await redisService.updateLeaderboard('level', 'SwordMaster', 15);

  await pubClient.zincrby('leaderboard:kills', 5, 'NoviceHero');
  await pubClient.zincrby('leaderboard:kills', 20, 'PoringHunter');

  const topLevel = await redisService.getTopLeaderboard('level', 3);
  console.log('Top Level Leaderboard (Sorted):', topLevel);

  const topKills = await redisService.getTopLeaderboard('kills', 3);
  console.log('Top Kills Leaderboard (Sorted):', topKills);

  if (topLevel[0].name !== 'SwordMaster' || topLevel[0].score !== 15) {
    throw new Error('Leaderboard rank tidak sesuai harapan!');
  }

  console.log('--- 3. Cleanup Test Data ---');
  await pubClient.del('cooldown:attack:player_anticheat_1');
  await pubClient.zrem('leaderboard:level', 'NoviceHero', 'PoringHunter', 'SwordMaster');
  await pubClient.zrem('leaderboard:kills', 'NoviceHero', 'PoringHunter');
  await pubClient.quit();

  console.log('🎉 Fase 4 verifikasi berhasil 100%!');
  process.exit(0);
}

testPhase4().catch((err) => {
  console.error('Test Phase 4 Error:', err);
  process.exit(1);
});

