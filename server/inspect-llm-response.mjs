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

const prompt = 'tiny red slime';
const targetSize = 16;
const targetFrames = 4;

const systemPrompt = `You are a pixel art spritesheet generator for a 2D retro RPG (Ragnarok Online style).
Output ONLY a valid JSON object matching this exact schema:
{
  "name": "short_snake_case_name",
  "frameWidth": ${targetSize},
  "frameHeight": ${targetSize},
  "palette": {
    ".": "transparent",
    "k": "#1a1a1a"
  },
  "frames": [
    ["row0_string_of_length_${targetSize}", "... (${targetSize} rows total)"]
  ]
}

Strict rules:
1. "frames" MUST contain exactly ${targetFrames} frames.
2. Every frame MUST have exactly ${targetSize} rows.
3. Every row string MUST have exactly ${targetSize} characters.
4. Every character used in "frames" MUST exist in "palette". Use "." for "transparent".
5. Return ONLY the JSON object. Do not include explanation, greetings, or markdown fences.`;

console.log(`Mengirim request ke ${model}...`);
const res = await fetch(`${baseUrl}/chat/completions`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`
  },
  body: JSON.stringify({
    model,
    temperature: 0.2,
    max_tokens: 2000,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Create a ${targetSize}x${targetSize} pixel art sprite (${targetFrames} frames) for: ${prompt}` }
    ]
  })
});

const data = await res.json();
console.log('=== CHOICES[0] DARI 9ROUTER ===');
console.log(JSON.stringify(data.choices?.[0], null, 2));

