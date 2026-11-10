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

