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
const model = env.NINE_ROUTER_MODEL || 'Hermes';

function buildSpriteSystemPrompt(frameSize = 16, frameCount = 4) {
  return `You are a pixel art spritesheet generator for a 2D retro RPG (Ragnarok Online style).
CRITICAL: You must return ONLY raw JSON without any markdown formatting, backticks, or explanation.
Response must start immediately with "{" and end with "}".

{
  "name": "tiny_red_slime",
  "frameWidth": ${frameSize},
  "frameHeight": ${frameSize},
  "palette": {
    ".": "transparent",
    "k": "#1a1a1a",
    "r": "#e53e3e"
  },
  "frames": [
    ["row0_string_of_length_${frameSize}", "... (${frameSize} rows total)"]
  ]
}`;
}

console.log('Menguji output asli dari model:', model);
const res = await fetch(`${baseUrl}/chat/completions`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  },
  body: JSON.stringify({
    model,
    temperature: 0.2,
    max_tokens: 1500,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: buildSpriteSystemPrompt(16, 4) },
      { role: 'user', content: 'Create a 16x16 pixel art sprite (4 frames) for: tiny red slime' },
    ],
  }),
});

const data = await res.json();
console.log('--- RESPON LENGKAP 9ROUTER ---');
console.log(JSON.stringify(data, null, 2));

