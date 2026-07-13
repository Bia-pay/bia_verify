import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config';
import fs from 'fs';
import path from 'path';

// Local storage fallback configurations
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Check if we should use actual S3 or fallback to local disk
const isMockS3 =
  config.aws.accessKeyId === 'mock-aws-key' ||
  !config.aws.accessKeyId ||
  config.aws.secretAccessKey === 'mock-aws-secret';

let s3Client: S3Client | null = null;

if (!isMockS3) {
  s3Client = new S3Client({
    region: config.aws.region,
    credentials: {
      accessKeyId: config.aws.accessKeyId,
      secretAccessKey: config.aws.secretAccessKey,
    },
    endpoint: config.aws.endpoint,
    forcePathStyle: config.aws.forcePathStyle,
  });
} else {
  console.log(`[Storage] S3 credentials not configured. Falling back to local disk uploads at: ${UPLOADS_DIR}`);
}

export const storageService = {
  /**
   * Upload a file to S3 or local directory.
   * Returns a unique storage key.
   */
  uploadFile: async (fileBuffer: Buffer, originalName: string, mimeType: string): Promise<string> => {
    const fileExtension = path.extname(originalName);
    const uniqueKey = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}${fileExtension}`;

    if (s3Client) {
      const command = new PutObjectCommand({
        Bucket: config.aws.bucketName,
        Key: uniqueKey,
        Body: fileBuffer,
        ContentType: mimeType,
      });
      await s3Client.send(command);
      return uniqueKey;
    } else {
      // Local storage fallback
      const filePath = path.join(UPLOADS_DIR, uniqueKey);
      await fs.promises.writeFile(filePath, fileBuffer);
      return uniqueKey;
    }
  },

  /**
   * Generate a secure, time-limited presigned URL to view/download a file.
   */
  getDownloadUrl: async (key: string, expirySeconds: number = 900): Promise<string> => {
    if (s3Client) {
      const command = new GetObjectCommand({
        Bucket: config.aws.bucketName,
        Key: key,
      });
      return await getSignedUrl(s3Client, command, { expiresIn: expirySeconds });
    } else {
      // Local storage fallback URL pointing to our local server
      // The frontend will request this backend route, which enforces auth before streaming the file.
      return `http://localhost:${config.port}/api/v1/kyc/files/${key}`;
    }
  },

  /**
   * Retrieve a file's raw buffer (used for local server streaming fallback).
   */
  getLocalFileStream: (key: string): fs.ReadStream => {
    const filePath = path.join(UPLOADS_DIR, key);
    if (!fs.existsSync(filePath)) {
      throw new Error('File not found');
    }
    return fs.createReadStream(filePath);
  }
};
