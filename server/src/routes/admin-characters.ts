import { Router, Request, Response } from 'express';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

export const adminCharactersRouter = Router();

// GET all character sprites
adminCharactersRouter.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const list = await db.select().from(schema.characterSprites);
    res.json({ success: true, data: list });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST create character sprite
adminCharactersRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      gender,
      name,
      spriteType,
      idleSheetUrl,
      walkSheetUrl,
      attackSheetUrl,
      dieSheetUrl,
      frameWidth,
      frameHeight,
      frameRate,
    } = req.body;

    if (!gender || !name || !idleSheetUrl) {
      res.status(400).json({ error: 'Gender, Name, dan IdleSheetUrl wajib diisi' });
      return;
    }

    const fWidth = Number(frameWidth) || 64;
    const fHeight = Number(frameHeight) || 64;
    if ((fWidth !== 64 && fWidth !== 32) || fWidth !== fHeight) {
      res.status(400).json({
        success: false,
        error: 'Ukuran frame ditolak! Wajib menggunakan standar baku 64x64px atau 32x32px (bukan dinamis).',
      });
      return;
    }

    const id = `char_${crypto.randomUUID().slice(0, 8)}`;
    const [inserted] = await db
      .insert(schema.characterSprites)
      .values({
        id,
        gender,
        name,
        spriteType: spriteType || 'body',
        idleSheetUrl,
        walkSheetUrl,
        attackSheetUrl,
        dieSheetUrl,
        frameWidth: fWidth,
        frameHeight: fHeight,
        frameRate: Number(frameRate) || 8,
      })
      .returning();

    res.json({ success: true, data: inserted });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE character sprite
adminCharactersRouter.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await db.delete(schema.characterSprites).where(eq(schema.characterSprites.id, id as any));
    res.json({ success: true, message: 'Character sprite berhasil dihapus' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
