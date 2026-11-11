import { pgTable, text, integer, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const characters = pgTable('characters', {
  id: text('id').primaryKey(),
  username: text('username').unique().notNull(),
  name: text('name').notNull(),
  level: integer('level').notNull().default(1),
  hp: integer('hp').notNull().default(100),
  maxHp: integer('max_hp').notNull().default(100),
  exp: integer('exp').notNull().default(0),
  maxExp: integer('max_exp').notNull().default(100),
  baseAtk: integer('base_atk').notNull().default(12),
  zeny: integer('zeny').notNull().default(0),
  posX: integer('pos_x').notNull().default(800),
  posY: integer('pos_y').notNull().default(600),
  inventoryJson: jsonb('inventory_json').notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  lastLogin: timestamp('last_login', { withTimezone: true }).defaultNow().notNull(),
});

export type CharacterSelect = typeof characters.$inferSelect;
export type CharacterInsert = typeof characters.$inferInsert;



// ==========================================
// ADMIN CONTENT MANAGEMENT TABLES
// ==========================================

// 1. Character Default Sprites & Animations (Gender M / F)
export const characterSprites = pgTable('character_sprites', {
  id: text('id').primaryKey(),
  gender: text('gender').notNull(), // 'M' | 'F'
  name: text('name').notNull(),
  spriteType: text('sprite_type').notNull().default('body'), // 'body' | 'head'
  idleSheetUrl: text('idle_sheet_url').notNull(),
  walkSheetUrl: text('walk_sheet_url'),
  attackSheetUrl: text('attack_sheet_url'),
  dieSheetUrl: text('die_sheet_url'),
  frameWidth: integer('frame_width').notNull().default(64),
  frameHeight: integer('frame_height').notNull().default(64),
  frameRate: integer('frame_rate').notNull().default(8),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 2. Game Items & Layered Equipment (Armor, Weapon, Elements, Effects)
export const gameItems = pgTable('game_items', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  itemType: text('item_type').notNull(), // 'weapon' | 'armor' | 'headgear' | 'accessory'
  element: text('element').notNull().default('neutral'), // 'neutral' | 'water' | 'earth' | 'fire' | 'wind' | 'holy' | 'shadow'
  statsJson: jsonb('stats_json').notNull().default({}), // { atk: 15, def: 5, str: 2, etc. }
  spriteLayerUrl: text('sprite_layer_url'), // S3 URL layered spritesheet (paperdoll)
  effectUrl: text('effect_url'), // S3 URL particle / visual effect
  description: text('description').default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 3. Game Monsters, Stats, Skills, Elements & Boss Configurations
export const gameMonsters = pgTable('game_monsters', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  isBoss: integer('is_boss').notNull().default(0), // 0: Normal, 1: Mini-Boss, 2: MVP Boss
  element: text('element').notNull().default('neutral'),
  size: text('size').notNull().default('medium'), // 'small' | 'medium' | 'large'
  statsJson: jsonb('stats_json').notNull().default({}), // { level: 1, hp: 50, atkMin: 5, atkMax: 8, def: 2, aspd: 1.0, speed: 60, exp: 10 }
  skillsJson: jsonb('skills_json').notNull().default([]), // [{ id: 'fireball', level: 1, chance: 0.15 }]
  spritesheetUrl: text('spritesheet_url').notNull(),
  frameWidth: integer('frame_width').notNull().default(48),
  frameHeight: integer('frame_height').notNull().default(48),
  dropTableJson: jsonb('drop_table_json').notNull().default([]), // [{ itemId: 'item_1', rate: 0.05 }]
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 4. Game Maps (Floor, Terrain, Bush, Tree, Spawners - Draft & Publish)
export const gameMaps = pgTable('game_maps', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  width: integer('width').notNull().default(50),
  height: integer('height').notNull().default(50),
  tileSize: integer('tile_size').notNull().default(32),
  status: text('status').notNull().default('draft'), // 'draft' | 'published'
  layersJson: jsonb('layers_json').notNull().default({}), // { floor: [], terrain: [], doodads: [], spawners: [] }
  thumbnailUrl: text('thumbnail_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type CharacterSpriteSelect = typeof characterSprites.$inferSelect;
export type CharacterSpriteInsert = typeof characterSprites.$inferInsert;
export type GameItemSelect = typeof gameItems.$inferSelect;
export type GameItemInsert = typeof gameItems.$inferInsert;
export type GameMonsterSelect = typeof gameMonsters.$inferSelect;
export type GameMonsterInsert = typeof gameMonsters.$inferInsert;
export type GameMapSelect = typeof gameMaps.$inferSelect;
export type GameMapInsert = typeof gameMaps.$inferInsert;
