import { db } from './index';
import bcrypt from 'bcrypt';

const schema = `
-- Drop tables if they exist (for complete reset during setup, but in production we run migrations)
-- We will write IF NOT EXISTS to preserve existing data on restart.

CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  phone_number VARCHAR(50) NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  email_verification_token VARCHAR(255),
  kyc_status VARCHAR(50) DEFAULT 'none',
  kyc_rejection_reason TEXT,
  api_key_hash VARCHAR(255) UNIQUE,
  suspended BOOLEAN DEFAULT FALSE,
  single_verification_price NUMERIC(10, 2) NOT NULL DEFAULT 70.00,
  bulk_verification_surcharge NUMERIC(10, 2) NOT NULL DEFAULT 15.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS business_kycs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID UNIQUE REFERENCES businesses(id) ON DELETE CASCADE,
  business_name VARCHAR(255) NOT NULL,
  business_email VARCHAR(255) NOT NULL,
  business_phone VARCHAR(50) NOT NULL,
  business_address TEXT NOT NULL,
  cac_number VARCHAR(100) NOT NULL,
  cac_document_key VARCHAR(500) NOT NULL,
  ndpc_number VARCHAR(100) NOT NULL,
  ndpc_document_key VARCHAR(500) NOT NULL,
  company_photo_key VARCHAR(500) NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewer_note TEXT
);

CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID UNIQUE REFERENCES businesses(id) ON DELETE CASCADE,
  balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  reference VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  nin_encrypted VARCHAR(500) NOT NULL,
  first_name_encrypted VARCHAR(500),
  last_name_encrypted VARCHAR(500),
  status VARCHAR(50) NOT NULL,
  cost_charged NUMERIC(10, 2) NOT NULL DEFAULT 60.00,
  upstream_cost NUMERIC(10, 2) NOT NULL DEFAULT 36.05,
  platform_margin NUMERIC(10, 2) NOT NULL DEFAULT 23.95,
  upstream_response_encrypted TEXT,
  latency_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  user_id VARCHAR(255) NOT NULL,
  action VARCHAR(100) NOT NULL,
  resource VARCHAR(255) NOT NULL,
  details TEXT,
  ip_address VARCHAR(45),
  user_agent VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS phone_otp_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(50) NOT NULL,
  otp_code VARCHAR(10) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
`;

async function init() {
  console.log('Initializing database schema...');
  try {
    // 1. Create tables
    await db.query(schema);
    
    // 2. Alter tables for Virtual Account support
    await db.query(`
      ALTER TABLE business_kycs ADD COLUMN IF NOT EXISTS bvn_encrypted VARCHAR(500);
      ALTER TABLE wallets ADD COLUMN IF NOT EXISTS virtual_account_number VARCHAR(100);
      ALTER TABLE wallets ADD COLUMN IF NOT EXISTS virtual_account_name VARCHAR(255);
      ALTER TABLE wallets ADD COLUMN IF NOT EXISTS virtual_bank_name VARCHAR(100) DEFAULT 'PalmPay';
      ALTER TABLE businesses ADD COLUMN IF NOT EXISTS single_verification_price NUMERIC(10, 2) NOT NULL DEFAULT 70.00;
      ALTER TABLE businesses ADD COLUMN IF NOT EXISTS bulk_verification_surcharge NUMERIC(10, 2) NOT NULL DEFAULT 15.00;
    `);
    console.log('Tables created or already exist, and virtual account columns verified.');

    // 2. Seed default admin if no admin exists
    const adminCheck = await db.query('SELECT COUNT(*) FROM admins');
    const adminCount = parseInt((adminCheck.rows[0] as any).count, 10);

    if (adminCount === 0) {
      console.log('No administrator found. Seeding default admin account...');
      const adminEmail = 'admin@biaverify.com';
      const adminPassword = 'adminpassword123';
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      const adminName = 'Bia Verify Admin';

      await db.query(
        'INSERT INTO admins (email, password_hash, full_name) VALUES ($1, $2, $3)',
        [adminEmail, passwordHash, adminName]
      );
      console.log('----------------------------------------------------');
      console.log(`Admin account created!`);
      console.log(`Email: ${adminEmail}`);
      console.log(`Password: ${adminPassword}`);
      console.log('----------------------------------------------------');
    } else {
      console.log('Administrator account already exists. Skipping seed.');
    }
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  } finally {
    await db.close();
    console.log('Database connection closed.');
  }
}

// Execute if run directly
if (require.main === module) {
  init();
}
export { init };
