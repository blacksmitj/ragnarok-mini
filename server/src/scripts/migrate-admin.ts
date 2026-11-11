import { db } from '../db/index.js';
import { sql } from 'drizzle-orm';

async function migrateAdminTables() {
  console.log('Membuat tabel admin content management di PostgreSQL...');

  try {
    // 1. character_sprites
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "character_sprites" (
        "id" text PRIMARY KEY,
        "gender" text NOT NULL,
        "name" text NOT NULL,
        "sprite_type" text NOT NULL DEFAULT 'body',
        "idle_sheet_url" text NOT NULL,
        "walk_sheet_url" text,
        "attack_sheet_url" text,
        "die_sheet_url" text,
        "frame_width" integer NOT NULL DEFAULT 64,
        "frame_height" integer NOT NULL DEFAULT 64,
        "frame_rate" integer NOT NULL DEFAULT 8,
        "created_at" timestamp with time zone NOT NULL DEFAULT now(),
        "updated_at" timestamp with time zone NOT NULL DEFAULT now()
      );
    `);
    console.log('✓ Tabel character_sprites siap.');

    // 2. game_items
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "game_items" (
        "id" text PRIMARY KEY,
        "name" text NOT NULL,
        "item_type" text NOT NULL,
        "element" text NOT NULL DEFAULT 'neutral',
        "stats_json" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "sprite_layer_url" text,
        "effect_url" text,
        "description" text DEFAULT '',
        "created_at" timestamp with time zone NOT NULL DEFAULT now(),
        "updated_at" timestamp with time zone NOT NULL DEFAULT now()
      );
    `);
    console.log('✓ Tabel game_items siap.');

    // 3. game_monsters
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "game_monsters" (
        "id" text PRIMARY KEY,
        "name" text NOT NULL,
        "is_boss" integer NOT NULL DEFAULT 0,
        "element" text NOT NULL DEFAULT 'neutral',
        "size" text NOT NULL DEFAULT 'medium',
        "stats_json" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "skills_json" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "spritesheet_url" text NOT NULL,
        "frame_width" integer NOT NULL DEFAULT 48,
        "frame_height" integer NOT NULL DEFAULT 48,
        "drop_table_json" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "created_at" timestamp with time zone NOT NULL DEFAULT now(),
        "updated_at" timestamp with time zone NOT NULL DEFAULT now()
      );
    `);
    console.log('✓ Tabel game_monsters siap.');

    // 4. game_maps
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "game_maps" (
        "id" text PRIMARY KEY,
        "name" text NOT NULL,
        "width" integer NOT NULL DEFAULT 50,
        "height" integer NOT NULL DEFAULT 50,
        "tile_size" integer NOT NULL DEFAULT 32,
        "status" text NOT NULL DEFAULT 'draft',
        "layers_json" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "thumbnail_url" text,
        "created_at" timestamp with time zone NOT NULL DEFAULT now(),
        "updated_at" timestamp with time zone NOT NULL DEFAULT now()
      );
    `);
    console.log('✓ Tabel game_maps siap.');

    console.log('Semua tabel database berhasil dibuat!');
  } catch (err) {
    console.error('Gagal membuat tabel:', err);
  } finally {
    process.exit(0);
  }
}

migrateAdminTables();

