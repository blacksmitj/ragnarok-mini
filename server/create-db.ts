import postgres from 'postgres';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

const rawUrl = process.env.DATABASE_URL;

if (!rawUrl) {
  console.error('❌ DATABASE_URL tidak ditemukan di .env!');
  process.exit(1);
}

try {
  const parsed = new URL(rawUrl);
  const targetDb = parsed.pathname.replace(/^\//, '') || 'ragnarok_db';

  // Koneksi ke default database 'postgres' untuk membuat database baru
  parsed.pathname = '/postgres';
  const adminUrl = parsed.toString();

  console.log(`📡 Menghubungkan ke PostgreSQL (database: postgres) untuk mengecek '${targetDb}'...`);
  const sql = postgres(adminUrl, { max: 1 });

  // Cek apakah database sudah ada
  const existing = await sql`
    SELECT 1 FROM pg_database WHERE datname = ${targetDb}
  `;

  if (existing.length > 0) {
    console.log(`✅ Database '${targetDb}' sudah ada.`);
  } else {
    console.log(`⚙️ Membuat database '${targetDb}'...`);
    // CREATE DATABASE tidak dapat menggunakan parameterized identifier langsung
    await sql.unsafe(`CREATE DATABASE "${targetDb}"`);
    console.log(`🎉 Berhasil membuat database '${targetDb}'!`);
  }

  await sql.end();
  process.exit(0);
} catch (err: any) {
  console.error('❌ Gagal membuat database:', err.message || err);
  process.exit(1);
}

