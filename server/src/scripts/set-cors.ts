import { 
  PutBucketCorsCommand 
} from '@aws-sdk/client-s3';
import { s3Client, s3BucketName } from '../config/s3.js';
import dotenv from 'dotenv';
dotenv.config();

async function setCors() {
  console.log(`[S3-CORS] Menyetel CORS pada bucket "${s3BucketName}"...`);

  try {
    const corsParams = {
      Bucket: s3BucketName,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedHeaders: ['*'],
            AllowedMethods: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE'],
            AllowedOrigins: ['*'], // Izinkan semua origin termasuk localhost:5173
            ExposeHeaders: ['ETag'],
            MaxAgeSeconds: 3000,
          },
        ],
      },
    };

    await s3Client.send(new PutBucketCorsCommand(corsParams));
    console.log(`[S3-CORS] Berhasil menerapkan CORS policy pada bucket "${s3BucketName}"!`);
  } catch (err: any) {
    console.error(`[S3-CORS] Gagal menyetel CORS:`, err.message);
  } finally {
    process.exit(0);
  }
}

setCors();

