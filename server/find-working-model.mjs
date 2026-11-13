import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '.env');

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

const baseUrl = env.NINE_ROUTER_URL?.replace(/\/+$/, '');
const apiKey = env.NINE_ROUTER_API_KEY;

// Ambil daftar model dari /models
console.log('Mengambil daftar model dari 9Router...');
const resModels = await fetch(`${baseUrl}/models`, {
  headers: { Authorization: `Bearer ${apiKey}` }
});
const modelsData = await resModels.json();
const allModels = modelsData.data ? modelsData.data.map(m => m.id) : (Array.isArray(modelsData) ? modelsData : []);

// Filter model kandidat yang bukan "kr/" karena Kiro provider sedang error
const candidates = allModels.filter(m => 
  !m.startsWith('kr/') && 
  (m.includes('deepseek') || m.includes('qwen') || m.includes('gemini') || m.includes('pickle') || m.includes('free') || m.includes('Coding') || m.includes('Hermes'))
);

console.log(`Ditemukan ${candidates.length} kandidat model non-Kiro untuk diuji:\n`, candidates);

console.log('\n--- MULAI PENGUJIAN MODEL DENGAN PROMPT JSON PIXEL ART ---');

for (const model of candidates) {
  process.stdout.write(`Testing: ${model.padEnd(45)} `);
  try {
    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), 20000);
    const start = Date.now();
    
    const r = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 600,
        messages: [
          { 
            role: 'system', 
            content: 'You generate pixel art. Output ONLY JSON: {"name":"slime","frameWidth":8,"frameHeight":8,"palette":{".":"transparent","r":"#f00"},"frames":[["........","..rrrr..","..rrrr..","........"]]}' 
          },
          { role: 'user', content: 'Create 8x8 slime sprite' }
        ]
      }),
      signal: controller.signal
    });
    clearTimeout(to);
    const dur = ((Date.now() - start)/1000).toFixed(1);
    
    if (!r.ok) {
      const err = await r.text();
      let msg = err;
      try { msg = JSON.parse(err).error?.message || err; } catch {}
      console.log(`❌ FAIL HTTP ${r.status} (${dur}s): ${msg.slice(0, 60)}`);
      continue;
    }
    
    const json = await r.json();
    const content = json.choices?.[0]?.message?.content || json.choices?.[0]?.message?.reasoning_content;
    if (!content) {
      console.log(`❌ KOSONG (${dur}s)`);
      continue;
    }
    
    // Cek apakah ada kurung kurawal JSON
    if (content.includes('{') && content.includes('}')) {
      console.log(`✅ BERHASIL & VALID JSON! (${dur}s)`);
      console.log(`\n🎉 MODEL YANG DIREKOMENDASIKAN: "${model}"`);
      console.log(`Snippet output:\n${content.slice(0, 150)}...\n`);
      break;
    } else {
      console.log(`⚠️ Output bukan JSON (${dur}s): ${content.slice(0, 50)}...`);
    }
  } catch (e) {
    console.log(`❌ ERROR: ${e.message}`);
  }
}

