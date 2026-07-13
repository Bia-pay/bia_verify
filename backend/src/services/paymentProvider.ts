import crypto from 'crypto';
import axios from 'axios';
import { config } from '../config';

export interface PalmPayPaymentRequest {
  amount: number;
  reference: string;
  email: string;
  fullName: string;
}

export interface PalmPayInitResult {
  paymentUrl: string;
  orderId: string;
}

export const paymentProvider = {
  /**
   * Initializes a payment checkout flow with PalmPay.
   */
  initializePayment: async (req: PalmPayPaymentRequest): Promise<PalmPayInitResult> => {
    // If not production URL or merchant keys are mock, fall back to mock sandbox gateway
    const isMock = config.palmpay.apiUrl.includes('localhost') || 
                   config.palmpay.merchantId === 'mock-merchant-id';

    if (isMock) {
      // Simulate API lag
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      // Return local redirect URL representing the PalmPay simulation gateway
      return {
        paymentUrl: `http://localhost:${config.port}/api/mock-palmpay-gateway?ref=${req.reference}&amount=${req.amount}`,
        orderId: `PP-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`
      };
    }

    try {
      // Production payment request payload
      const payload = {
        merchantId: config.palmpay.merchantId,
        appId: config.palmpay.appId,
        orderAmount: req.amount.toFixed(2),
        orderCurrency: 'NGN',
        merchantRef: req.reference,
        productName: 'BiaVerify Wallet Topup',
        customerName: req.fullName,
        customerEmail: req.email,
      };

      // Generate signature (signs with merchant private key if configured)
      const signature = paymentProvider.signRequest(payload);

      const response = await axios.post(`${config.palmpay.apiUrl}/v1/merchant/payments`, {
        ...payload,
        signature
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.palmpay.secretKey}`
        },
        timeout: 10000
      });

      return {
        paymentUrl: response.data.paymentUrl,
        orderId: response.data.orderId || response.data.palmpayRef
      };
    } catch (error: any) {
      console.error('[PalmPay API Error]:', error.response?.data || error.message);
      throw new Error('Failed to initialize payment with PalmPay');
    }
  },

  /**
   * Generates signature for request payloads using RSA (or falls back to HMAC).
   */
  signRequest: (payload: Record<string, any>): string => {
    // 1. Sort parameters alphabetically by key to construct sign string
    const sortedKeys = Object.keys(payload).sort();
    const pairs = sortedKeys.map(k => `${k}=${payload[k]}`);
    const signString = pairs.join('&');

    // 2. MD5 hash of sign string
    const md5Hex = crypto.createHash('md5').update(signString).digest('hex');

    // Get the private key (fallback to upstream private key since it's the same EaseID account)
    const privateKey = (process.env.PALMPAY_MERCHANT_PRIVATE_KEY || config.upstream.privateKey || '').trim();

    if (privateKey) {
      try {
        let pemKey = privateKey;
        if (!pemKey.startsWith('-----BEGIN PRIVATE KEY-----')) {
          const formattedKey = pemKey.replace(/\s/g, '');
          pemKey = `-----BEGIN PRIVATE KEY-----\n${formattedKey}\n-----END PRIVATE KEY-----`;
        }
        // 3. RSA sign MD5 hex string using SHA1 (EaseID standard)
        const signer = crypto.createSign('RSA-SHA1');
        signer.update(md5Hex);
        return signer.sign(pemKey, 'base64');
      } catch (err: any) {
        console.error('[PalmPay RSA Signing Exception]:', err.message);
      }
    }

    // HMAC SHA256 Fallback
    return crypto
      .createHmac('sha256', config.palmpay.secretKey)
      .update(signString)
      .digest('hex');
  },

  /**
   * Verifies the signature of an incoming PalmPay Webhook callback.
   */
  verifyWebhookSignature: (rawBody: string, signature: string): boolean => {
    const isMock = config.palmpay.secretKey === 'mock-palmpay-secret' || !config.palmpay.publicKey;
    
    if (isMock) {
      // Allow sandbox signatures
      if (signature === 'mock-signature') return true;

      // Or match the mock HMAC signature
      const mockSig = crypto
        .createHmac('sha256', config.palmpay.secretKey)
        .update(rawBody)
        .digest('hex');
      return mockSig === signature;
    }

    try {
      // Format public key into PEM format
      let pemKey = config.palmpay.publicKey.trim();
      if (!pemKey.startsWith('-----BEGIN PUBLIC KEY-----')) {
        const formattedKey = pemKey.replace(/\s/g, '');
        pemKey = `-----BEGIN PUBLIC KEY-----\n${formattedKey}\n-----END PUBLIC KEY-----`;
      }

      // Check if rawBody is JSON and contains the 'sign' parameter.
      // If it does, we exclude 'sign', sort fields alphabetically, and join as key=value&...
      let verificationData = rawBody;
      try {
        const parsed = JSON.parse(rawBody);
        if (parsed.sign || parsed.Signature) {
          const excludeKey = parsed.sign ? 'sign' : 'Signature';
          const keys = Object.keys(parsed).filter(k => k !== excludeKey).sort();
          const pairs = keys.map(k => {
            const val = parsed[k];
            // Format arrays or nested objects to string if any, though PalmPay is flat key/value
            return `${k}=${val}`;
          });
          verificationData = pairs.join('&');
        }
      } catch (parseErr) {
        // Fall back to rawBody directly
      }

      // Verify the signature using PalmPay's RSA Public Key
      const verifier = crypto.createVerify('RSA-SHA256');
      verifier.update(verificationData);
      return verifier.verify(pemKey, signature, 'base64');
    } catch (err: any) {
      console.error('[PalmPay Webhook Verification Exception]:', err.message);
      return false;
    }
  },

  createVirtualAccount: async (params: {
    virtualAccountName: string;
    identityType: 'personal' | 'company';
    licenseNumber: string;
    customerName: string;
    email: string;
    accountReference: string;
    bvn: string; // Platform BVN used for all VA provisioning
  }): Promise<{ virtualAccountNo: string; virtualAccountName: string; bankName: string }> => {
    const isMock = config.palmpay.apiUrl.includes('localhost') || 
                   config.palmpay.merchantId === 'mock-merchant-id';

    if (isMock) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      const mockAcctNo = `666${Math.floor(1000000 + Math.random() * 9000000)}`;
      return {
        virtualAccountNo: mockAcctNo,
        virtualAccountName: `${params.virtualAccountName} (BIA)`,
        bankName: 'PalmPay'
      };
    }

    try {
      const payload: Record<string, any> = {
        requestTime: Date.now(),
        version: 'V2.0',
        nonceStr: crypto.randomBytes(16).toString('hex'),
        identityType: params.identityType,
        licenseNumber: params.licenseNumber,
        virtualAccountName: params.virtualAccountName,
        customerName: params.customerName,
        email: params.email,
        accountReference: params.accountReference,
        bvn: params.bvn,           // Platform BVN for identity validation
      };

      const signature = paymentProvider.signRequest(payload);
      const url = `${config.palmpay.apiUrl}/api/v2/virtual/account/label/create`;
      const response = await axios.post(url, payload, {
        headers: {
          'CountryCode': 'NG',
          'Content-Type': 'application/json;charset=UTF-8',
          'Authorization': `Bearer ${config.palmpay.appId}`,
          'Signature': signature
        },
        timeout: 12000
      });

      const resBody = response.data;
      if (resBody.respCode === '00000000' && resBody.data) {
        return {
          virtualAccountNo: resBody.data.virtualAccountNo,
          virtualAccountName: resBody.data.virtualAccountName,
          bankName: 'PalmPay'
        };
      }

      throw new Error(`PalmPay VA error ${resBody.respCode}: ${resBody.respMsg || 'Failed'} | Raw Response: ${JSON.stringify(resBody)}`);
    } catch (err: any) {
      const errMsg = err.response?.data 
        ? (typeof err.response.data === 'object' ? JSON.stringify(err.response.data) : err.response.data)
        : err.message;
      console.error('[PalmPay Create VA Exception]:', errMsg);
      throw new Error(`Failed to create virtual account with PalmPay: ${errMsg}`);
    }
  }
};
