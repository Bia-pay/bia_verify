import { Response, NextFunction } from 'express';
import { db } from '../db';
import { AuthenticatedAdminRequest } from '../middleware/adminAuthMiddleware';
import { auditService } from '../services/audit';
import { storageService } from '../services/s3';
import { decrypt } from '../services/crypto';
import { paymentProvider } from '../services/paymentProvider';
import { config } from '../config';

export const adminController = {
  /**
   * Get revenue aggregations grouped by day, week, or month.
   * Filterable by businessId.
   */
  getRevenue: async (req: AuthenticatedAdminRequest, res: Response, next: NextFunction) => {
    const { businessId, period } = req.query; // period can be 'day', 'week', 'month'
    
    let interval = 'day';
    if (period === 'week' || period === 'month') {
      interval = period;
    }

    try {
      let queryStr = `
        SELECT 
          DATE_TRUNC($1, created_at) AS date,
          SUM(cost_charged) AS total_collected,
          SUM(upstream_cost) AS total_upstream,
          SUM(platform_margin) AS total_margin,
          COUNT(*) as count
        FROM verifications
        WHERE status != 'failed'
      `;

      const params: any[] = [interval];
      
      if (businessId && typeof businessId === 'string' && businessId.trim().length > 0) {
        queryStr += ` AND business_id = $2`;
        params.push(businessId);
      }

      queryStr += `
        GROUP BY DATE_TRUNC($1, created_at)
        ORDER BY date DESC
        LIMIT 50
      `;

      const result = await db.query(queryStr, params);

      const formatted = result.rows.map((row: any) => ({
        date: row.date,
        totalCollected: parseFloat(row.total_collected || 0),
        totalUpstream: parseFloat(row.total_upstream || 0),
        totalMargin: parseFloat(row.total_margin || 0),
        count: parseInt(row.count || 0, 10),
      }));

      // Calculate totals
      const totals = formatted.reduce(
        (acc, curr) => {
          acc.collected += curr.totalCollected;
          acc.upstream += curr.totalUpstream;
          acc.margin += curr.totalMargin;
          acc.count += curr.count;
          return acc;
        },
        { collected: 0, upstream: 0, margin: 0, count: 0 }
      );

      return res.status(200).json({
        period: interval,
        totals,
        breakdown: formatted,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Live API Call feed (polling endpoint for recent lookups)
   */
  getLiveFeed: async (req: AuthenticatedAdminRequest, res: Response, next: NextFunction) => {
    try {
      const result = await db.query(`
        SELECT 
          v.id, v.status, v.cost_charged, v.platform_margin, v.created_at, v.latency_ms,
          b.full_name as business_name, b.email as business_email
        FROM verifications v
        LEFT JOIN businesses b ON v.business_id = b.id
        ORDER BY v.created_at DESC
        LIMIT 50
      `);

      const formatted = result.rows.map((row: any) => ({
        id: row.id,
        status: row.status,
        costCharged: parseFloat(row.cost_charged),
        marginEarned: parseFloat(row.platform_margin),
        createdAt: row.created_at,
        latencyMs: row.latency_ms,
        businessName: row.business_name || 'Deleted Business',
        businessEmail: row.business_email || '',
      }));

      return res.status(200).json({
        feed: formatted
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * List pending KYC submissions
   */
  getKycQueue: async (req: AuthenticatedAdminRequest, res: Response, next: NextFunction) => {
    try {
      const result = await db.query(`
        SELECT 
          k.id, k.business_id, k.business_name, k.business_email, k.business_phone, k.business_address,
          k.cac_number, k.cac_document_key, k.ndpc_number, k.ndpc_document_key, k.company_photo_key, k.submitted_at,
          b.kyc_status
        FROM business_kycs k
        JOIN businesses b ON k.business_id = b.id
        WHERE b.kyc_status IN ('pending', 'rejected')
        ORDER BY k.submitted_at ASC
      `);

      const queue = [];
      
      for (const row of result.rows) {
        // Decrypt document keys and generate secure presigned URLs
        let cacUrl = '#';
        let ndpcUrl = '#';
        let photoUrl = '#';

        try {
          const cacKey = decrypt(row.cac_document_key);
          const ndpcKey = decrypt(row.ndpc_document_key);
          const photoKey = decrypt(row.company_photo_key);

          cacUrl = await storageService.getDownloadUrl(cacKey);
          ndpcUrl = await storageService.getDownloadUrl(ndpcKey);
          photoUrl = await storageService.getDownloadUrl(photoKey);
        } catch (decryptErr) {
          console.warn(`[Admin KYC Decrypt Error] Failed to generate presigned URLs for KYC id: ${row.id}`);
        }

        queue.push({
          id: row.id,
          businessId: row.business_id,
          businessName: row.business_name,
          businessEmail: row.business_email,
          businessPhone: row.business_phone,
          businessAddress: row.business_address,
          cacNumber: row.cac_number,
          ndpcNumber: row.ndpc_number,
          submittedAt: row.submitted_at,
          kycStatus: row.kyc_status,
          documents: {
            cacUrl,
            ndpcUrl,
            photoUrl
          }
        });
      }

      return res.status(200).json({ queue });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Approve or reject a business KYC
   */
  reviewKyc: async (req: AuthenticatedAdminRequest, res: Response, next: NextFunction) => {
    if (!req.admin) return res.status(401).json({ error: 'Unauthorized' });
    
    const { businessId, action, note } = req.body; // action: 'approve' | 'reject'

    if (!businessId || !action) {
      return res.status(400).json({ error: 'InvalidRequest', message: 'businessId and action are required.' });
    }

    if (action !== 'approve' && action !== 'reject') {
      return res.status(400).json({ error: 'InvalidAction', message: 'Action must be approve or reject.' });
    }

    if (action === 'reject' && (!note || note.trim().length === 0)) {
      return res.status(400).json({ error: 'NoteRequired', message: 'A rejection reason note is required.' });
    }

    try {
      const bizRes = await db.query('SELECT email, full_name FROM businesses WHERE id = $1', [businessId]);
      if (bizRes.rowCount === 0) {
        return res.status(404).json({ error: 'NotFound', message: 'Business account not found.' });
      }

      const businessEmail = bizRes.rows[0].email;
      const ownerFullName = bizRes.rows[0].full_name;
      const status = action === 'approve' ? 'approved' : 'rejected';

      // No virtual account creation during KYC approval.
      // After successful KYC, users can generate a virtual account by clicking a button in their panel.
      await db.transaction(async (client) => {
        // Update KYC details review log
        await client.query(
          `UPDATE business_kycs 
           SET reviewed_at = CURRENT_TIMESTAMP, reviewer_note = $1 
           WHERE business_id = $2`,
          [note || 'Approved by administrator', businessId]
        );

        // Update businesses KYC status
        await client.query(
          `UPDATE businesses 
           SET kyc_status = $1, kyc_rejection_reason = $2, updated_at = CURRENT_TIMESTAMP 
           WHERE id = $3`,
          [status, action === 'reject' ? note : null, businessId]
        );
      });

      // Log admin audit trail
      await auditService.log({
        businessId,
        userId: req.admin.email,
        action: 'kyc_review',
        resource: `business_kyc:${businessId}`,
        details: `KYC submission reviewed. Action: ${action.toUpperCase()}. Note: ${note || 'N/A'}`,
        req
      });

      return res.status(200).json({
        message: `Business KYC has been ${status} successfully.`,
        status,
        virtualAccount: null
      });
    } catch (error: any) {
      console.error('[Kyc Approval Action Failed]:', error.message);
      next(error);
    }
  },

  /**
   * List all business accounts with details
   */
  getBusinesses: async (req: AuthenticatedAdminRequest, res: Response, next: NextFunction) => {
    try {
      const result = await db.query(`
        SELECT 
          b.id, b.email, b.full_name, b.phone_number, b.kyc_status, b.suspended, b.created_at,
          b.single_verification_price, b.bulk_verification_surcharge,
          w.balance, w.virtual_account_number, w.virtual_account_name, w.virtual_bank_name
        FROM businesses b
        LEFT JOIN wallets w ON b.id = w.business_id
        ORDER BY b.created_at DESC
      `);

      const businesses = result.rows.map((row: any) => ({
        id: row.id,
        email: row.email,
        fullName: row.full_name,
        phoneNumber: row.phone_number,
        kycStatus: row.kyc_status,
        suspended: row.suspended,
        createdAt: row.created_at,
        singleVerificationPrice: parseFloat(row.single_verification_price),
        bulkVerificationSurcharge: parseFloat(row.bulk_verification_surcharge),
        balance: parseFloat(row.balance || 0),
        virtualAccountNo: row.virtual_account_number || null,
        virtualAccountName: row.virtual_account_name || null,
        virtualBankName: row.virtual_bank_name || null
      }));

      return res.status(200).json({ businesses });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Suspend or unsuspend a business account
   */
  suspendBusiness: async (req: AuthenticatedAdminRequest, res: Response, next: NextFunction) => {
    if (!req.admin) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;
    const { suspend } = req.body; // boolean

    if (typeof suspend !== 'boolean') {
      return res.status(400).json({ error: 'InvalidRequest', message: 'suspend must be a boolean.' });
    }

    try {
      const result = await db.query(
        'UPDATE businesses SET suspended = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING email',
        [suspend, id]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'NotFound', message: 'Business not found.' });
      }

      await auditService.log({
        businessId: id,
        userId: req.admin.email,
        action: 'suspend_account',
        resource: `business:${id}`,
        details: `Account suspension toggled. Suspended: ${suspend}`,
        req
      });

      return res.status(200).json({
        message: `Business account has been ${suspend ? 'suspended' : 'unsuspended'} successfully.`
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Manually credit or debit a business's wallet balance
   */
  adjustWallet: async (req: AuthenticatedAdminRequest, res: Response, next: NextFunction) => {
    if (!req.admin) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params; // businessId
    const { amount, description } = req.body; // positive to credit, negative to debit
    const amountVal = parseFloat(amount);

    if (isNaN(amountVal) || amountVal === 0) {
      return res.status(400).json({ error: 'InvalidAmount', message: 'Amount must be a non-zero number.' });
    }

    if (!description || description.trim().length === 0) {
      return res.status(400).json({ error: 'DescriptionRequired', message: 'A reason description is required.' });
    }

    try {
      const walletRes = await db.query('SELECT id, balance FROM wallets WHERE business_id = $1', [id]);
      if (walletRes.rowCount === 0) {
        return res.status(404).json({ error: 'NotFound', message: 'Business wallet not found.' });
      }

      const wallet = walletRes.rows[0];
      const newBalance = parseFloat(wallet.balance) + amountVal;

      if (newBalance < 0) {
        return res.status(400).json({ error: 'InvalidOperation', message: 'Balance cannot be adjusted below zero.' });
      }

      await db.transaction(async (client) => {
        // Adjust balance
        await client.query(
          'UPDATE wallets SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [amountVal, wallet.id]
        );

        // Record audit transaction ledger
        const reference = `ADJ_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
        await client.query(
          `INSERT INTO transactions (wallet_id, type, amount, reference, status, description)
           VALUES ($1, $2, $3, $4, 'completed', $5)`,
          [
            wallet.id,
            amountVal > 0 ? 'credit' : 'debit',
            amountVal,
            reference,
            description,
          ]
        );
      });

      await auditService.log({
        businessId: id,
        userId: req.admin.email,
        action: 'wallet_adjust',
        resource: `wallet:${wallet.id}`,
        details: `Manual wallet balance adjustment: ${amountVal > 0 ? 'credited' : 'debited'} ₦${Math.abs(amountVal)}. Reason: ${description}`,
        req
      });

      return res.status(200).json({
        message: `Wallet balance adjusted successfully by ₦${amountVal.toFixed(2)}.`,
        newBalance
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Upstream Health Monitoring
   * Tracks latency, successful matches, and failed calls
   */
  getHealth: async (req: AuthenticatedAdminRequest, res: Response, next: NextFunction) => {
    try {
      // Aggregate stats over the last 7 days
      const result = await db.query(`
        SELECT 
          COUNT(*) as total_calls,
          SUM(CASE WHEN status = 'success' OR status = 'no_match' THEN 1 ELSE 0 END) as successful_calls,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_calls,
          AVG(CASE WHEN status != 'failed' THEN latency_ms END) as avg_latency_ms
        FROM verifications
        WHERE created_at >= NOW() - INTERVAL '7 days'
      `);

      const stats = result.rows[0];
      const totalCalls = parseInt(stats.total_calls || 0, 10);
      const successCalls = parseInt(stats.successful_calls || 0, 10);
      const successRate = totalCalls > 0 ? (successCalls / totalCalls) * 100 : 100;

      return res.status(200).json({
        health: {
          totalCalls,
          successCalls,
          failedCalls: parseInt(stats.failed_calls || 0, 10),
          successRate: parseFloat(successRate.toFixed(2)),
          avgLatencyMs: Math.round(parseFloat(stats.avg_latency_ms || 0)),
        }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Payment Reconciliation
   * Cross checks PalmPay transactions against actual wallet credits
   */
  getReconciliation: async (req: AuthenticatedAdminRequest, res: Response, next: NextFunction) => {
    try {
      const result = await db.query(`
        SELECT 
          t.id, t.amount, t.reference, t.status, t.description, t.created_at,
          b.full_name as business_name, b.email as business_email
        FROM transactions t
        JOIN wallets w ON t.wallet_id = w.id
        JOIN businesses b ON w.business_id = b.id
        WHERE t.type = 'topup'
        ORDER BY t.created_at DESC
        LIMIT 100
      `);

      const reconciliationList = result.rows.map((row: any) => ({
        id: row.id,
        amount: parseFloat(row.amount),
        reference: row.reference,
        status: row.status,
        description: row.description,
        createdAt: row.created_at,
        businessName: row.business_name,
        businessEmail: row.business_email
      }));

      return res.status(200).json({ transactions: reconciliationList });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Update custom pricing for an individual business customer
   */
  updatePricing: async (req: AuthenticatedAdminRequest, res: Response, next: NextFunction) => {
    if (!req.admin) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params; // businessId
    const { singleVerificationPrice, bulkVerificationSurcharge } = req.body;

    const singlePrice = parseFloat(singleVerificationPrice);
    const surcharge = parseFloat(bulkVerificationSurcharge);

    if (singleVerificationPrice !== undefined && (isNaN(singlePrice) || singlePrice < 0)) {
      return res.status(400).json({ error: 'InvalidPrice', message: 'Single verification price must be a non-negative number.' });
    }

    if (bulkVerificationSurcharge !== undefined && (isNaN(surcharge) || surcharge < 0)) {
      return res.status(400).json({ error: 'InvalidSurcharge', message: 'Bulk surcharge must be a non-negative number.' });
    }

    try {
      const bizRes = await db.query('SELECT full_name FROM businesses WHERE id = $1', [id]);
      if (bizRes.rowCount === 0) {
        return res.status(404).json({ error: 'NotFound', message: 'Business not found.' });
      }

      await db.transaction(async (client) => {
        if (singleVerificationPrice !== undefined) {
          await client.query('UPDATE businesses SET single_verification_price = $1 WHERE id = $2', [singlePrice, id]);
        }
        if (bulkVerificationSurcharge !== undefined) {
          await client.query('UPDATE businesses SET bulk_verification_surcharge = $1 WHERE id = $2', [surcharge, id]);
        }
      });

      await auditService.log({
        businessId: id,
        userId: req.admin.email,
        action: 'update_pricing',
        resource: `business:${id}`,
        details: `Updated custom pricing configuration: single verification price = ₦${singleVerificationPrice !== undefined ? singlePrice.toFixed(2) : 'unchanged'}, bulk surcharge = ₦${bulkVerificationSurcharge !== undefined ? surcharge.toFixed(2) : 'unchanged'}.`,
        req
      });

      return res.status(200).json({
        message: 'Business custom pricing updated successfully.'
      });
    } catch (error) {
      next(error);
    }
  }
};
