import { db } from '../db';
import { Request } from 'express';

export interface AuditLogOptions {
  businessId?: string | null;
  userId: string;
  action: 'register' | 'email_verify' | 'kyc_submit' | 'kyc_review' | 'verify_nin' | 'api_key_rotate' | 'wallet_topup' | 'wallet_adjust' | 'suspend_account' | 'pii_access' | 'generate_va' | 'update_pricing' | 'password_reset';
  resource: string;
  details: string;
  req?: Request;
}

export const auditService = {
  /**
   * Log an audit trail entry for data compliance.
   */
  log: async (options: AuditLogOptions): Promise<void> => {
    try {
      const ipAddress = options.req ? (options.req.ip || options.req.socket.remoteAddress || '') : 'system';
      const userAgent = options.req ? (options.req.headers['user-agent'] || '') : 'system';

      await db.query(
        `INSERT INTO audit_logs (business_id, user_id, action, resource, details, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          options.businessId || null,
          options.userId,
          options.action,
          options.resource,
          options.details,
          ipAddress,
          userAgent,
        ]
      );
    } catch (error) {
      // In production, log to console but do not crash the request
      console.error('[Audit Service Error] Failed to write audit log:', error);
    }
  }
};
