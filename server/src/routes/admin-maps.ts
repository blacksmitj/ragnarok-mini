import { Router, Request, Response } from 'express';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

export const adminMapsRouter = Router();

// GET all maps
adminMapsRouter.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const list = await db.select().from(schema.gameMaps);
    res.json({ success: true, data: list });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET single map by id
adminMapsRouter.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const [map] = await db.select().from(schema.gameMaps).where(eq(schema.gameMaps.id, id as any));
    if (!map) {
      res.status(404).json({ error: 'Map tidak ditemukan' });
      return;
    }
    res.json({ success: true, data: map });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST save draft map
adminMapsRouter.post('/draft', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, name, width, height, tileSize, layersJson, thumbnailUrl } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Name map wajib diisi' });
      return;
    }

    const mapId = id || `map_${crypto.randomUUID().slice(0, 8)}`;
    const [saved] = await db
      .insert(schema.gameMaps)
      .values({
        id: mapId,
        name,
        width: Number(width) || 50,
        height: Number(height) || 50,
        tileSize: Number(tileSize) || 32,
        status: 'draft',
        layersJson: layersJson || {},
        thumbnailUrl,
      })
      .onConflictDoUpdate({
        target: schema.gameMaps.id,
        set: {
          name,
          width: Number(width) || 50,
          height: Number(height) || 50,
          tileSize: Number(tileSize) || 32,
          status: 'draft',
          layersJson: layersJson || {},
          thumbnailUrl,
          updatedAt: new Date(),
        },
      })
      .returning();

    res.json({ success: true, data: saved });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST publish map
adminMapsRouter.post('/publish/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const [published] = await db
      .update(schema.gameMaps)
      .set({
        status: 'published',
        updatedAt: new Date(),
      })
      .where(eq(schema.gameMaps.id, id as any))
      .returning();

    if (!published) {
      res.status(404).json({ error: 'Map tidak ditemukan' });
      return;
    }

    res.json({ success: true, data: published });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE map
adminMapsRouter.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await db.delete(schema.gameMaps).where(eq(schema.gameMaps.id, id as any));
    res.json({ success: true, message: 'Map berhasil dihapus' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
