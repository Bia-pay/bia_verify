import dotenv from 'dotenv';
import path from 'path';

// Load .env file
dotenv.config();

const requiredEnv = [
  'DATABASE_URL',
  'REDIS_URL',
  'JWT_SECRET',
  'JWT_ADMIN_SECRET',
  'ENCRYPTION_KEY',
];

// In production, enforce required variables
if (process.env.NODE_ENV === 'production') {
  for (const envVar of requiredEnv) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }
}

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database & Cache
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/biaverify',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  
  // Security / Encryption
  jwtSecret: process.env.JWT_SECRET || 'fallback-business-jwt-secret-key-12345',
  jwtAdminSecret: process.env.JWT_ADMIN_SECRET || 'fallback-admin-jwt-secret-key-12345',
  encryptionKey: process.env.ENCRYPTION_KEY || '12345678901234567890123456789012', // Must be 32 bytes
  piiRetentionDays: parseInt(process.env.PII_RETENTION_DAYS || '90', 10),
  
  // S3 / Storage (Private credentials)
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'mock-aws-key',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'mock-aws-secret',
    region: process.env.AWS_REGION || 'us-east-1',
    bucketName: process.env.AWS_S3_BUCKET || 'biaverify-kyc-docs',
    endpoint: process.env.AWS_S3_ENDPOINT || undefined, // Useful for LocalStack or custom S3 backends
    forcePathStyle: process.env.AWS_S3_FORCE_PATH_STYLE === 'true',
  },
  
  // Upstream verification (Generically named to avoid leaking upstream provider)
  upstream: {
    url: process.env.UPSTREAM_VERIFICATION_URL || 'http://localhost:5001/api/mock-upstream',
    key: process.env.UPSTREAM_VERIFICATION_KEY || 'mock-upstream-api-key',
    privateKey: process.env.UPSTREAM_VERIFICATION_PRIVATE_KEY || '',
  },
  
  // PalmPay configurations
  palmpay: {
    merchantId: process.env.PALMPAY_MERCHANT_ID || 'mock-merchant-id',
    appId: process.env.PALMPAY_APP_ID || 'mock-app-id',
    secretKey: process.env.PALMPAY_SECRET_KEY || 'mock-palmpay-secret',
    publicKey: process.env.PALMPAY_PUBLIC_KEY || '',
    merchantPublicKey: process.env.PALMPAY_MERCHANT_PUBLIC_KEY || '',
    apiUrl: process.env.PALMPAY_API_URL || 'http://localhost:5001/api/mock-palmpay',
  },

  // Platform-level BVN used for all VA provisioning (never exposed to clients)
  platformBvn: process.env.PLATFORM_BVN || '22532226770',
};
