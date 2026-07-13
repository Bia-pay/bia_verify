import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { db } from '../db';
import { verificationProvider } from '../services/verificationProvider';
import { auditService } from '../services/audit';
import { encrypt } from '../services/crypto';

const UPSTREAM_COST = 36.05;

export const verifyController = {
  /**
   * Single NIN Verification
   * Deducts ₦50 first, calls upstream, refunds if provider fails.
   */
  verifySingle: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.business) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { nin } = req.body;
    if (!nin || typeof nin !== 'string' || nin.trim().length === 0) {
      return res.status(400).json({ error: 'InvalidRequest', message: 'NIN is required.' });
    }

    const businessId = req.business.id;
    const businessEmail = req.business.email;

    try {
      const verificationPrice = req.business.singleVerificationPrice || 70.00;
      const platformMargin = Math.max(0, verificationPrice - UPSTREAM_COST);

      // 1. Check wallet balance inside transaction and deduct verification price
      const deductionSuccess = await db.transaction(async (client) => {
        // Query balance and lock row
        const walletRes = await client.query(
          'SELECT id, balance FROM wallets WHERE business_id = $1 FOR UPDATE',
          [businessId]
        );

        if (walletRes.rowCount === 0) {
          throw new Error('WALLET_NOT_FOUND');
        }

        const wallet = walletRes.rows[0];
        const balance = parseFloat(wallet.balance);

        if (balance < verificationPrice) {
          throw new Error('INSUFFICIENT_FUNDS');
        }

        // Deduct balance
        await client.query(
          'UPDATE wallets SET balance = balance - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [verificationPrice, wallet.id]
        );

        // Record debit transaction
        const reference = `DEBIT_NIN_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
        await client.query(
          `INSERT INTO transactions (wallet_id, type, amount, reference, status, description)
           VALUES ($1, 'verification', $2, $3, 'completed', $4)`,
          [wallet.id, -verificationPrice, reference, `Verification charge for NIN lookup`]
        );

        return { walletId: wallet.id, debitRef: reference };
      });

      // 2. Query upstream provider
      let result;
      const startTime = Date.now();
      try {
        result = await verificationProvider.verifyNIN(nin.trim());
      } catch (upstreamError: any) {
        const latencyMs = Date.now() - startTime;
        console.error('[Upstream Failure] Refunding business wallet:', upstreamError);
        
        // 3. Automated refund for upstream errors
        await db.transaction(async (client) => {
          // Re-credit wallet
          await client.query(
            'UPDATE wallets SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP WHERE business_id = $2',
            [verificationPrice, businessId]
          );

          // Record refund transaction
          const refundRef = `REFUND_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
          await client.query(
            `INSERT INTO transactions (wallet_id, type, amount, reference, status, description)
             VALUES ($1, 'refund', $2, $3, 'completed', $4)`,
            [deductionSuccess.walletId, verificationPrice, refundRef, `Refund for failed verification provider call`]
          );

          // Log failed verification log in db
          const encryptedNin = encrypt(nin);
          await client.query(
            `INSERT INTO verifications (business_id, nin_encrypted, status, cost_charged, upstream_cost, platform_margin, upstream_response_encrypted, latency_ms)
             VALUES ($1, $2, 'failed', 0.00, 0.00, 0.00, $3, $4)`,
            [businessId, encryptedNin, encrypt(JSON.stringify({ error: upstreamError.message })), latencyMs]
          );
        });

        return res.status(502).json({
          error: 'ProviderUnavailable',
          message: 'The identity verification provider is temporarily offline. Your balance has been refunded.'
        });
      }

      const latencyMs = Date.now() - startTime;

      // 4. Save verification details encrypted
      const encryptedNin = encrypt(nin);
      const encryptedFirstName = result.firstName ? encrypt(result.firstName) : null;
      const encryptedLastName = result.lastName ? encrypt(result.lastName) : null;
      const encryptedResponse = encrypt(JSON.stringify(result.rawResponse));
      const verificationStatus = result.matched ? 'success' : 'no_match';

      const verificationRecord = await db.query(
        `INSERT INTO verifications (
          business_id, nin_encrypted, first_name_encrypted, last_name_encrypted, 
          status, cost_charged, upstream_cost, platform_margin, upstream_response_encrypted, latency_ms
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
        [
          businessId,
          encryptedNin,
          encryptedFirstName,
          encryptedLastName,
          verificationStatus,
          verificationPrice,
          UPSTREAM_COST,
          platformMargin,
          encryptedResponse,
          latencyMs
        ]
      );

      // 5. Log audit trail for data compliance
      await auditService.log({
        businessId,
        userId: businessEmail,
        action: 'verify_nin',
        resource: `verification:${verificationRecord.rows[0].id}`,
        details: `NIN verification performed. Matched: ${result.matched}.`,
        req
      });

      // 6. Return generic clean white-label response
      if (!result.matched) {
        return res.status(200).json({
          status: 'success',
          matched: false,
          message: 'No matching records found for the provided NIN.'
        });
      }

      return res.status(200).json({
        status: 'success',
        matched: true,
        data: {
          firstName: result.firstName,
          lastName: result.lastName,
          middleName: result.middleName,
          gender: result.gender,
          dateOfBirth: result.dateOfBirth,
          photo: result.photoBase64
        }
      });

    } catch (error: any) {
      if (error.message === 'INSUFFICIENT_FUNDS') {
        return res.status(402).json({
          error: 'InsufficientFunds',
          message: 'Your wallet balance is low. Please top up your wallet with at least ₦50 to verify.'
        });
      }
      if (error.message === 'WALLET_NOT_FOUND') {
        return res.status(404).json({ error: 'WalletNotFound', message: 'Business wallet has not been provisioned.' });
      }
      next(error);
    }
  },

  /**
   * Batch NIN Verification
   * Streams results back in real-time using SSE (Server-Sent Events)
   */
  verifyBatch: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.business) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { records } = req.body; // Array of { nin, firstName, lastName }
    if (!records || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: 'InvalidRequest', message: 'An array of records containing NINs is required.' });
    }

    if (records.length > 500) {
      return res.status(400).json({ error: 'LimitExceeded', message: 'Batch size cannot exceed 500 records per request.' });
    }

    const businessId = req.business.id;
    const businessEmail = req.business.email;
    const batchCount = records.length;
    const singlePrice = req.business.singleVerificationPrice || 70.00;
    const surcharge = req.business.bulkVerificationSurcharge || 15.00;
    const verificationPrice = singlePrice + surcharge; // ₦85.00 by default
    const platformMargin = Math.max(0, verificationPrice - UPSTREAM_COST);
    const totalBatchPrice = batchCount * verificationPrice;

    try {
      // 1. Verify that the business has enough funds for the entire batch first
      const walletRes = await db.query('SELECT id, balance FROM wallets WHERE business_id = $1', [businessId]);
      if (walletRes.rowCount === 0) {
        return res.status(404).json({ error: 'WalletNotFound', message: 'Business wallet has not been provisioned.' });
      }

      const wallet = walletRes.rows[0];
      const balance = parseFloat(wallet.balance);

      if (balance < totalBatchPrice) {
        return res.status(402).json({
          error: 'InsufficientFunds',
          message: `Insufficient funds for batch verification. Required: ₦${totalBatchPrice.toFixed(2)}, Available: ₦${balance.toFixed(2)}.`
        });
      }

      // Initialize SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // Prevent proxy buffering (e.g. Nginx)
      res.flushHeaders();

      // Send initial progress heartbeat
      res.write(`data: ${JSON.stringify({ type: 'start', total: batchCount })}\n\n`);

      // 2. Sliding window worker pool for parallel processing (concurrency = 8)
      const CONCURRENCY = 8;
      let activeIndex = 0;

      async function worker() {
        while (activeIndex < batchCount) {
          const i = activeIndex++;
          if (i >= batchCount) break;

          const record = records[i];
          const rawNin = record?.nin;

          if (!rawNin || typeof rawNin !== 'string' || rawNin.trim().length === 0) {
            res.write(`data: ${JSON.stringify({ 
              type: 'progress', 
              index: i, 
              status: 'failed', 
              error: 'Invalid NIN record input' 
            })}\n\n`);
            continue;
          }

          const nin = rawNin.trim();

          // Deduct pricing per record
          let deduction;
          try {
            deduction = await db.transaction(async (client) => {
              // Lock wallet row
              const lockRes = await client.query('SELECT balance FROM wallets WHERE id = $1 FOR UPDATE', [wallet.id]);
              const currentBal = parseFloat(lockRes.rows[0].balance);
              
              if (currentBal < verificationPrice) {
                throw new Error('INSUFFICIENT_FUNDS');
              }

              // Deduct
              await client.query('UPDATE wallets SET balance = balance - $1 WHERE id = $2', [verificationPrice, wallet.id]);
              
              // Record transaction
              const ref = `DEBIT_BATCH_${Date.now()}_${i}`;
              await client.query(
                `INSERT INTO transactions (wallet_id, type, amount, reference, status, description)
                 VALUES ($1, 'verification', $2, $3, 'completed', $4)`,
                [wallet.id, -verificationPrice, ref, `Batch verification charge, item #${i + 1}`]
              );

              return { ref };
            });
          } catch (walletErr: any) {
            res.write(`data: ${JSON.stringify({ 
              type: 'progress', 
              index: i, 
              status: 'failed', 
              error: 'Insufficient funds remaining in wallet' 
            })}\n\n`);
            continue;
          }

          // Call upstream verify provider
          const startTime = Date.now();
          try {
            const result = await verificationProvider.verifyNIN(nin);
            const latencyMs = Date.now() - startTime;
            
            // Save successful/unmatched verification in database
            const encryptedNin = encrypt(nin);
            const encryptedFirst = result.firstName ? encrypt(result.firstName) : null;
            const encryptedLast = result.lastName ? encrypt(result.lastName) : null;
            const encryptedResponse = encrypt(JSON.stringify(result.rawResponse));
            const vStatus = result.matched ? 'success' : 'no_match';

            const verRes = await db.query(
              `INSERT INTO verifications (
                business_id, nin_encrypted, first_name_encrypted, last_name_encrypted, 
                status, cost_charged, upstream_cost, platform_margin, upstream_response_encrypted, latency_ms
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
              [
                businessId,
                encryptedNin,
                encryptedFirst,
                encryptedLast,
                vStatus,
                verificationPrice,
                UPSTREAM_COST,
                platformMargin,
                encryptedResponse,
                latencyMs
              ]
            );

            // Log PII access
            await auditService.log({
              businessId,
              userId: businessEmail,
              action: 'verify_nin',
              resource: `verification:${verRes.rows[0].id}`,
              details: `Batch verification performed for item #${i + 1}. Matched: ${result.matched}.`,
              req
            });

            // Stream progress back
            res.write(`data: ${JSON.stringify({
              type: 'progress',
              index: i,
              status: 'success',
              matched: result.matched,
              data: result.matched ? {
                firstName: result.firstName,
                lastName: result.lastName,
                middleName: result.middleName,
                gender: result.gender,
                dateOfBirth: result.dateOfBirth
              } : null
            })}\n\n`);

          } catch (upstreamErr: any) {
            console.error('[Upstream Batch Item Failure]:', upstreamErr);
            const latencyMs = Date.now() - startTime;
            // Refund wallet for failed record
            await db.transaction(async (client) => {
              await client.query('UPDATE wallets SET balance = balance + $1 WHERE id = $2', [verificationPrice, wallet.id]);
              const refundRef = `REFUND_BATCH_${Date.now()}_${i}`;
              await client.query(
                `INSERT INTO transactions (wallet_id, type, amount, reference, status, description)
                 VALUES ($1, 'refund', $2, $3, 'completed', $4)`,
                [wallet.id, verificationPrice, refundRef, `Refund for failed batch verification item #${i + 1}`]
              );

              // Log failed verification log
              await client.query(
                `INSERT INTO verifications (business_id, nin_encrypted, status, cost_charged, upstream_cost, platform_margin, upstream_response_encrypted, latency_ms)
                 VALUES ($1, $2, 'failed', 0.00, 0.00, 0.00, $3, $4)`,
                [businessId, encrypt(nin), encrypt(JSON.stringify({ error: upstreamErr.message })), latencyMs]
              );
            });

            res.write(`data: ${JSON.stringify({
              type: 'progress',
              index: i,
              status: 'failed',
              error: 'Upstream provider error. Refunding balance.'
            })}\n\n`);
          }
        }
      }

      // Start workers
      const workers = Array(Math.min(CONCURRENCY, batchCount)).fill(null).map(worker);
      await Promise.all(workers);

      // Send completion message and close stream
      res.write(`data: ${JSON.stringify({ type: 'complete' })}\n\n`);
      res.end();

    } catch (error) {
      next(error);
    }
  }
};
