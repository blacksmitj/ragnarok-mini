import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '.env');

console.log('=== TEST DIRECT KONEKSI AI VIA .ENV ===');
console.log(`Membaca config dari: ${envPath}`);

if (!fs.existsSync(envPath)) {
  console.error('File .env tidak ditemukan!');
  process.exit(1);
}

// Parse isi file .env
const env = {};
const lines = fs.readFileSync(envPath, 'utf-8').split(/\r?\n/);
for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  const k = trimmed.slice(0, eqIdx).trim();
  let v = trimmed.slice(eqIdx + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  env[k] = v;
}

const baseUrl = env.NINE_ROUTER_URL?.replace(/\/+$/, '');
const apiKey = env.NINE_ROUTER_API_KEY;
const model = env.NINE_ROUTER_MODEL || 'Coding';

console.log('\n--- Detail Konfigurasi ---');
console.log('Target URL :', baseUrl);
console.log('API Key    :', apiKey ? `${apiKey.slice(0, 10)}...${apiKey.slice(-4)}` : '(KOSONG)');
console.log('Model      :', model);

if (!baseUrl || !apiKey) {
  console.error('\n[GAGAL] NINE_ROUTER_URL atau NINE_ROUTER_API_KEY belum disetel di .env');
  process.exit(1);
}

// 1. Cek Endpoint Models jika ada
console.log(`\n[1/2] Mencoba query daftar model: GET ${baseUrl}/models ...`);
try {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  const modelsRes = await fetch(`${baseUrl}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: controller.signal
  });
  clearTimeout(timeout);
  console.log(`Status HTTP: ${modelsRes.status} ${modelsRes.statusText}`);
  if (modelsRes.ok) {
    const modelsData = await modelsRes.json();
    const modelList = modelsData.data ? modelsData.data.map(m => m.id) : modelsData;
    console.log('Model tersedia di router:', JSON.stringify(modelList, null, 2));
  } else {
    console.log('Catatan: Endpoint /models mengembalikan non-200 atau tidak didukung.');
  }
} catch (err) {
  console.log('Gagal menghubungi /models:', err.message);
}

// 2. Cek Chat Completion langsung
console.log(`\n[2/2] Mencoba test prompt chat: POST ${baseUrl}/chat/completions ...`);
const requestBody = {
  model: model,
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Halo! Balas dengan kata: KONEKSI_AI_BERHASIL' }
  ],
  temperature: 0.7,
  max_tokens: 50
};

console.log('Payload yang dikirim:', JSON.stringify(requestBody, null, 2));

try {
  const startTime = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(requestBody),
    signal: controller.signal
  });
  clearTimeout(timeout);
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log(`\nStatus HTTP: ${res.status} ${res.statusText} (${duration}s)`);
  const rawText = await res.text();
  
  try {
    const json = JSON.parse(rawText);
    console.log('\n--- Hasil JSON Response ---');
    console.log(JSON.stringify(json, null, 2));
    
    const reply = json.choices?.[0]?.message?.content;
    if (reply) {
      console.log(`\n>>> SUCCESS! Respon AI:\n"${reply.trim()}"`);
    } else {
      console.log('\n[PERHATIAN] Respon JSON valid tetapi `choices[0].message.content` kosong/tidak ada.');
    }
  } catch {
    console.log('\n--- Raw Response (Bukan JSON) ---');
    console.log(rawText);
  }
} catch (err) {
  console.error('\n[ERROR KONEKSI]', err.message);
}

