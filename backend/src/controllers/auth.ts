import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import axios from 'axios';
import { db } from '../db';
import { config } from '../config';
import { auditService } from '../services/audit';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { AuthenticatedAdminRequest } from '../middleware/adminAuthMiddleware';

// ─── Termii helper ────────────────────────────────────────────────────────────
const TERMII_API_KEY = 'TLxdKLQAQXotyKjVgojFbqDVCbytRKmqYoCrGCdwTgQuCWzGLniVnjEPcUCsqG';
const TERMII_BASE    = 'https://v3.api.termii.com';

/** Normalise any Nigerian phone number to international format (234XXXXXXXXXX) */
function normalisePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('234')) return digits;
  if (digits.startsWith('0'))   return '234' + digits.slice(1);
  return '234' + digits;
}

async function sendTermiiSms(to: string, message: string): Promise<void> {
  await axios.post(`${TERMII_BASE}/api/sms/send`, {
    to,
    from: 'BIA',
    sms: message,
    type: 'plain',
    api_key: TERMII_API_KEY,
    channel: 'generic',
  });
}

export const authController = {
  // ──────────────────────────────────────────────────────────────────────────
  // 1. SEND PHONE OTP (before registration)
  // ──────────────────────────────────────────────────────────────────────────
  sendPhoneOtp: async (req: Request, res: Response, next: NextFunction) => {
    const { phoneNumber } = req.body;
    if (!phoneNumber) {
      return res.status(400).json({ error: 'MissingField', message: 'Phone number is required.' });
    }

    try {
      const e164 = normalisePhone(phoneNumber);
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Invalidate any prior OTPs for this number
      await db.query('DELETE FROM phone_otp_tokens WHERE phone_number = $1', [e164]);

      await db.query(
        'INSERT INTO phone_otp_tokens (phone_number, otp_code, expires_at) VALUES ($1, $2, $3)',
        [e164, otp, expiresAt]
      );

      await sendTermiiSms(
        e164,
        `Your Bia Verify verification code is ${otp}. It expires in 10 minutes. Do not share this code with anyone.`
      );

      return res.status(200).json({ message: 'OTP sent successfully.' });
    } catch (error) {
      next(error);
    }
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 2. VERIFY PHONE OTP (before registration)
  // ──────────────────────────────────────────────────────────────────────────
  verifyPhoneOtp: async (req: Request, res: Response, next: NextFunction) => {
    const { phoneNumber, otp } = req.body;
    if (!phoneNumber || !otp) {
      return res.status(400).json({ error: 'MissingFields', message: 'Phone number and OTP are required.' });
    }

    try {
      const e164 = normalisePhone(phoneNumber);
      const result = await db.query(
        `SELECT id, otp_code, expires_at, verified
         FROM phone_otp_tokens
         WHERE phone_number = $1
         ORDER BY created_at DESC
         LIMIT 1`,
        [e164]
      );

      if (result.rowCount === 0) {
        return res.status(400).json({ error: 'NotFound', message: 'No OTP found for this number. Please request a new one.' });
      }

      const row = result.rows[0];

      if (row.verified) {
        return res.status(400).json({ error: 'AlreadyUsed', message: 'This OTP has already been used.' });
      }

      if (new Date(row.expires_at) < new Date()) {
        return res.status(400).json({ error: 'Expired', message: 'OTP has expired. Please request a new one.' });
      }

      if (row.otp_code !== otp.trim()) {
        return res.status(400).json({ error: 'InvalidOtp', message: 'Incorrect OTP code.' });
      }

      await db.query('UPDATE phone_otp_tokens SET verified = TRUE WHERE id = $1', [row.id]);

      return res.status(200).json({ message: 'Phone number verified successfully.' });
    } catch (error) {
      next(error);
    }
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 3. REGISTER (phone must be OTP-verified first; email auto-verified)
  // ──────────────────────────────────────────────────────────────────────────
  register: async (req: Request, res: Response, next: NextFunction) => {
    const { email, password, fullName, phoneNumber } = req.body;

    if (!email || !password || !fullName || !phoneNumber) {
      return res.status(400).json({ error: 'MissingRequiredFields', message: 'All registration fields are required.' });
    }

    try {
      // Confirm phone was OTP-verified
      const e164 = normalisePhone(phoneNumber);
      const otpCheck = await db.query(
        `SELECT id FROM phone_otp_tokens
         WHERE phone_number = $1 AND verified = TRUE AND expires_at > NOW()
         ORDER BY created_at DESC LIMIT 1`,
        [e164]
      );
      if (otpCheck.rowCount === 0) {
        return res.status(403).json({ error: 'PhoneNotVerified', message: 'Phone number must be verified via OTP before registration.' });
      }

      // Check email uniqueness
      const existing = await db.query('SELECT id FROM businesses WHERE email = $1', [email]);
      if (existing.rowCount > 0) {
        return res.status(409).json({ error: 'Conflict', message: 'Email address already registered.' });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const business = await db.transaction(async (client) => {
        const insertRes = await client.query(
          `INSERT INTO businesses (email, password_hash, full_name, phone_number, email_verified)
           VALUES ($1, $2, $3, $4, TRUE) RETURNING id, email, full_name, phone_number, email_verified, kyc_status`,
          [email, passwordHash, fullName, phoneNumber]
        );
        const newBiz = insertRes.rows[0];

        const secret = crypto.randomBytes(24).toString('hex');
        const plaintextApiKey = `bv_${newBiz.id}_${secret}`;
        const apiKeyHash = await bcrypt.hash(plaintextApiKey, 10);

        await client.query('UPDATE businesses SET api_key_hash = $1 WHERE id = $2', [apiKeyHash, newBiz.id]);
        await client.query('INSERT INTO wallets (business_id, balance) VALUES ($1, 0.00)', [newBiz.id]);

        return { ...newBiz, apiKey: plaintextApiKey };
      });

      await auditService.log({
        businessId: business.id,
        userId: email,
        action: 'register',
        resource: `business:${business.id}`,
        details: 'Business registration completed with phone OTP verification. Email auto-verified.',
        req,
      });

      // Consume the used OTP row
      await db.query('DELETE FROM phone_otp_tokens WHERE phone_number = $1 AND verified = TRUE', [e164]);

      return res.status(201).json({
        message: 'Registration successful. You can now log in.',
        business: {
          id: business.id,
          email: business.email,
          fullName: business.full_name,
          phoneNumber: business.phone_number,
          emailVerified: true,
          kycStatus: business.kyc_status,
        },
        apiKey: business.apiKey, // Shown once
      });
    } catch (error) {
      next(error);
    }
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 4. VERIFY EMAIL (kept for backwards compat, but no longer required)
  // ──────────────────────────────────────────────────────────────────────────
  verifyEmail: async (req: Request, res: Response, next: NextFunction) => {
    const { token } = req.query;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'InvalidRequest', message: 'Verification token is required.' });
    }

    try {
      const result = await db.query(
        'SELECT id, email FROM businesses WHERE email_verification_token = $1',
        [token]
      );

      if (result.rowCount === 0) {
        return res.status(400).json({ error: 'InvalidToken', message: 'Email verification token is invalid or expired.' });
      }

      const business = result.rows[0];
      await db.query(
        'UPDATE businesses SET email_verified = TRUE, email_verification_token = NULL WHERE id = $1',
        [business.id]
      );

      return res.status(200).send(`
        <html><body style="font-family:sans-serif;display:flex;flex-direction:column;justify-content:center;align-items:center;height:100vh;background:#0b0f19;color:#f3f4f6">
          <div style="background:#111827;padding:2.5rem;border-radius:12px;border:1px solid #1f2937;text-align:center;max-width:400px;box-shadow:0 10px 15px -3px rgba(0,0,0,.5)">
            <h2 style="color:#10b981;margin-bottom:1rem">Email Verified!</h2>
            <p style="color:#9ca3af;margin-bottom:2rem;line-height:1.5">Your email has been verified. You can now log in.</p>
            <a href="http://localhost:5173/login" style="background:#3b82f6;color:#fff;padding:.75rem 1.5rem;border-radius:6px;text-decoration:none;font-weight:600">Go to Login</a>
          </div>
        </body></html>
      `);
    } catch (error) {
      next(error);
    }
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 5. LOGIN
  // ──────────────────────────────────────────────────────────────────────────
  login: async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'InvalidRequest', message: 'Email and password are required.' });
    }

    try {
      const result = await db.query(
        'SELECT id, email, password_hash, full_name, email_verified, kyc_status FROM businesses WHERE email = $1',
        [email]
      );

      if (result.rowCount === 0) {
        return res.status(401).json({ error: 'Unauthorized', message: 'Invalid email or password.' });
      }

      const business = result.rows[0];

      if (!business.email_verified) {
        return res.status(403).json({ error: 'EmailNotVerified', message: 'Please verify your email address first.' });
      }

      const isMatch = await bcrypt.compare(password, business.password_hash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Unauthorized', message: 'Invalid email or password.' });
      }

      const token = jwt.sign(
        { id: business.id, email: business.email, fullName: business.full_name },
        config.jwtSecret,
        { expiresIn: '24h' }
      );

      res.cookie('token', token, {
        httpOnly: true,
        secure: config.nodeEnv === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000,
      });

      return res.status(200).json({
        message: 'Login successful',
        token,
        business: {
          id: business.id,
          email: business.email,
          fullName: business.full_name,
          kycStatus: business.kyc_status,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 6. FORGOT PASSWORD — send OTP via Termii SMS to phone number
  // ──────────────────────────────────────────────────────────────────────────
  forgotPassword: async (req: Request, res: Response, next: NextFunction) => {
    const { accountNumber } = req.body;
    if (!accountNumber) {
      return res.status(400).json({ error: 'MissingField', message: 'Account number or phone number is required.' });
    }

    try {
      const cleanInput = accountNumber.replace(/\D/g, '');
      const suffix = cleanInput.slice(-10);

      // Look up by virtual account number OR phone number suffix
      const result = await db.query(
        `SELECT b.id, b.phone_number 
         FROM businesses b 
         LEFT JOIN wallets w ON b.id = w.business_id
         WHERE (w.virtual_account_number = $1 OR RIGHT(REGEXP_REPLACE(b.phone_number, '\\D', '', 'g'), 10) = $2)
         AND b.email_verified = TRUE LIMIT 1`,
        [cleanInput, suffix]
      );

      const biz = result.rows[0];

      if (!biz) {
        return res.status(404).json({ error: 'NotFound', message: 'No active account found with this account number or phone number.' });
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      // Invalidate old tokens
      await db.query('DELETE FROM password_reset_tokens WHERE business_id = $1', [biz.id]);

      await db.query(
        'INSERT INTO password_reset_tokens (business_id, token, expires_at) VALUES ($1, $2, $3)',
        [biz.id, `${token}:${otp}`, expiresAt]
      );

      const e164 = normalisePhone(biz.phone_number);
      await sendTermiiSms(
        e164,
        `Your Bia Verify password reset code is ${otp}. It expires in 15 minutes. Do not share this code with anyone.`
      );

      return res.status(200).json({
        message: `A reset code has been sent via SMS to your registered number ending in ${biz.phone_number.slice(-4)}.`,
        resetToken: token,
      });
    } catch (error) {
      next(error);
    }
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 7. RESET PASSWORD — verify OTP + set new password
  // ──────────────────────────────────────────────────────────────────────────
  resetPassword: async (req: Request, res: Response, next: NextFunction) => {
    const { resetToken, otp, newPassword } = req.body;
    if (!resetToken || !otp || !newPassword) {
      return res.status(400).json({ error: 'MissingFields', message: 'Reset token, OTP, and new password are required.' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'WeakPassword', message: 'New password must be at least 8 characters.' });
    }

    try {
      // Find a matching non-expired, non-used token
      const result = await db.query(
        `SELECT id, business_id, token, expires_at
         FROM password_reset_tokens
         WHERE token LIKE $1 AND used = FALSE AND expires_at > NOW()`,
        [`${resetToken}:%`]
      );

      if (result.rowCount === 0) {
        return res.status(400).json({ error: 'InvalidToken', message: 'Reset token is invalid or expired.' });
      }

      const row = result.rows[0];
      const storedOtp = row.token.split(':')[1];

      if (storedOtp !== otp.trim()) {
        return res.status(400).json({ error: 'InvalidOtp', message: 'Incorrect reset code.' });
      }

      const newHash = await bcrypt.hash(newPassword, 10);

      await db.transaction(async (client) => {
        await client.query('UPDATE businesses SET password_hash = $1 WHERE id = $2', [newHash, row.business_id]);
        await client.query('UPDATE password_reset_tokens SET used = TRUE WHERE id = $1', [row.id]);
      });

      await auditService.log({
        businessId: row.business_id,
        userId: row.business_id,
        action: 'password_reset',
        resource: `business:${row.business_id}`,
        details: 'Password successfully reset via SMS OTP.',
        req,
      });

      return res.status(200).json({ message: 'Password reset successfully. You can now log in.' });
    } catch (error) {
      next(error);
    }
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 8. ADMIN LOGIN
  // ──────────────────────────────────────────────────────────────────────────
  adminLogin: async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'InvalidRequest', message: 'Email and password are required.' });
    }

    try {
      const result = await db.query(
        'SELECT id, email, password_hash, full_name FROM admins WHERE email = $1',
        [email]
      );

      if (result.rowCount === 0) {
        return res.status(401).json({ error: 'Unauthorized', message: 'Invalid admin credentials.' });
      }

      const admin = result.rows[0];
      const isMatch = await bcrypt.compare(password, admin.password_hash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Unauthorized', message: 'Invalid admin credentials.' });
      }

      const token = jwt.sign(
        { id: admin.id, email: admin.email, fullName: admin.full_name },
        config.jwtAdminSecret,
        { expiresIn: '12h' }
      );

      res.cookie('admin_token', token, {
        httpOnly: true,
        secure: config.nodeEnv === 'production',
        sameSite: 'strict',
        maxAge: 12 * 60 * 60 * 1000,
      });

      return res.status(200).json({
        message: 'Admin login successful',
        token,
        admin: { id: admin.id, email: admin.email, fullName: admin.full_name },
      });
    } catch (error) {
      next(error);
    }
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 9. PROFILE GETTERS
  // ──────────────────────────────────────────────────────────────────────────
  getMe: async (req: AuthenticatedRequest, res: Response) => {
    return res.status(200).json({ business: req.business });
  },

  getAdminMe: async (req: AuthenticatedAdminRequest, res: Response) => {
    return res.status(200).json({ admin: req.admin });
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 10. CHANGE PASSWORD (authenticated)
  // ──────────────────────────────────────────────────────────────────────────
  changePassword: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'MissingFields', message: 'Current and new passwords are required.' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'WeakPassword', message: 'New password must be at least 8 characters.' });
    }

    try {
      const result = await db.query('SELECT password_hash FROM businesses WHERE id = $1', [req.business!.id]);
      const { password_hash } = result.rows[0];

      const isMatch = await bcrypt.compare(currentPassword, password_hash);
      if (!isMatch) {
        return res.status(401).json({ error: 'WrongPassword', message: 'Current password is incorrect.' });
      }

      const newHash = await bcrypt.hash(newPassword, 10);
      await db.query('UPDATE businesses SET password_hash = $1 WHERE id = $2', [newHash, req.business!.id]);

      await auditService.log({
        businessId: req.business!.id,
        userId: req.business!.email,
        action: 'password_reset',
        resource: `business:${req.business!.id}`,
        details: 'Password changed by authenticated user.',
        req,
      });

      return res.status(200).json({ message: 'Password changed successfully.' });
    } catch (error) {
      next(error);
    }
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 11. DELETE ACCOUNT (authenticated)
  // ──────────────────────────────────────────────────────────────────────────
  deleteAccount: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: 'MissingField', message: 'Password confirmation is required.' });
    }

    try {
      const result = await db.query('SELECT password_hash FROM businesses WHERE id = $1', [req.business!.id]);
      const { password_hash } = result.rows[0];

      const isMatch = await bcrypt.compare(password, password_hash);
      if (!isMatch) {
        return res.status(401).json({ error: 'WrongPassword', message: 'Password is incorrect. Account not deleted.' });
      }

      // Soft approach: mark deleted; cascade will handle wallet/verifications
      await db.query('DELETE FROM businesses WHERE id = $1', [req.business!.id]);

      return res.status(200).json({ message: 'Account deleted successfully.' });
    } catch (error) {
      next(error);
    }
  },
};
