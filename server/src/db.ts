import { db, schema } from './db/index.js';
import { eq } from 'drizzle-orm';

export interface DbCharacter {
  id: string;
  username: string;
  name: string;
  level: number;
  hp: number;
  max_hp: number;
  exp: number;
  max_exp: number;
  base_atk: number;
  zeny: number;
  pos_x: number;
  pos_y: number;
  inventory_json: string;
  created_at?: string;
  last_login?: string;
}

export const dbService = {
  /**
   * Otomatis mendaftarkan akun baru atau memuat karakter lama jika username sudah ada (PostgreSQL + Drizzle)
   */
  async getOrCreateAccount(username: string): Promise<DbCharacter> {
    const cleanUser = username.trim().toLowerCase();

    // Cari karakter berdasarkan username
    const existingList = await db
      .select()
      .from(schema.characters)
      .where(eq(schema.characters.username, cleanUser))
      .limit(1);

    if (existingList.length > 0) {
      const existing = existingList[0];
      // Update last_login
      await db
        .update(schema.characters)
        .set({ lastLogin: new Date() })
        .where(eq(schema.characters.id, existing.id));

      return {
        id: existing.id,
        username: existing.username,
        name: existing.name,
        level: existing.level,
        hp: existing.hp,
        max_hp: existing.maxHp,
        exp: existing.exp,
        max_exp: existing.maxExp,
        base_atk: existing.baseAtk,
        zeny: existing.zeny,
        pos_x: existing.posX,
        pos_y: existing.posY,
        inventory_json: typeof existing.inventoryJson === 'string'
          ? existing.inventoryJson
          : JSON.stringify(existing.inventoryJson || []),
      };
    }

    const newId = `char-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const displayName = cleanUser.charAt(0).toUpperCase() + cleanUser.slice(1);
    const initialInventory = [
      {
        itemId: 'red_potion',
        name: 'Red Potion',
        quantity: 5,
        icon: '🧪',
        description: 'Ramuan merah Prontera. Memulihkan 35 HP.',
        healAmount: 35
      }
    ];

    const inserted = await db
      .insert(schema.characters)
      .values({
        id: newId,
        username: cleanUser,
        name: displayName,
        level: 1,
        hp: 100,
        maxHp: 100,
        exp: 0,
        maxExp: 100,
        baseAtk: 12,
        zeny: 100,
        posX: 800,
        posY: 600,
        inventoryJson: initialInventory,
      })
      .returning();

    const created = inserted[0];
    return {
      id: created.id,
      username: created.username,
      name: created.name,
      level: created.level,
      hp: created.hp,
      max_hp: created.maxHp,
      exp: created.exp,
      max_exp: created.maxExp,
      base_atk: created.baseAtk,
      zeny: created.zeny,
      pos_x: created.posX,
      pos_y: created.posY,
      inventory_json: JSON.stringify(created.inventoryJson),
    };
  },

  /**
   * Menyimpan progres karakter ke PostgreSQL (Posisi, HP, EXP, Level, Zeny, Tas)
   */
  async saveCharacterProgress(data: {
    username: string;
    level: number;
    hp: number;
    maxHp: number;
    exp: number;
    maxExp: number;
    baseAtk: number;
    zeny: number;
    posX: number;
    posY: number;
    inventoryJson: string;
  }): Promise<void> {
    let parsedInventory = [];
    try {
      parsedInventory = JSON.parse(data.inventoryJson);
    } catch {
      parsedInventory = [];
    }

    await db
      .update(schema.characters)
      .set({
        level: data.level,
        hp: data.hp,
        maxHp: data.maxHp,
        exp: data.exp,
        maxExp: data.maxExp,
        baseAtk: data.baseAtk,
        zeny: data.zeny,
        posX: Math.round(data.posX),
        posY: Math.round(data.posY),
        inventoryJson: parsedInventory,
        lastLogin: new Date(),
      })
      .where(eq(schema.characters.username, data.username.toLowerCase()));
  }
};
