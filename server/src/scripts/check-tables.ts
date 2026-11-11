import { db } from '../db/index.js';
import { sql } from 'drizzle-orm';

async function check() {
  try {
    const res = await db.execute(sql`SELECT table_name FROM information_schema.tables WHERE table_schema='public'`);
    console.log('Tabel di database:', res);
  } catch (err) {
    console.error('Error db:', err);
  } finally {
    process.exit(0);
  }
}

check();

