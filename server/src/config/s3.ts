import { S3Client } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
dotenv.config();

const endpoint = process.env.S3_ENDPOINT || 'http://127.0.0.1:9000';
const region = process.env.S3_REGION || 'us-east-1';
const accessKeyId = process.env.S3_ACCESS_KEY || '';
const secretAccessKey = process.env.S3_SECRET_KEY || '';
const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === 'true';

export const s3BucketName = process.env.S3_BUCKET_NAME || 'ragnarok-assets';
export const s3PublicUrl = process.env.S3_PUBLIC_URL || `${endpoint}/${s3BucketName}`;

export const s3Client = new S3Client({
  endpoint,
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
  forcePathStyle,
});

