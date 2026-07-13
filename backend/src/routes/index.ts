import { Router } from 'express';
import { authController } from '../controllers/auth';
import { businessController } from '../controllers/business';
import { kycController } from '../controllers/kyc';
import { walletController } from '../controllers/wallet';
import { verifyController } from '../controllers/verify';
import { adminController } from '../controllers/admin';

import { verifySession, verifyApiKey, verifyEitherSession } from '../middleware/authMiddleware';
import { verifyAdminSession } from '../middleware/adminAuthMiddleware';
import { apiRateLimiter } from '../middleware/rateLimiter';
import { upload } from '../middleware/uploadMiddleware';

const router = Router();

// ==========================================
// 1. PUBLIC AUTH & MOCK GATEWAYS
// ==========================================
router.post('/auth/register', authController.register);
router.get('/auth/verify-email', authController.verifyEmail);
router.post('/auth/login', authController.login);
router.post('/auth/admin/login', authController.adminLogin);
router.post('/auth/send-phone-otp', authController.sendPhoneOtp);
router.post('/auth/verify-phone-otp', authController.verifyPhoneOtp);
router.post('/auth/forgot-password', authController.forgotPassword);
router.post('/auth/reset-password', authController.resetPassword);

// ==========================================
// 2. BUSINESS SESSION AUTH (DASHBOARD)
// ==========================================
router.get('/auth/me', verifySession, authController.getMe);
router.post('/auth/change-password', verifySession, authController.changePassword);
router.delete('/auth/delete-account', verifySession, authController.deleteAccount);

// API Key management
router.get('/business/api-key', verifySession, businessController.getApiKeyStatus);
router.post('/business/api-key/rotate', verifySession, businessController.rotateApiKey);
router.get('/business/usage', verifySession, businessController.getUsageHistory);
router.post('/business/verify', verifySession, verifyController.verifySingle);

// KYC
router.post(
  '/kyc/submit',
  verifySession,
  upload.fields([
    { name: 'cacDocument', maxCount: 1 },
    { name: 'ndpcDocument', maxCount: 1 },
    { name: 'companyPhoto', maxCount: 1 }
  ]),
  kycController.submitKyc
);
router.get('/kyc/status', verifySession, kycController.getKycStatus);

// Wallet Operations
router.post('/wallet/topup', verifySession, walletController.initializeTopup);
router.get('/wallet/balance', verifySession, walletController.getBalance);
router.get('/wallet/transactions', verifySession, walletController.getTransactions);
router.post('/wallet/generate-virtual-account', verifySession, walletController.generateVirtualAccount);

// ==========================================
// 3. PRIVATE SECURE FILE ACCESS (ADMIN OR OWNER)
// ==========================================
// We do not apply verifySession directly because verifyAdminSession or verifySession could access it
router.get('/kyc/files/:key', verifyEitherSession, kycController.secureFileStream);

// ==========================================
// 4. VERIFICATION API KEYS (DEVELOPERS)
// ==========================================
router.post('/verify', verifyApiKey, apiRateLimiter, verifyController.verifySingle);
router.post('/verify/batch', verifyApiKey, apiRateLimiter, verifyController.verifyBatch);

// ==========================================
// 5. PALMPAY WEBHOOKS
// ==========================================
router.post('/webhooks/palmpay', walletController.palmpayWebhook);

// ==========================================
// 6. ADMIN DASHBOARD OPERATIONS (ADMIN PORTAL)
// ==========================================
router.get('/auth/admin/me', verifyAdminSession, authController.getAdminMe);
router.get('/admin/revenue', verifyAdminSession, adminController.getRevenue);
router.get('/admin/live-feed', verifyAdminSession, adminController.getLiveFeed);
router.get('/admin/kyc/queue', verifyAdminSession, adminController.getKycQueue);
router.post('/admin/kyc/review', verifyAdminSession, adminController.reviewKyc);
router.get('/admin/businesses', verifyAdminSession, adminController.getBusinesses);
router.post('/admin/businesses/:id/suspend', verifyAdminSession, adminController.suspendBusiness);
router.post('/admin/businesses/:id/pricing', verifyAdminSession, adminController.updatePricing);
router.post('/admin/businesses/:id/wallet', verifyAdminSession, adminController.adjustWallet);
router.get('/admin/health', verifyAdminSession, adminController.getHealth);
router.get('/admin/reconciliation', verifyAdminSession, adminController.getReconciliation);

export default router;
