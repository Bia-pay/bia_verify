import axios from 'axios';
import crypto from 'crypto';
import { config } from '../config';

export interface UpstreamVerificationResult {
  matched: boolean;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  gender?: string;
  dateOfBirth?: string;
  photoBase64?: string;
  rawResponse: Record<string, any>;
}

export const verificationProvider = {
  /**
   * Performs the verification against the third-party provider.
   * This is the ONLY code that knows the endpoint and API credentials of the upstream.
   */
  verifyNIN: async (nin: string): Promise<UpstreamVerificationResult> => {
    // Check if we are running in mock mode
    const isMock = config.upstream.url.includes('localhost') || 
                   config.upstream.key === 'mock-upstream-api-key' ||
                   !config.upstream.privateKey;

    if (isMock) {
      // Simulate latency
      await new Promise((resolve) => setTimeout(resolve, 800));

      // NIN starting with '999' simulates a provider timeout or critical crash
      if (nin.startsWith('999')) {
        throw new Error('Upstream provider connection timed out');
      }

      // NIN starting with '456' simulates a valid response but no match found
      if (nin.startsWith('456')) {
        return {
          matched: false,
          rawResponse: { respCode: '99120010', respMsg: 'NIN do not exist' }
        };
      }

      // Default: successful mock match
      return {
        matched: true,
        firstName: 'Chidi',
        lastName: 'Okonkwo',
        middleName: 'Emeka',
        gender: 'male',
        dateOfBirth: '1992-04-15',
        photoBase64: 'mock_base64_photo_string_here',
        rawResponse: {
          respCode: '00000000',
          respMsg: 'Successful',
          data: {
            nin,
            firstName: 'Chidi',
            surname: 'Okonkwo',
            middleName: 'Emeka',
            gender: 'Male',
            birthDate: '1992-04-15',
            photo: 'mock_base64_photo_string_here'
          }
        }
      };
    }

    // Real production request: White-label call to EaseID Enhanced NIN Enquiry
    try {
      const payload: Record<string, any> = {
        version: 'V1.1',
        nonceStr: crypto.randomBytes(16).toString('hex'), // Generate 32-char random string
        requestTime: Date.now(),
        nin: nin.trim()
      };

      // 1. Sort parameters alphabetically by key to construct sign string
      const sortedKeys = Object.keys(payload).sort();
      const pairs = sortedKeys.map(k => `${k}=${payload[k]}`);
      const signString = pairs.join('&');

      // 2. MD5 hash of sign string
      const md5Hex = crypto.createHash('md5').update(signString).digest('hex').toUpperCase();

      // 3. Format private key into PEM
      let pemKey = config.upstream.privateKey.trim();
      if (!pemKey.startsWith('-----BEGIN PRIVATE KEY-----')) {
        // Strip out whitespace and wrap in PEM headers
        const formattedKey = pemKey.replace(/\s/g, '');
        pemKey = `-----BEGIN PRIVATE KEY-----\n${formattedKey}\n-----END PRIVATE KEY-----`;
      }

      // 4. RSA sign MD5 hex string using SHA1
      const signer = crypto.createSign('RSA-SHA1');
      signer.update(md5Hex);
      const signature = signer.sign(pemKey, 'base64');

      // 5. Send POST to EaseID open-api
      const response = await axios.post(
        config.upstream.url,
        payload,
        {
          headers: {
            'CountryCode': 'NG',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.upstream.key}`,
            'Signature': signature
          },
          timeout: 12000 // 12 seconds timeout
        }
      );

      const resBody = response.data;
      if (!resBody) {
        throw new Error('Empty response received from verification provider');
      }

      // Check success response code
      if (resBody.respCode === '00000000') {
        const data = resBody.data;
        if (!data) {
          throw new Error('Successful response missing data payload');
        }

        return {
          matched: true,
          firstName: data.firstName || '',
          lastName: data.surname || data.lastName || '',
          middleName: data.middleName || '',
          gender: data.gender || '',
          dateOfBirth: data.birthDate || data.birthdate || data.dob || '',
          photoBase64: data.photo || '',
          rawResponse: resBody
        };
      }

      // Handle "NIN do not exist" as a valid query that resulted in no match
      if (resBody.respCode === '99120010') {
        return {
          matched: false,
          rawResponse: resBody
        };
      }

      // Any other code is a provider failure (insufficient balance, bad parameters, signature errors, etc.)
      throw new Error(`Upstream error code ${resBody.respCode}: ${resBody.respMsg || 'Verification failed'}`);

    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const data = error.response?.data;
        console.error(`[EaseID API Network Error] Status: ${status}, Detail:`, data || error.message);
        throw new Error(`Upstream provider HTTP connection error: Status ${status || 'network_fail'}`);
      }
      
      console.error('[EaseID API Integration Error]:', error.message);
      throw error;
    }
  },

  verifyBVN: async (
    bvn: string,
    firstName: string,
    lastName: string,
    middleName?: string,
    gender?: string,
    birthday?: string,
    phoneNumber?: string
  ): Promise<{ success: boolean; rawResponse: any }> => {
    const isMock = config.upstream.url.includes('localhost') || 
                   config.upstream.key === 'mock-upstream-api-key' ||
                   !config.upstream.privateKey;
    
    if (isMock) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      return {
        success: true,
        rawResponse: {
          respCode: '00000000',
          respMsg: 'Successful',
          data: {
            nameMatchRlt: 'Exactly Match',
            namesMatchPercentage: '100',
            birthdayMatchRlt: 'Exactly Match',
            genderMatchRlt: 'Exactly Match',
            phoneNumberMatchRlt: 'Exactly Match'
          }
        }
      };
    }
    
    try {
      const payload: Record<string, any> = {
        version: 'V1.1',
        nonceStr: crypto.randomBytes(16).toString('hex'),
        requestTime: Date.now(),
        bvn: bvn.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim()
      };
      if (middleName) payload.middleName = middleName.trim();
      if (gender) payload.gender = gender.trim();
      if (birthday) payload.birthday = birthday.trim();
      if (phoneNumber) payload.phoneNumber = phoneNumber.trim();

      // 1. Sort parameters alphabetically by key to construct sign string
      const sortedKeys = Object.keys(payload).sort();
      const pairs = sortedKeys.map(k => `${k}=${payload[k]}`);
      const signString = pairs.join('&');

      // 2. MD5 hash of sign string
      const md5Hex = crypto.createHash('md5').update(signString).digest('hex').toUpperCase();

      // 3. Format private key into PEM
      let pemKey = config.upstream.privateKey.trim();
      if (!pemKey.startsWith('-----BEGIN PRIVATE KEY-----')) {
        const formattedKey = pemKey.replace(/\s/g, '');
        pemKey = `-----BEGIN PRIVATE KEY-----\n${formattedKey}\n-----END PRIVATE KEY-----`;
      }

      // 4. RSA sign MD5 hex string using SHA1
      const signer = crypto.createSign('RSA-SHA1');
      signer.update(md5Hex);
      const signature = signer.sign(pemKey, 'base64');

      // 5. Send POST to EaseID open-api
      // Replace "/nin/inquire" with "/bvn/verify" endpoint
      const bvnUrl = config.upstream.url.replace('/nin/inquire', '/bvn/verify');
      
      const response = await axios.post(
        bvnUrl,
        payload,
        {
          headers: {
            'CountryCode': 'NG',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.upstream.key}`,
            'Signature': signature
          },
          timeout: 12000
        }
      );

      const resBody = response.data;
      if (resBody && resBody.respCode === '00000000') {
        return {
          success: true,
          rawResponse: resBody
        };
      }
      
      return {
        success: false,
        rawResponse: resBody
      };
    } catch (err: any) {
      console.error('[EaseID BVN Verify Exception]:', err.message);
      throw new Error(`EaseID BVN verification failed: ${err.message}`);
    }
  }
};

