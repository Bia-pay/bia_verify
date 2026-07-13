import { db } from './index';
import { encrypt, decrypt } from '../services/crypto';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

async function runTests() {
  console.log('=== Starting Bia Verify Backend Diagnostics ===');

  try {
    // 1. Test Database
    console.log('[Test 1/3] Testing PostgreSQL database connection...');
    const dbRes = await db.query('SELECT NOW()');
    console.log(`[PASS] DB connection verified: ${dbRes.rows[0].now}`);

    // 2. Test Encryption
    console.log('[Test 2/3] Testing PII Encryption at Rest (AES-256-GCM)...');
    const testPII = '12345678901'; // Mock NIN
    const encrypted = encrypt(testPII);
    console.log(`- Plaintext NIN: ${testPII}`);
    console.log(`- Encrypted string format: ${encrypted}`);
    
    const decrypted = decrypt(encrypted);
    console.log(`- Decrypted plaintext: ${decrypted}`);
    
    if (testPII === decrypted) {
      console.log('[PASS] GCM encryption/decryption matches.');
    } else {
      throw new Error('Encryption mismatch detected!');
    }

    // 3. Test API Key generation and hashing
    console.log('[Test 3/3] Testing API Key Structuring & Bcrypt Hashing...');
    const mockBizId = crypto.randomUUID();
    const secret = crypto.randomBytes(24).toString('hex');
    const plaintextApiKey = `bv_${mockBizId}_${secret}`;
    const hash = await bcrypt.hash(plaintextApiKey, 10);
    
    console.log(`- Generated structured Key: ${plaintextApiKey}`);
    console.log(`- Salted bcrypt hash: ${hash}`);
    
    const isMatch = await bcrypt.compare(plaintextApiKey, hash);
    if (isMatch) {
      console.log('[PASS] API Key bcrypt validation succeeds.');
    } else {
      throw new Error('Bcrypt comparison failed!');
    }

    console.log('=== All Backend Diagnostics Passed! ===');
  } catch (err: any) {
    console.error('[FAIL] Diagnostics failed:', err.message);
  } finally {
    await db.close();
    process.exit(0);
  }
}

runTests();
