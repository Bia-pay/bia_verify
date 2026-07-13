import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { db } from '../db';
import { paymentProvider } from '../services/paymentProvider';
import { auditService } from '../services/audit';
import { decrypt } from '../services/crypto';
import { config } from '../config';

export const walletController = {
  /**
   * Initiate a wallet topup via PalmPay.
   */
  initializeTopup: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.business) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { amount } = req.body;
    const amountVal = parseFloat(amount);

    if (isNaN(amountVal) || amountVal <= 0) {
      return res.status(400).json({ error: 'InvalidAmount', message: 'Amount must be a positive number.' });
    }

    const businessId = req.business.id;
    const businessEmail = req.business.email;
    const businessName = req.business.fullName;

    try {
      // Fetch wallet ID
      const walletRes = await db.query('SELECT id FROM wallets WHERE business_id = $1', [businessId]);
      if (walletRes.rowCount === 0) {
        return res.status(404).json({ error: 'NotFound', message: 'Wallet not found for business.' });
      }
      const walletId = walletRes.rows[0].id;

      // Unique reference for tracking payment: e.g. PP_REF_<timestamp>_<random>
      const reference = `PP_REF_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

      // Insert pending transaction record
      await db.query(
        `INSERT INTO transactions (wallet_id, type, amount, reference, status, description)
         VALUES ($1, 'topup', $2, $3, 'pending', $4)`,
        [walletId, amountVal, reference, `PalmPay wallet top-up of ₦${amountVal.toFixed(2)}`]
      );

      // Call payment provider to get checkout URL
      const { paymentUrl, orderId } = await paymentProvider.initializePayment({
        amount: amountVal,
        reference,
        email: businessEmail,
        fullName: businessName
      });

      // Log initialization
      await auditService.log({
        businessId,
        userId: businessEmail,
        action: 'wallet_topup',
        resource: `transaction:${reference}`,
        details: `Topup of ₦${amountVal} initialized. PalmPay Order ID: ${orderId}`,
        req
      });

      return res.status(200).json({
        message: 'Top-up transaction initialized.',
        paymentUrl,
        reference
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get wallet balance
   */
  getBalance: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.business) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const result = await db.query(
        `SELECT balance, virtual_account_number, virtual_account_name, virtual_bank_name 
         FROM wallets 
         WHERE business_id = $1`,
        [req.business.id]
      );
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'NotFound', message: 'Wallet not found' });
      }

      const wallet = result.rows[0];
      return res.status(200).json({
        balance: parseFloat(wallet.balance),
        virtualAccountNo: wallet.virtual_account_number || null,
        virtualAccountName: wallet.virtual_account_name || null,
        virtualBankName: wallet.virtual_bank_name || null
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get business transaction log
   */
  getTransactions: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.business) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const result = await db.query(
        `SELECT t.id, t.type, t.amount, t.reference, t.status, t.description, t.created_at
         FROM transactions t
         JOIN wallets w ON t.wallet_id = w.id
         WHERE w.business_id = $1
         ORDER BY t.created_at DESC
         LIMIT 100`,
        [req.business.id]
      );

      const formatted = result.rows.map((row: any) => ({
        id: row.id,
        type: row.type,
        amount: parseFloat(row.amount),
        reference: row.reference,
        status: row.status,
        description: row.description,
        createdAt: row.created_at
      }));

      return res.status(200).json({
        transactions: formatted
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PalmPay Webhook Receiver (Post-back payment confirmation)
   * Idempotent & secured via signature check
   */
  palmpayWebhook: async (req: Request, res: Response, next: NextFunction) => {
    const payload = req.body;
    
    // Extracted signature from headers OR request body (sign/Signature)
    const signature = (req.headers['x-palmpay-signature'] || 
                       req.headers['signature'] || 
                       payload.sign || 
                       payload.Signature) as string;

    if (!signature) {
      return res.status(400).json({ error: 'BadRequest', message: 'Missing signature' });
    }

    // Verify webhook authenticity using the raw request body
    const rawBody = (req as any).rawBody || JSON.stringify(payload);
    const isValid = paymentProvider.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      console.warn('[Webhook Warning] Invalid signature detected in PalmPay webhook.');
      return res.status(401).send('Signature validation failed');
    }

    // Check if it's a Virtual Account Notification or Checkout Link Notification
    const isVirtualAccount = !!payload.virtualAccountNo;

    if (isVirtualAccount) {
      const { virtualAccountNo, orderAmount, orderNo, orderStatus, payerAccountName, payerBankName, accountReference } = payload;
      
      // PalmPay VA order amount is sent in cents. Convert to NGN.
      const amountVal = parseFloat(orderAmount) / 100.0;
      
      // Look up wallet matching the virtual account (or business ID in reference)
      try {
        const walletQuery = await db.query(
          `SELECT id, business_id FROM wallets 
           WHERE virtual_account_number = $1 OR business_id::varchar = $2`,
          [virtualAccountNo, accountReference]
        );

        if ((walletQuery.rowCount ?? 0) === 0) {
          console.warn(`[Webhook Anomaly] Wallet not found for VA: ${virtualAccountNo}, ref: ${accountReference}`);
          return res.status(404).send('Wallet not found');
        }

        const wallet = walletQuery.rows[0];

        // Idempotency Check: Reference prefix for VA topups
        const reference = `VA_PP_${orderNo}`;

        const updated = await db.transaction(async (client) => {
          const transQuery = await client.query(
            'SELECT id, status FROM transactions WHERE reference = $1 FOR UPDATE',
            [reference]
          );

          if (transQuery.rowCount && transQuery.rowCount > 0) {
            const trans = transQuery.rows[0];
            if (trans.status === 'completed' || trans.status === 'failed') {
              console.log(`[Webhook Idempotency] VA Webhook ${reference} already processed.`);
              return false;
            }
          }

          // orderStatus is 1 (SUCCESS) or 2 (FAILED) depending on NIBSS response. 
          // Treat 1 or SUCCESS string as completed topup.
          const isSuccess = orderStatus === 1 || String(orderStatus).toUpperCase() === 'SUCCESS' || orderStatus === '1';

          if (isSuccess) {
            if ((transQuery.rowCount ?? 0) === 0) {
              // Create transaction record
              await client.query(
                `INSERT INTO transactions (wallet_id, type, amount, reference, status, description)
                 VALUES ($1, 'topup', $2, $3, 'completed', $4)`,
                [
                  wallet.id, 
                  amountVal, 
                  reference, 
                  `PalmPay VA transfer from ${payerAccountName || 'Customer'} (${payerBankName || 'Bank'})`
                ]
              );
            } else {
              // Update existing transaction
              await client.query(
                `UPDATE transactions 
                 SET status = 'completed', description = $1, created_at = CURRENT_TIMESTAMP
                 WHERE reference = $2`,
                [`PalmPay VA transfer from ${payerAccountName || 'Customer'} (${payerBankName || 'Bank'})`, reference]
              );
            }

            // Credit wallet balance
            await client.query(
              `UPDATE wallets 
               SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP
               WHERE id = $2`,
              [amountVal, wallet.id]
            );

            return true;
          } else {
            // Failed transfer order
            if ((transQuery.rowCount ?? 0) === 0) {
              await client.query(
                `INSERT INTO transactions (wallet_id, type, amount, reference, status, description)
                 VALUES ($1, 'topup', $2, $3, 'failed', $4)`,
                [
                  wallet.id, 
                  amountVal, 
                  reference, 
                  `PalmPay VA transfer failed (${payerBankName || 'Bank'})`
                ]
              );
            } else {
              await client.query(
                `UPDATE transactions 
                 SET status = 'failed', description = $1, created_at = CURRENT_TIMESTAMP
                 WHERE reference = $2`,
                [`PalmPay VA transfer failed (${payerBankName || 'Bank'})`, reference]
              );
            }
            return true;
          }
        });

        if (updated) {
          console.log(`[Webhook Success] PalmPay VA transaction ${reference} processed. Amount: ₦${amountVal}`);
        }

        // Return plain text 'success' as expected by PalmPay VA documentation
        return res.status(200).send('success');
      } catch (err: any) {
        console.error('[Webhook Error] Processing PalmPay VA webhook failed:', err.message);
        return res.status(500).send('error');
      }
    } else {
      // Normal Checkout Link Notification
      const { merchantRef, status, palmpayRef, amount } = payload;
      const paymentAmount = parseFloat(amount);

      try {
        const updated = await db.transaction(async (client) => {
          const transRes = await client.query(
            'SELECT id, wallet_id, status FROM transactions WHERE reference = $1 FOR UPDATE',
            [merchantRef]
          );

          if (transRes.rowCount === 0) {
            throw new Error(`Transaction ref ${merchantRef} not found in database.`);
          }

          const transaction = transRes.rows[0];

          if (transaction.status === 'completed' || transaction.status === 'failed') {
            console.log(`[Webhook Idempotency] Webhook for ${merchantRef} already processed.`);
            return false;
          }

          if (status === 'SUCCESS') {
            await client.query(
              `UPDATE transactions 
               SET status = 'completed', description = $1, created_at = CURRENT_TIMESTAMP
               WHERE id = $2`,
              [`PalmPay Top-up Completed. Ref: ${palmpayRef}`, transaction.id]
            );

            await client.query(
              `UPDATE wallets 
               SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP
               WHERE id = $2`,
              [paymentAmount, transaction.wallet_id]
            );

            return true;
          } else {
            await client.query(
              `UPDATE transactions 
               SET status = 'failed', description = $1, created_at = CURRENT_TIMESTAMP
               WHERE id = $2`,
              [`PalmPay Top-up Failed. Ref: ${palmpayRef}`, transaction.id]
            );
            return true;
          }
        });

        if (updated) {
          console.log(`[Webhook Success] PalmPay checkout transaction ${merchantRef} processed successfully.`);
        }

        return res.status(200).json({ status: 'ACCEPTED' });
      } catch (error: any) {
        console.error('[Webhook Error] Processing PalmPay checkout webhook failed:', error.message);
        return res.status(500).json({ error: 'Internal Error', message: error.message });
      }
    }
  },

  /**
   * Manually generate/provision a PalmPay Virtual Account for an approved business user on-demand.
   */
  generateVirtualAccount: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.business) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const businessId = req.business.id;

    try {
      // 1. Check if business is approved
      const bizQuery = await db.query(
        'SELECT kyc_status, full_name FROM businesses WHERE id = $1',
        [businessId]
      );

      if (bizQuery.rowCount === 0) {
        return res.status(404).json({ error: 'NotFound', message: 'Business account not found.' });
      }

      const business = bizQuery.rows[0];
      if (business.kyc_status !== 'approved') {
        return res.status(400).json({ 
          error: 'KycNotApproved', 
          message: 'Your business KYC must be approved by an administrator before generating a virtual account.' 
        });
      }

      // 2. Check if account already exists
      const walletQuery = await db.query(
        'SELECT virtual_account_number FROM wallets WHERE business_id = $1',
        [businessId]
      );

      if (walletQuery.rowCount > 0 && walletQuery.rows[0].virtual_account_number) {
        return res.status(400).json({ 
          error: 'AccountAlreadyExists', 
          message: 'A virtual account has already been generated for your business.' 
        });
      }

      // 3. Fetch KYC details
      const kycQuery = await db.query(
        `SELECT business_name, business_email, cac_number 
         FROM business_kycs 
         WHERE business_id = $1`,
        [businessId]
      );

      if (kycQuery.rowCount === 0) {
        return res.status(400).json({ 
          error: 'KycDataMissing', 
          message: 'No KYC submission details found. Please submit your documents first.' 
        });
      }

      const kycDetails = kycQuery.rows[0];

      // Use platform BVN for VA provisioning — no per-business BVN required
      // 4. Provision PalmPay Virtual Account using platform BVN
      console.log(`[VA Generation] Provisioning PalmPay VA for business ${businessId}...`);
      const vaResult = await paymentProvider.createVirtualAccount({
        virtualAccountName: kycDetails.business_name,
        identityType: 'company',
        licenseNumber: kycDetails.cac_number,
        customerName: kycDetails.business_name,
        email: kycDetails.business_email,
        accountReference: businessId,
        bvn: config.platformBvn,  // Platform BVN — centralized for all businesses
      });

      // Save to database
      await db.query(
        `UPDATE wallets 
         SET virtual_account_number = $1, virtual_account_name = $2, virtual_bank_name = $3, updated_at = CURRENT_TIMESTAMP
         WHERE business_id = $4`,
        [vaResult.virtualAccountNo, vaResult.virtualAccountName, vaResult.bankName, businessId]
      );

      // Log business audit trail
      await auditService.log({
        businessId,
        userId: req.business.email,
        action: 'generate_va',
        resource: `wallet:${businessId}`,
        details: `Manually generated PalmPay Virtual Account: ${vaResult.virtualAccountNo} (${vaResult.bankName})`,
        req
      });

      return res.status(200).json({
        message: 'Virtual account generated successfully.',
        virtualAccountNo: vaResult.virtualAccountNo,
        virtualAccountName: vaResult.virtualAccountName,
        virtualBankName: vaResult.bankName
      });
    } catch (err: any) {
      console.error('[On-Demand VA Generation Failed]:', err.message);
      next(err);
    }
  }
};
