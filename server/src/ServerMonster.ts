import { ServerMonsterData, MonsterType } from './types.js';

export interface MonsterConfig {
  type: MonsterType;
  name: string;
  maxHp: number;
  moveSpeed: number;
  isAggressive: boolean;
  attackPower: number;
  aggroRange: number;
  attackRange: number;
  attackCooldown: number;
  wanderRadius: number;
  expReward: number;
  zenyReward: number;
}

export const MONSTER_SPECS: Record<MonsterType, MonsterConfig> = {
  poring: {
    type: 'poring',
    name: 'Poring',
    maxHp: 50,
    moveSpeed: 30, // px per second
    isAggressive: false,
    attackPower: 0,
    aggroRange: 0,
    attackRange: 0,
    attackCooldown: 0,
    wanderRadius: 100,
    expReward: 35,
    zenyReward: 15,
  },
  wolf: {
    type: 'wolf',
    name: 'Desert Wolf',
    maxHp: 85,
    moveSpeed: 60,
    isAggressive: true,
    attackPower: 10,
    aggroRange: 200,
    attackRange: 45,
    attackCooldown: 1200,
    wanderRadius: 160,
    expReward: 80,
    zenyReward: 40,
  },
};

export class ServerMonster implements ServerMonsterData {
  public id: string;
  public type: MonsterType;
  public name: string;
  public x: number;
  public y: number;
  public hp: number;
  public maxHp: number;
  public isDead = false;
  public targetPlayerId: string | null = null;

  public readonly spawnX: number;
  public readonly spawnY: number;
  public readonly config: MonsterConfig;

  // AI state internal
  private targetX: number;
  private targetY: number;
  private nextDecisionTime = 0;
  private respawnTime = 0;
  private lastAttackTime = 0;

  constructor(id: string, type: MonsterType, x: number, y: number) {
    this.id = id;
    this.type = type;
    this.config = MONSTER_SPECS[type];
    this.name = this.config.name;
    this.x = x;
    this.y = y;
    this.spawnX = x;
    this.spawnY = y;
    this.targetX = x;
    this.targetY = y;
    this.maxHp = this.config.maxHp;
    this.hp = this.config.maxHp;
  }

  public update(
    deltaSec: number,
    players: Map<string, { id: string; x: number; y: number }>,
    onAttackPlayer?: (monster: ServerMonster, targetPlayerId: string, damage: number) => void
  ): void {
    const now = Date.now();

    // 1. Tangani respawn jika mati
    if (this.isDead) {
      if (now >= this.respawnTime) {
        this.isDead = false;
        this.hp = this.maxHp;
        this.x = this.spawnX;
        this.y = this.spawnY;
        this.targetX = this.spawnX;
        this.targetY = this.spawnY;
        this.targetPlayerId = null;
      }
      return;
    }

    // 2. Evaluasi AI untuk Monster Agresif (Wolf)
    if (this.config.isAggressive) {
      let closestPlayer: { id: string; x: number; y: number; dist: number } | null = null;

      for (const player of players.values()) {
        const dist = Math.hypot(player.x - this.x, player.y - this.y);
        if (dist <= this.config.aggroRange) {
          if (!closestPlayer || dist < closestPlayer.dist) {
            closestPlayer = { id: player.id, x: player.x, y: player.y, dist };
          }
        }
      }

      if (closestPlayer) {
        this.targetPlayerId = closestPlayer.id;
        this.targetX = closestPlayer.x;
        this.targetY = closestPlayer.y;

        // Cek jangkauan serang monster ke pemain
        if (closestPlayer.dist <= this.config.attackRange) {
          if (now - this.lastAttackTime >= this.config.attackCooldown) {
            this.lastAttackTime = now;
            const variance = Math.floor(Math.random() * 5) - 2;
            const finalDamage = Math.max(1, this.config.attackPower + variance);
            if (onAttackPlayer) {
              onAttackPlayer(this, closestPlayer.id, finalDamage);
            }
          }
        }
      } else {
        this.targetPlayerId = null;
      }
    }

    // 3. AI Wander (Jalan Santai) jika tidak mengejar pemain
    if (!this.targetPlayerId) {
      if (now >= this.nextDecisionTime) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * this.config.wanderRadius;
        this.targetX = this.spawnX + Math.cos(angle) * dist;
        this.targetY = this.spawnY + Math.sin(angle) * dist;
        this.nextDecisionTime = now + (2000 + Math.random() * 3000);
      }
    }

    // 4. Pergerakan Vektor menuju target
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const distToTarget = Math.hypot(dx, dy);

    if (distToTarget > 4) {
      const moveStep = this.config.moveSpeed * deltaSec;
      const step = Math.min(distToTarget, moveStep);
      this.x += (dx / distToTarget) * step;
      this.y += (dy / distToTarget) * step;
    }
  }

  public takeDamage(amount: number): { isDead: boolean; remainingHp: number } {
    if (this.isDead) return { isDead: true, remainingHp: 0 };
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp === 0) {
      this.isDead = true;
      this.respawnTime = Date.now() + 5000;
      return { isDead: true, remainingHp: 0 };
    }
    return { isDead: false, remainingHp: this.hp };
  }

  public toJSON(): ServerMonsterData {
    return {
      id: this.id,
      type: this.type,
      name: this.name,
      x: Math.round(this.x),
      y: Math.round(this.y),
      hp: this.hp,
      maxHp: this.maxHp,
      isDead: this.isDead,
      targetPlayerId: this.targetPlayerId,
    };
  }
}
