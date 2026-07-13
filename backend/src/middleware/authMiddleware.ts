import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { config } from '../config';
import { db } from '../db';

export interface AuthenticatedRequest extends Request {
  business?: {
    id: string;
    email: string;
    fullName: string;
    kycStatus: string;
    singleVerificationPrice: number;
    bulkVerificationSurcharge: number;
  };
}

/**
 * Middleware to authenticate a business user session (dashboard JWT).
 */
export async function verifySession(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    let token = '';

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: Session token missing' });
    }

    const decoded = jwt.verify(token, config.jwtSecret) as { id: string; email: string; fullName: string };
    
    // Fetch business status to ensure it still exists and check status
    const result = await db.query(
      'SELECT id, email, full_name, kyc_status, single_verification_price, bulk_verification_surcharge FROM businesses WHERE id = $1',
      [decoded.id]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ error: 'Unauthorized: Business account not found' });
    }

    const business = result.rows[0];
    req.business = {
      id: business.id,
      email: business.email,
      fullName: business.full_name,
      kycStatus: business.kyc_status,
      singleVerificationPrice: parseFloat(business.single_verification_price),
      bulkVerificationSurcharge: parseFloat(business.bulk_verification_surcharge)
    };

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized: Invalid session token' });
  }
}

/**
 * Middleware that accepts EITHER a valid business session OR a valid admin session.
 * Used for shared endpoints like the secure KYC file stream.
 * Sets req.business or req.admin depending on which token was presented.
 */
export async function verifyEitherSession(req: any, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    let token = '';

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    } else if (req.cookies?.admin_token) {
      token = req.cookies.admin_token;
    }

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: Session token missing' });
    }

    // Try business JWT first
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as { id: string; email: string };
      const result = await db.query(
        'SELECT id, email, full_name, kyc_status, single_verification_price, bulk_verification_surcharge FROM businesses WHERE id = $1',
        [decoded.id]
      );
      if (result.rowCount !== null && result.rowCount > 0) {
        const biz = result.rows[0];
        req.business = {
          id: biz.id,
          email: biz.email,
          fullName: biz.full_name,
          kycStatus: biz.kyc_status,
          singleVerificationPrice: parseFloat(biz.single_verification_price),
          bulkVerificationSurcharge: parseFloat(biz.bulk_verification_surcharge)
        };
        return next();
      }
    } catch (_) {
      // Not a business token — fall through to try admin
    }

    // Try admin JWT
    try {
      const decoded = jwt.verify(token, config.jwtAdminSecret) as { id: string; email: string };
      const result = await db.query(
        'SELECT id, email, full_name FROM admins WHERE id = $1',
        [decoded.id]
      );
      if (result.rowCount !== null && result.rowCount > 0) {
        const admin = result.rows[0];
        req.admin = { id: admin.id, email: admin.email, fullName: admin.full_name };
        return next();
      }
    } catch (_) {
      // Not a valid admin token either
    }

    return res.status(401).json({ error: 'Unauthorized: Invalid session token' });
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized: Session verification failed' });
  }
}

/**
 * Middleware to authenticate API requests via API keys.
 * Used for /api/v1/verify
 */
export async function verifyApiKey(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: API Key missing. Use Bearer scheme' });
    }

    const apiKey = authHeader.split(' ')[1];
    if (!apiKey) {
      return res.status(401).json({ error: 'Unauthorized: API Key missing' });
    }

    // Performance optimization: we query active businesses
    // Since API keys are hashed, we can retrieve candidate businesses by matching prefix or do a broad search,
    // but to avoid timing attacks or full table scans, we can do direct database lookups.
    // However, bcrypt is slow, so we can't easily bcrypt hash lookup on the fly.
    // Instead of querying and bcrypt-comparing all records, we can prefix the API key (e.g. "bv_live_ABC123...")
    // where the first 8 characters are a lookup index, or we can use a faster hash (SHA-256) for lookups and bcrypt/argon2 for verification.
    // Let's implement a secure SHA-256 hash lookup, or standard bcrypt search if number of businesses is small.
    // A great industry standard: API Key is structured as `prefix_keyid_secret`.
    // Let's assume API keys are structured as `bv_<prefix>_<secret>` (e.g. `bv_1a2b3c_secret`).
    // The database stores a SHA-256 hash of the full API key. SHA-256 is extremely fast and secure for lookup,
    // and we can index it! Let's check how we want to store it.
    // Wait, the prompt says: "API keys hashed (bcrypt/argon2), never logged in plaintext."
    // If we use bcrypt directly, since the API key is randomly generated, we can fetch all businesses and compare them,
    // OR we can store an ID identifier in the key (e.g. `bv_businessid_secret`) to directly look up the business and verify.
    // That is brilliant! Let's generate keys like: `bv_${businessId}_${randomString}`.
    // That way, we can parse the businessId, look it up instantly, and then check `bcrypt.compareSync(apiKey, db.api_key_hash)`.
    // This is fast (indexed lookup), secure, and fulfills "API keys hashed (bcrypt)".
    // Let's write that logic.
    
    if (!apiKey.startsWith('bv_')) {
      return res.status(401).json({ error: 'Unauthorized: Invalid API key format' });
    }

    const parts = apiKey.split('_');
    if (parts.length < 3) {
      return res.status(401).json({ error: 'Unauthorized: Invalid API key format' });
    }

    const businessId = parts[1];
    const result = await db.query(
      'SELECT id, email, full_name, kyc_status, api_key_hash, single_verification_price, bulk_verification_surcharge FROM businesses WHERE id = $1',
      [businessId]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
    }

    const business = result.rows[0];
    if (!business.api_key_hash) {
      return res.status(401).json({ error: 'Unauthorized: Active API key not found' });
    }

    const isMatch = await bcrypt.compare(apiKey, business.api_key_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
    }

    // Check KYC approval status
    if (business.kyc_status !== 'approved') {
      return res.status(403).json({
        error: 'KYC Pending',
        message: 'Your API key is inactive. Please complete KYC and obtain admin approval.'
      });
    }

    req.business = {
      id: business.id,
      email: business.email,
      fullName: business.full_name,
      kycStatus: business.kyc_status,
      singleVerificationPrice: parseFloat(business.single_verification_price),
      bulkVerificationSurcharge: parseFloat(business.bulk_verification_surcharge)
    };

    next();
  } catch (error) {
    console.error('API key auth error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
