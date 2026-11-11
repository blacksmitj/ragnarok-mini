import { 
  HeadBucketCommand, 
  CreateBucketCommand, 
  PutBucketPolicyCommand 
} from '@aws-sdk/client-s3';
import { s3Client, s3BucketName } from '../config/s3.js';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Script untuk inisialisasi bucket S3 RustFS / MinIO
 * Membuat bucket jika belum ada dan mengatur read-policy publik untuk asset game.
 */
async function initBucket() {
  console.log(`[S3-Init] Memeriksa keberadaan bucket: "${s3BucketName}"...`);
  
  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: s3BucketName }));
    console.log(`[S3-Init] Bucket "${s3BucketName}" sudah ada dan siap digunakan.`);
  } catch (error: any) {
    if (error?.name === 'NotFound' || error?.$metadata?.httpStatusCode === 404) {
      console.log(`[S3-Init] Bucket "${s3BucketName}" belum ada. Sedang membuat bucket...`);
      try {
        await s3Client.send(new CreateBucketCommand({ Bucket: s3BucketName }));
        console.log(`[S3-Init] Berhasil membuat bucket "${s3BucketName}"!`);

        // Set Public Read Policy agar asset gambar/spritesheet bisa di-load oleh client
        const publicReadPolicy = {
          Version: '2012-10-17',
          Statement: [
            {
              Sid: 'PublicReadGetObject',
              Effect: 'Allow',
              Principal: '*',
              Action: 's3:GetObject',
              Resource: `arn:aws:s3:::${s3BucketName}/*`,
            },
          ],
        };

        try {
          await s3Client.send(new PutBucketPolicyCommand({
            Bucket: s3BucketName,
            Policy: JSON.stringify(publicReadPolicy),
          }));
          console.log(`[S3-Init] Kebijakan Public Read Policy berhasil diterapkan pada bucket.`);
        } catch (policyErr) {
          console.warn(`[S3-Init] Catatan: Tidak dapat menerapkan policy bucket (mungkin RustFS mengelola public bucket via config bawaan):`, (policyErr as Error).message);
        }
      } catch (createErr) {
        console.error(`[S3-Init] Gagal membuat bucket "${s3BucketName}":`, createErr);
        process.exit(1);
      }
    } else {
      console.warn(`[S3-Init] Peringatan saat menghubungi endpoint S3 (${error.message}). Pastikan layanan RustFS / S3 sedang berjalan.`);
    }
  }
}

initBucket().then(() => {
  console.log('[S3-Init] Script inisialisasi selesai.');
  process.exit(0);
}).catch((err) => {
  console.error('[S3-Init] Terjadi error:', err);
  process.exit(1);
});

