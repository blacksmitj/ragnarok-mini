import { Router, Request, Response } from 'express';
import multer from 'multer';
import { storageService } from '../services/storage.service.js';

export const uploadRouter = Router();

// Konfigurasi Multer Memory Storage (File buffer langsung dikirim ke S3 RustFS)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // Maksimal 15 MB per file
  },
});

/**
 * POST /api/admin/upload
 * Menerima file multipart/form-data dengan field 'file' dan opsional 'folder'
 */
uploadRouter.post('/', upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Tidak ada file yang diunggah' });
      return;
    }

    const folder = (req.body.folder as string) || 'assets';
    const result = await storageService.uploadFile(req.file, folder);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('[UploadRouter] Error saat upload ke S3:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Gagal mengunggah file ke storage',
    });
  }
});

