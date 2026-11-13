import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '.env');

// Parse sederhana file .env
const env = {};
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let val = trimmed.slice(eqIndex + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
}

const PORT = env.PORT || '3001';
const ADMIN_TOKEN = env.ADMIN_DUMMY_TOKEN || 'admin-dev-secret-token';
const NINE_ROUTER_URL = env.NINE_ROUTER_URL;
const NINE_ROUTER_API_KEY = env.NINE_ROUTER_API_KEY;
const NINE_ROUTER_MODEL = env.NINE_ROUTER_MODEL || 'Coding';

async function testBackendEndpoint() {
  console.log(`\n[1] Testing Backend Endpoint: http://localhost:${PORT}/api/admin/generate-sprite-text`);
  console.log('    Menunggu generasi pixel-art 4-frame matrix dari LLM (bisa butuh 10-30 detik)...');
  const start = Date.now();
  try {
    const res = await fetch(`http://localhost:${PORT}/api/admin/generate-sprite-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ADMIN_TOKEN}`,
      },
      body: JSON.stringify({ prompt: 'tiny red slime', size: 16 }),
    });
    const dur = ((Date.now() - start) / 1000).toFixed(2);
    const data = await res.json();
    console.log(`Status: ${res.status} (${dur}s)`);
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (err) {
    const dur = ((Date.now() - start) / 1000).toFixed(2);
    console.error(`Backend Error (${dur}s):`, err.message);
  }
}

async function testNineRouterDirect() {
  console.log(`\n[2] Testing 9Router Direct: ${NINE_ROUTER_URL}/chat/completions (model: ${NINE_ROUTER_MODEL})`);
  if (!NINE_ROUTER_URL || !NINE_ROUTER_API_KEY) {
    console.error('NINE_ROUTER_URL atau NINE_ROUTER_API_KEY belum diset di server/.env');
    return;
  }

  try {
    const res = await fetch(`${NINE_ROUTER_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${NINE_ROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: NINE_ROUTER_MODEL,
        messages: [{ role: 'user', content: 'Say "OK" only.' }],
        max_tokens: 16,
      }),
    });
    const text = await res.text();
    console.log(`Status: ${res.status}`);
    console.log('Raw Response:', text);
  } catch (err) {
    console.error('9Router Error:', err.message);
  }
}

await testBackendEndpoint();
await testNineRouterDirect();

