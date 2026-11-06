import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '../database.sqlite');

const db = new Database(dbPath);

// Inisialisasi Skema Tabel Akun & Karakter
db.exec(`
  CREATE TABLE IF NOT EXISTS characters (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    level INTEGER NOT NULL DEFAULT 1,
    hp INTEGER NOT NULL DEFAULT 100,
    max_hp INTEGER NOT NULL DEFAULT 100,
    exp INTEGER NOT NULL DEFAULT 0,
    max_exp INTEGER NOT NULL DEFAULT 100,
    base_atk INTEGER NOT NULL DEFAULT 12,
    zeny INTEGER NOT NULL DEFAULT 0,
    pos_x INTEGER NOT NULL DEFAULT 800,
    pos_y INTEGER NOT NULL DEFAULT 600,
    inventory_json TEXT NOT NULL DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

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
  created_at: string;
  last_login: string;
}

export const dbService = {
  /**
   * Otomatis mendaftarkan akun baru atau memuat karakter lama jika username sudah ada (Auto-Login/Register)
   */
  getOrCreateAccount(username: string): DbCharacter {
    const cleanUser = username.trim().toLowerCase();
    const findStmt = db.prepare('SELECT * FROM characters WHERE username = ?');
    const existing = findStmt.get(cleanUser) as DbCharacter | undefined;

    if (existing) {
      db.prepare('UPDATE characters SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(existing.id);
      return existing;
    }

    const newId = `char-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const displayName = cleanUser.charAt(0).toUpperCase() + cleanUser.slice(1);
    const initialInventory = JSON.stringify([
      {
        itemId: 'red_potion',
        name: 'Red Potion',
        quantity: 5,
        icon: '🧪',
        description: 'Ramuan merah Prontera. Memulihkan 35 HP.',
        healAmount: 35
      }
    ]);

    const insertStmt = db.prepare(`
      INSERT INTO characters (
        id, username, name, level, hp, max_hp, exp, max_exp, base_atk, zeny, pos_x, pos_y, inventory_json
      ) VALUES (?, ?, ?, 1, 100, 100, 0, 100, 12, 100, 800, 600, ?)
    `);

    insertStmt.run(newId, cleanUser, displayName, initialInventory);

    return findStmt.get(cleanUser) as DbCharacter;
  },

  /**
   * Menyimpan progres karakter ke database (Posisi, HP, EXP, Level, Zeny, Tas)
   */
  saveCharacterProgress(data: {
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
  }): void {
    const stmt = db.prepare(`
      UPDATE characters
      SET level = ?, hp = ?, max_hp = ?, exp = ?, max_exp = ?, base_atk = ?, zeny = ?, pos_x = ?, pos_y = ?, inventory_json = ?
      WHERE username = ?
    `);

    stmt.run(
      data.level,
      data.hp,
      data.maxHp,
      data.exp,
      data.maxExp,
      data.baseAtk,
      data.zeny,
      Math.round(data.posX),
      Math.round(data.posY),
      data.inventoryJson,
      data.username.toLowerCase()
    );
  }
};

