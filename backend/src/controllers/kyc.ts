import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { db } from '../db';
import { storageService } from '../services/s3';
import { auditService } from '../services/audit';
import { encrypt, decrypt } from '../services/crypto';

export const kycController = {
  /**
   * Submit business KYC documents
   */
  submitKyc: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.business) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const businessId = req.business.id;
    const businessEmail = req.business.email;

    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const cacDoc = files?.['cacDocument']?.[0];
      const ndpcDoc = files?.['ndpcDocument']?.[0];
      const photoDoc = files?.['companyPhoto']?.[0];

      const { businessName, businessEmail: bizEmail, businessPhone, businessAddress, cacNumber, ndpcNumber } = req.body;

      if (!businessName || !bizEmail || !businessPhone || !businessAddress || !cacNumber || !ndpcNumber) {
        return res.status(400).json({ error: 'MissingFields', message: 'All text fields are required.' });
      }

      if (!cacDoc || !ndpcDoc || !photoDoc) {
        return res.status(400).json({ error: 'MissingFiles', message: 'CAC certificate, NDPC evidence, and Company photo are all required.' });
      }

      // Upload files to storage (S3 or local fallback)
      const cacKey = await storageService.uploadFile(cacDoc.buffer, cacDoc.originalname, cacDoc.mimetype);
      const ndpcKey = await storageService.uploadFile(ndpcDoc.buffer, ndpcDoc.originalname, ndpcDoc.mimetype);
      const photoKey = await storageService.uploadFile(photoDoc.buffer, photoDoc.originalname, photoDoc.mimetype);

      // Encrypt the storage keys at rest before writing to database
      const encryptedCacKey = encrypt(cacKey);
      const encryptedNdpcKey = encrypt(ndpcKey);
      const encryptedPhotoKey = encrypt(photoKey);

      await db.transaction(async (client) => {
        // Upsert KYC submission (so they can resubmit if rejected)
        await client.query(
          `INSERT INTO business_kycs (
            business_id, business_name, business_email, business_phone, business_address, 
            cac_number, cac_document_key, ndpc_number, ndpc_document_key, company_photo_key,
            submitted_at, reviewed_at, reviewer_note
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, NULL, NULL)
          ON CONFLICT (business_id) DO UPDATE SET
            business_name = EXCLUDED.business_name,
            business_email = EXCLUDED.business_email,
            business_phone = EXCLUDED.business_phone,
            business_address = EXCLUDED.business_address,
            cac_number = EXCLUDED.cac_number,
            cac_document_key = EXCLUDED.cac_document_key,
            ndpc_number = EXCLUDED.ndpc_number,
            ndpc_document_key = EXCLUDED.ndpc_document_key,
            company_photo_key = EXCLUDED.company_photo_key,
            submitted_at = CURRENT_TIMESTAMP,
            reviewed_at = NULL,
            reviewer_note = NULL`,
          [
            businessId,
            businessName,
            bizEmail,
            businessPhone,
            businessAddress,
            cacNumber,
            encryptedCacKey,
            ndpcNumber,
            encryptedNdpcKey,
            encryptedPhotoKey,
          ]
        );

        // Update business status to pending
        await client.query(
          "UPDATE businesses SET kyc_status = 'pending', kyc_rejection_reason = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
          [businessId]
        );
      });

      await auditService.log({
        businessId,
        userId: businessEmail,
        action: 'kyc_submit',
        resource: `business_kyc:${businessId}`,
        details: `KYC documents submitted. CAC: ${cacNumber}, NDPC: ${ndpcNumber}. Status updated to pending.`,
        req
      });

      return res.status(200).json({
        message: 'KYC documents submitted successfully. Admin review pending.',
        status: 'pending'
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get KYC details and status for the business
   */
  getKycStatus: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.business) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const bizRes = await db.query(
        'SELECT kyc_status, kyc_rejection_reason FROM businesses WHERE id = $1',
        [req.business.id]
      );
      
      const kycRes = await db.query(
        `SELECT business_name, business_email, business_phone, business_address, 
                cac_number, ndpc_number, bvn_encrypted, submitted_at, reviewed_at, reviewer_note
         FROM business_kycs WHERE business_id = $1`,
        [req.business.id]
      );

      const kycStatus = bizRes.rows[0];
      const kycDetails = kycRes.rowCount > 0 ? kycRes.rows[0] : null;

      let bvnMasked = '';
      if (kycDetails && kycDetails.bvn_encrypted) {
        try {
          const decryptedBvn = decrypt(kycDetails.bvn_encrypted);
          bvnMasked = decryptedBvn.substring(0, 3) + '******' + decryptedBvn.substring(9);
        } catch (err) {
          console.warn('Failed to decrypt BVN in getKycStatus');
        }
      }

      const formattedDetails = kycDetails ? {
        businessName: kycDetails.business_name,
        businessEmail: kycDetails.business_email,
        businessPhone: kycDetails.business_phone,
        businessAddress: kycDetails.business_address,
        cacNumber: kycDetails.cac_number,
        ndpcNumber: kycDetails.ndpc_number,
        bvnMasked,
        submittedAt: kycDetails.submitted_at,
        reviewedAt: kycDetails.reviewed_at,
        reviewerNote: kycDetails.reviewer_note
      } : null;

      return res.status(200).json({
        status: kycStatus.kyc_status,
        rejectionReason: kycStatus.kyc_rejection_reason,
        details: formattedDetails
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Securely stream file uploads from local disk fallback (with authorization)
   */
  secureFileStream: async (req: any, res: Response, next: NextFunction) => {
    const { key } = req.params;

    // Check if requester is logged in (either business or admin)
    const isBizUser = !!req.business;
    const isAdminUser = !!req.admin;

    if (!isBizUser && !isAdminUser) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      // If it is a business user, they can only download their OWN files
      if (isBizUser) {
        const businessId = req.business.id;
        // Search if this file key belongs to this business
        const result = await db.query(
          'SELECT cac_document_key, ndpc_document_key, company_photo_key FROM business_kycs WHERE business_id = $1',
          [businessId]
        );

        if (result.rowCount === 0) {
          return res.status(403).json({ error: 'Forbidden', message: 'You do not own this document.' });
        }

        const keys = result.rows[0];
        const ownedKeys = [
          decrypt(keys.cac_document_key),
          decrypt(keys.ndpc_document_key),
          decrypt(keys.company_photo_key)
        ];

        if (!ownedKeys.includes(key)) {
          return res.status(403).json({ error: 'Forbidden', message: 'You do not have access to this document.' });
        }
      }

      // Log access audit trail for compliance
      await auditService.log({
        businessId: isBizUser ? req.business.id : null,
        userId: isBizUser ? req.business.email : req.admin.email,
        action: 'pii_access',
        resource: `file:${key}`,
        details: `Secure KYC document streamed.`,
        req
      });

      // Stream the local file back
      const stream = storageService.getLocalFileStream(key);
      
      // Attempt to guess correct content type based on extension
      if (key.endsWith('.pdf')) {
        res.setHeader('Content-Type', 'application/pdf');
      } else if (key.endsWith('.png')) {
        res.setHeader('Content-Type', 'image/png');
      } else {
        res.setHeader('Content-Type', 'image/jpeg');
      }

      stream.pipe(res);
    } catch (error: any) {
      if (error.message === 'File not found') {
        return res.status(404).json({ error: 'NotFound', message: 'Requested document does not exist' });
      }
      next(error);
    }
  }
};
