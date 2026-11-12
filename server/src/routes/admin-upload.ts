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
 * Helper untuk membaca dimensi PNG dari header IHDR in-memory tanpa dependensi eksternal
 */
function parsePngDimensions(buffer: Buffer): { width: number; height: number; isPng: boolean } {
  // Signature PNG 8 bytes: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length < 24 ||
    buffer[0] !== 0x89 ||
    buffer[1] !== 0x50 ||
    buffer[2] !== 0x4e ||
    buffer[3] !== 0x47 ||
    buffer[4] !== 0x0d ||
    buffer[5] !== 0x0a ||
    buffer[6] !== 0x1a ||
    buffer[7] !== 0x0a
  ) {
    return { width: 0, height: 0, isPng: false };
  }

  // Width pada offset 16 (4 bytes Big-Endian)
  const width = buffer.readUInt32BE(16);
  // Height pada offset 20 (4 bytes Big-Endian)
  const height = buffer.readUInt32BE(20);

  return { width, height, isPng: true };
}

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

    // Validasi Pengaman Sisi Server (Backend Safeguard) untuk Karakter
    if (folder === 'characters') {
      const { width, height, isPng } = parsePngDimensions(req.file.buffer);

      if (!isPng) {
        res.status(400).json({
          success: false,
          error: 'Format berkas tidak valid! Spritesheet karakter wajib berformat PNG 32-bit.',
        });
        return;
      }

      // Validasi Baris (Mendukung 8 Arah [512px / 256px] atau 4 Arah [256px / 128px])
      const isHeightStandard = height === 512 || height === 256 || height === 128;

      if (!isHeightStandard) {
        res.status(400).json({
          success: false,
          error: `Tinggi gambar (${height}px) ditolak! Wajib tepat 512px (8 arah 64px), 256px (4 arah 64px / 8 arah 32px), atau 128px (4 arah 32px).`,
        });
        return;
      }

      let frameSize = 64;
      if (height === 128) {
        frameSize = 32;
      } else if (height === 256) {
        frameSize = width % 64 === 0 ? 64 : 32;
      } else if (height === 512) {
        frameSize = 64;
      }

      // Validasi Kelipatan Frame Lebar
      if (width % frameSize !== 0) {
        res.status(400).json({
          success: false,
          error: `Lebar gambar (${width}px) bukan kelipatan ${frameSize}px! Setiap frame harus berukuran tepat ${frameSize}x${frameSize}px.`,
        });
        return;
      }

      const cols = width / frameSize;
      if (cols < 3 || cols > 8) {
        res.status(400).json({
          success: false,
          error: `Jumlah kolom frame (${cols}) di luar rentang standar (minimal 3, maksimal 8 frame per baris).`,
        });
        return;
      }
    }

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
