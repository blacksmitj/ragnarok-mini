import { Router, Request, Response } from 'express';

export const adminSpriteAiRouter = Router();

type SupportedFrameSize = 16 | 24 | 32;

interface TextSpriteMatrix {
  name: string;
  frameWidth: SupportedFrameSize;
  frameHeight: SupportedFrameSize;
  palette: Record<string, string>;
  frames: string[][];
}

const VALID_FRAME_SIZES: readonly SupportedFrameSize[] = [16, 24, 32];

/**
 * Membangun system prompt terstruktur agar LLM menghasilkan JSON matriks piksel
 * yang valid, konsisten, dan siap dirender ke HTML5 Canvas.
 */
function buildSpriteSystemPrompt(frameSize: SupportedFrameSize, frameCount: number): string {
  return `You are a pixel art spritesheet generator for a 2D retro RPG (Ragnarok Online style).
Output ONLY a valid JSON object (no markdown fences, no commentary) matching this exact schema:
{
  "name": "short_snake_case_name",
  "frameWidth": ${frameSize},
  "frameHeight": ${frameSize},
  "palette": {
    ".": "transparent",
    "k": "#1a1a1a"
  },
  "frames": [
    ["row0_string_of_length_${frameSize}", "... (${frameSize} rows total)"]
  ]
}

Strict rules:
1. "frames" MUST contain exactly ${frameCount} frames representing a smooth idle/bounce/walk animation loop.
2. Every frame MUST have exactly ${frameSize} rows.
3. Every row string MUST have exactly ${frameSize} characters.
4. Every character used in "frames" MUST exist in "palette". Use "." for "transparent".
5. Keep the sprite centered with clear dark outlines ("k") and 3-6 shading colors.`;
}

/**
 * Membersihkan reasoning (<think>...</think>), markdown fences (```json ... ```),
 * dan teks pemikiran model LLM agar hanya menyisakan objek JSON murni.
 */
function extractJsonFromLlm(rawText: string): unknown {
  // 1. Buang blok pemikiran model seperti <think>...</think>
  let cleaned = rawText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  // 2. Coba match blok markdown ```json ... ```
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch {
      // jika gagal, lanjut ke regex kurung kurawal
    }
  }

  // 3. Ambil substring antara kurung kurawal terluar { ... }
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const jsonCandidate = cleaned.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(jsonCandidate);
    } catch (e) {
      console.error('[AI Sprite] Gagal parse JSON candidate:', jsonCandidate.slice(0, 200));
      throw e;
    }
  }

  // 4. Fallback parse
  return JSON.parse(cleaned);
}

/**
 * Memvalidasi dan menormalisasi dimensi matriks agar aman dirender di client.
 */
function normalizeAndValidateMatrix(
  raw: unknown,
  expectedSize: SupportedFrameSize,
  expectedFrames: number
): TextSpriteMatrix {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Output LLM bukan objek JSON yang valid');
  }

  const obj = raw as Record<string, unknown>;
  if (!obj.palette || typeof obj.palette !== 'object') {
    throw new Error('Field "palette" tidak ditemukan atau tidak valid');
  }
  if (!Array.isArray(obj.frames) || obj.frames.length === 0) {
    throw new Error('Field "frames" kosong atau bukan array');
  }

  const palette = obj.palette as Record<string, string>;
  if (!palette['.']) {
    palette['.'] = 'transparent';
  }

  // Normalisasi tiap frame agar tepat expectedSize x expectedSize
  const normalizedFrames: string[][] = obj.frames.slice(0, expectedFrames).map((frame) => {
    if (!Array.isArray(frame)) {
      throw new Error('Format frame tidak valid (harus array string)');
    }
    const rows: string[] = [];
    for (let y = 0; y < expectedSize; y++) {
      const rawRow = typeof frame[y] === 'string' ? frame[y] : '';
      // Potong jika berlebih, atau pad dengan '.' jika kurang
      const normalizedRow = rawRow.slice(0, expectedSize).padEnd(expectedSize, '.');
      rows.push(normalizedRow);
    }
    return rows;
  });

  return {
    name: typeof obj.name === 'string' && obj.name.trim() ? obj.name.trim() : 'ai_sprite',
    frameWidth: expectedSize,
    frameHeight: expectedSize,
    palette,
    frames: normalizedFrames,
  };
}

/**
 * POST /api/admin/generate-sprite-text
 * Menghasilkan spritesheet pixel-art dalam format JSON Matrix menggunakan 9Router LLM.
 */
adminSpriteAiRouter.post('/generate-sprite-text', async (req: Request, res: Response) => {
  const { prompt, frameSize = 16, frameCount = 4 } = req.body as {
    prompt?: string;
    frameSize?: number;
    frameCount?: number;
  };

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ success: false, error: 'Prompt deskripsi wajib diisi' });
  }

  const targetSize: SupportedFrameSize = VALID_FRAME_SIZES.includes(frameSize as SupportedFrameSize)
    ? (frameSize as SupportedFrameSize)
    : 16;
  const targetFrames = frameCount === 3 ? 3 : 4;

  const routerUrl = (process.env.NINE_ROUTER_URL || 'http://localhost:20128/v1').replace(/\/+$/, '');
  const apiKey = process.env.NINE_ROUTER_API_KEY || 'sk-local';
  const model = process.env.NINE_ROUTER_MODEL || 'default';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    const llmResponse = await fetch(`${routerUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 3000,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'sprite_matrix',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                frameWidth: { type: 'number' },
                frameHeight: { type: 'number' },
                palette: {
                  type: 'object',
                  additionalProperties: { type: 'string' },
                },
                frames: {
                  type: 'array',
                  items: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                },
              },
              required: ['name', 'frameWidth', 'frameHeight', 'palette', 'frames'],
              additionalProperties: false,
            },
          },
        },
        messages: [
          { role: 'system', content: buildSpriteSystemPrompt(targetSize, targetFrames) },
          { role: 'user', content: `Create a ${targetSize}x${targetSize} pixel art sprite (${targetFrames} frames) for: ${prompt.trim()}` },
        ],
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!llmResponse.ok) {
      const errText = await llmResponse.text();
      return res.status(502).json({
        success: false,
        error: `9Router merespons error (${llmResponse.status}): ${errText.slice(0, 200)}`,
      });
    }

    const completion = (await llmResponse.json()) as {
      choices?: Array<{ message?: { content?: string; reasoning_content?: string } }>;
    };
    const choice = completion.choices?.[0]?.message;
    let content = choice?.content?.trim();

    // Jika content kosong tetapi ada reasoning_content, cari blok JSON di dalamnya
    if (!content && choice?.reasoning_content) {
      const reasoning = choice.reasoning_content;
      const firstB = reasoning.indexOf('{');
      const lastB = reasoning.lastIndexOf('}');
      if (firstB !== -1 && lastB !== -1 && lastB > firstB) {
        content = reasoning.slice(firstB, lastB + 1);
      }
    }

    if (!content) {
      console.error('[AI Sprite] Response payload:', JSON.stringify(completion));
      return res.status(502).json({ success: false, error: 'Respons LLM dari 9Router kosong' });
    }

    const parsed = extractJsonFromLlm(content);
    const matrix = normalizeAndValidateMatrix(parsed, targetSize, targetFrames);

    return res.json({ success: true, data: matrix });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: `Gagal menghasilkan sprite dari 9Router: ${(error as Error).message}`,
    });
  }
});

