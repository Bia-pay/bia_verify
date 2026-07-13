# Bia Verify — Secure, White-Label NIN Verification Platform

Bia Verify is a white-label identity verification platform that allows registered business partners to query Nigerian National Identification Numbers (NINs) programmatically via API or directly from a dashboard. The platform features at-rest PII encryption, an automated audit trail for NDPC data compliance, a PalmPay top-up prepaid wallet flow, and a completely separate admin panel for revenues, KYC validation, live feeds, and reconciliation.

---

## Monorepo Directory Structure

- `backend/` — Node.js, Express, TypeScript, PostgreSQL client, and Redis caching.
- `frontend/business-dashboard/` — React app (Vite + TS) for business users (Wallet, Verify, KYC, API Docs).
- `frontend/admin-dashboard/` — React app (Vite + TS) for platform administrators (Revenue, KYC review, Account states, Health).

---

## Technical Specifications & Security

1. **White-Label Isolation**: The upstream NIN provider is entirely abstracted in the service layer (`services/verificationProvider.ts`) and configured via generic environment variables. Upstream error logs, headers, or stack traces are never exposed to clients.
2. **Prepaid Wallet Flow**: Deducts ₦50 from the business wallet balance before querying the provider. Successful matches and unmatched records are valid queries. Provider timeouts or exceptions trigger automatic wallet refunds.
3. **Data Protection & Encryption**:
   - Master PII key: AES-256-GCM. All NIN strings, CAC registration details, first/last names, and raw payloads are encrypted at rest.
   - S3 Storage: All documents (CAC, NDPC, Company Photo) are uploaded to a private bucket. View links are generated dynamically on-demand using time-limited (15-min) secure S3 presigned URLs.
   - Hashed API Keys: API keys are structured as `bv_<businessId>_<randomSecret>`, hashed with bcrypt in the database, and only shown **once** upon creation/rotation.
4. **Payment Webhook Security**: Webhooks from PalmPay are signature-validated using HMAC-SHA256 and processed inside SQL transactions to guarantee absolute idempotency.

---

## Sandbox Testing Rules

To make local integration testing fully self-contained without needing active AWS or payment credentials:
- **Upstream NIN Queries**:
  - NIN starting with `123` returns a **Successful Match**.
  - NIN starting with `456` returns a **No Match Found** response.
  - NIN starting with `999` simulates a **Provider Timeout** (verifies automatic ₦50 wallet refund).
- **PalmPay Wallet Top-Up**:
  - Initiating top-ups from the dashboard redirects you to a local sandbox checkout screen.
  - Clicking "Approve Payment" fires a mock webhook callback carrying a verified developer signature to the server, crediting your wallet balance instantly.

---

## Initial Setup & Booting

### 1. Requirements
Ensure you have the following installed locally:
- Node.js (v18+)
- PostgreSQL Database
- Redis Cache (Optional: the backend automatically falls back to an in-memory client if Redis is not running)

### 2. Configure Environment Variables
Create a `.env` file in the `backend/` directory (you can copy `backend/.env.example` as a template):
```bash
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/biaverify
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-business-session-secret-key
JWT_ADMIN_SECRET=your-admin-session-secret-key
ENCRYPTION_KEY=12345678901234567890123456789012 # Must be exactly 32 characters
PII_RETENTION_DAYS=90
```

### 3. Install Dependencies & Initialize Database
Run these commands to install dependencies, compile TypeScript, and set up your PostgreSQL tables:

```bash
# Set up backend
cd backend
npm install
npm run db:init     # Creates tables and seeds default admin

# Set up business dashboard
cd ../frontend/business-dashboard
npm install

# Set up admin dashboard
cd ../admin-dashboard
npm install
```

### 4. Running the Applications
Start all services in development mode:

```bash
# In backend/
npm run dev         # Server runs on http://localhost:5000

# In frontend/business-dashboard/
npm run dev         # Dashboard runs on http://localhost:5173

# In frontend/admin-dashboard/
npm run dev         # Admin runs on http://localhost:5174
```

### 5. Access Credentials
- **Business Dashboard**: Open `http://localhost:5173`, click **Register** to create an account, check the terminal or copy the click-through verification link to verify your email, and log in.
- **Admin Dashboard**: Open `http://localhost:5174` and log in with the pre-seeded admin credentials:
  - **Email**: `admin@biaverify.com`
  - **Password**: `adminpassword123`
