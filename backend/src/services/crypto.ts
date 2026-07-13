import crypto from 'crypto';
import { config } from '../config';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM is standard and recommended
const TAG_LENGTH = 16; // 128 bits auth tag

/**
 * Get the encryption key buffer. Enforces 32 bytes.
 */
function getEncryptionKey(): Buffer {
  const key = config.encryptionKey;
  if (!key) {
    throw new Error('Encryption key is not set in configuration.');
  }
  
  const buffer = Buffer.from(key, 'utf8');
  if (buffer.length !== 32) {
    // If not 32 bytes, hash it to derive a secure 32-byte key
    return crypto.createHash('sha256').update(key).digest();
  }
  
  return buffer;
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns a string formatted as: ivHex.tagHex.encryptedHex
 */
export function encrypt(text: string): string {
  if (!text) return '';
  
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}.${tag.toString('hex')}.${encrypted}`;
}

/**
 * Decrypt an encrypted string (ivHex.tagHex.encryptedHex format) back to plaintext.
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return '';
  
  const parts = encryptedText.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted text format. Expected iv.tag.ciphertext');
  }
  
  const [ivHex, tagHex, ciphertextHex] = parts;
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  
  let decrypted = decipher.update(ciphertext, 'hex' as any, 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Encrypt an object (serializes to JSON first).
 */
export function encryptObject(obj: Record<string, any>): string {
  return encrypt(JSON.stringify(obj));
}

/**
 * Decrypt to an object.
 */
export function decryptObject<T = Record<string, any>>(encryptedText: string): T {
  const jsonStr = decrypt(encryptedText);
  return JSON.parse(jsonStr) as T;
}
