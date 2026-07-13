import { Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { db } from '../db';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { auditService } from '../services/audit';
import { decrypt } from '../services/crypto';

export const businessController = {
  /**
   * Rotate the API key. Hashed using bcrypt, shown once in plaintext.
   */
  rotateApiKey: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.business) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const businessId = req.business.id;
    const businessEmail = req.business.email;

    try {
      const secret = crypto.randomBytes(24).toString('hex');
      const plaintextApiKey = `bv_${businessId}_${secret}`;
      const apiKeyHash = await bcrypt.hash(plaintextApiKey, 10);

      await db.query(
        'UPDATE businesses SET api_key_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [apiKeyHash, businessId]
      );

      await auditService.log({
        businessId,
        userId: businessEmail,
        action: 'api_key_rotate',
        resource: `business:${businessId}`,
        details: 'Business API key rotated successfully.',
        req
      });

      return res.status(200).json({
        message: 'API Key rotated successfully. Store this key carefully as it cannot be shown again.',
        apiKey: plaintextApiKey
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get partial representation of current API key status (e.g. exists or not)
   */
  getApiKeyStatus: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.business) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const result = await db.query(
        'SELECT api_key_hash, kyc_status FROM businesses WHERE id = $1',
        [req.business.id]
      );

      const business = result.rows[0];
      const hasKey = !!business.api_key_hash;

      return res.status(200).json({
        hasKey,
        kycStatus: business.kyc_status,
        message: hasKey
          ? 'API key is configured. You can rotate it if lost.'
          : 'No API key generated yet.'
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get verification history for the business dashboard
   */
  getUsageHistory: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.business) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      // Fetch verifications run by this business, ordered by date
      const result = await db.query(
        `SELECT id, status, cost_charged, created_at, 
                first_name_encrypted, last_name_encrypted, nin_encrypted
         FROM verifications 
         WHERE business_id = $1 
         ORDER BY created_at DESC 
         LIMIT 100`,
        [req.business.id]
      );

      // Decrypt PII fields for display in business dashboard
      const formattedHistory = result.rows.map((row: any) => {
        let first = '';
        let last = '';
        let nin = '';

        try {
          if (row.first_name_encrypted) first = decrypt(row.first_name_encrypted);
          if (row.last_name_encrypted) last = decrypt(row.last_name_encrypted);
          if (row.nin_encrypted) {
            const rawNin = decrypt(row.nin_encrypted);
            // Mask NIN for dashboard display to avoid full PII exposure (e.g., '123456*****')
            nin = rawNin.substring(0, 6) + '*****';
          }
        } catch (decryptErr) {
          console.warn('[Decryption Warning] Failed to decrypt log item:', row.id);
          first = '[Error]';
          last = '[Error]';
          nin = '******';
        }

        return {
          id: row.id,
          status: row.status,
          costCharged: parseFloat(row.cost_charged),
          createdAt: row.created_at,
          firstName: first,
          lastName: last,
          nin: nin,
        };
      });

      return res.status(200).json({
        history: formattedHistory
      });
    } catch (error) {
      next(error);
    }
  }
};
