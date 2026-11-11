import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, s3BucketName, s3PublicUrl } from '../config/s3.js';
import crypto from 'crypto';
import path from 'path';

export interface UploadResult {
  key: string;
  url: string;
  size: number;
  contentType: string;
}

export class StorageService {
  /**
   * Upload buffer file ke bucket S3 RustFS
   * @param file Express.Multer.File
   * @param folder misal: 'characters', 'items', 'monsters', 'maps'
   */
  async uploadFile(file: Express.Multer.File, folder = 'general'): Promise<UploadResult> {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueId = crypto.randomUUID();
    const cleanFileName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `${folder}/${Date.now()}_${uniqueId.slice(0, 8)}_${cleanFileName}`;

    const command = new PutObjectCommand({
      Bucket: s3BucketName,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    await s3Client.send(command);

    // Format public URL
    const url = `${s3PublicUrl}/${key}`;

    return {
      key,
      url,
      size: file.size,
      contentType: file.mimetype,
    };
  }

  /**
   * Hapus objek dari bucket S3
   */
  async deleteFile(key: string): Promise<boolean> {
    try {
      await s3Client.send(new DeleteObjectCommand({
        Bucket: s3BucketName,
        Key: key,
      }));
      return true;
    } catch (err) {
      console.error(`[StorageService] Gagal menghapus file "${key}":`, err);
      return false;
    }
  }
}

export const storageService = new StorageService();

