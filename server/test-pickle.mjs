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
const model = 'oc/big-pickle';

console.log('Testing model:', model);
const r = await fetch(`${baseUrl}/chat/completions`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`
  },
  body: JSON.stringify({
    model,
    temperature: 0.2,
    max_tokens: 1500,
    messages: [
      { 
        role: 'system', 
        content: `You are a pixel art spritesheet generator for a 2D retro RPG (Ragnarok Online style).
Output ONLY a valid JSON object matching this schema:
{
  "name": "slime",
  "frameWidth": 16,
  "frameHeight": 16,
  "palette": {
    ".": "transparent",
    "k": "#1a1a1a",
    "r": "#e53e3e"
  },
  "frames": [
    ["................", "................", "................", "................", "................", "................", ".....kkkk.......", "....krrrrk......", "...krrrrrrk.....", "...krrrrrrk.....", "....krrrrk......", ".....kkkk.......", "................", "................", "................", "................"]
  ]
}
` 
      },
      { role: 'user', content: 'Create a 16x16 pixel art sprite (4 frames) for: tiny red slime' }
    ]
  })
});

const json = await r.json();
console.log('Message Object:', JSON.stringify(json.choices?.[0]?.message, null, 2));

