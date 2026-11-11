import { Router, Request, Response } from 'express';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

export const adminItemsRouter = Router();

// GET all items
adminItemsRouter.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const list = await db.select().from(schema.gameItems);
    res.json({ success: true, data: list });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST create item
adminItemsRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, itemType, element, statsJson, spriteLayerUrl, effectUrl, description } = req.body;

    if (!name || !itemType) {
      res.status(400).json({ error: 'Name dan itemType wajib diisi' });
      return;
    }

    const id = `item_${crypto.randomUUID().slice(0, 8)}`;
    const [inserted] = await db
      .insert(schema.gameItems)
      .values({
        id,
        name,
        itemType,
        element: element || 'neutral',
        statsJson: statsJson || {},
        spriteLayerUrl,
        effectUrl,
        description: description || '',
      })
      .returning();

    res.json({ success: true, data: inserted });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE item
adminItemsRouter.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await db.delete(schema.gameItems).where(eq(schema.gameItems.id, id as any));
    res.json({ success: true, message: 'Item berhasil dihapus' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
