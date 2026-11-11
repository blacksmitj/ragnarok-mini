import { Router, Request, Response } from 'express';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

export const adminMonstersRouter = Router();

// GET all monsters
adminMonstersRouter.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const list = await db.select().from(schema.gameMonsters);
    res.json({ success: true, data: list });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST create monster
adminMonstersRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      isBoss,
      element,
      size,
      statsJson,
      skillsJson,
      spritesheetUrl,
      frameWidth,
      frameHeight,
      dropTableJson,
    } = req.body;

    if (!name || !spritesheetUrl) {
      res.status(400).json({ error: 'Name dan spritesheetUrl wajib diisi' });
      return;
    }

    const id = `mob_${crypto.randomUUID().slice(0, 8)}`;
    const [inserted] = await db
      .insert(schema.gameMonsters)
      .values({
        id,
        name,
        isBoss: Number(isBoss) || 0,
        element: element || 'neutral',
        size: size || 'medium',
        statsJson: statsJson || {},
        skillsJson: skillsJson || [],
        spritesheetUrl,
        frameWidth: Number(frameWidth) || 48,
        frameHeight: Number(frameHeight) || 48,
        dropTableJson: dropTableJson || [],
      })
      .returning();

    res.json({ success: true, data: inserted });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE monster
adminMonstersRouter.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await db.delete(schema.gameMonsters).where(eq(schema.gameMonsters.id, id as any));
    res.json({ success: true, message: 'Monster berhasil dihapus' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
