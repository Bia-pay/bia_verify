import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';
import { paymentProvider } from './services/paymentProvider';

const app = express();

// Security middlewares
app.use(helmet({
  contentSecurityPolicy: false, // Disable for easier local client interactions and scripts
}));

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://bia.com.ng',
  'https://www.bia.com.ng'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or postman)
    if (!origin) return callback(null, true);
    
    const isAllowed = allowedOrigins.includes(origin) || 
                      origin.endsWith('.bia.com.ng') ||
                      /^http:\/\/localhost:\d+$/.test(origin); // match any localhost port
                      
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(cookieParser());
app.use(express.json({
  verify: (req: any, res, buf) => {
    req.rawBody = buf.toString();
  }
}));
app.use(express.urlencoded({ extended: true }));

// Core API Routes
app.use('/api/v1', routes);

// ========================================================
// DEVELOPMENT SIMULATOR GATEWAYS (SELF-CONTAINED TESTING)
// ========================================================

/**
 * Mock Upstream NIN Verification Provider Page
 * (Only hit when UPSTREAM_VERIFICATION_URL points here)
 */
app.post('/api/mock-upstream', (req, res) => {
  const { nin } = req.body;
  if (!nin) {
    return res.status(400).json({ error: 'NIN required' });
  }

  // Simulate responses based on NIN prefixes
  if (nin.startsWith('999')) {
    return res.status(500).json({ error: 'Internal NIMC Database Crash' });
  }
  
  if (nin.startsWith('456')) {
    return res.status(404).json({ error: 'NIN not found', status: 'NOT_FOUND' });
  }

  return res.status(200).json({
    status: 'FOUND',
    nin,
    first_name: 'Chidi',
    last_name: 'Okonkwo',
    middle_name: 'Emeka',
    gender: 'M',
    dob: '1992-04-15',
    photo: 'mock_base64_photo_string_here'
  });
});

/**
 * PalmPay Sandbox Mock Gateway HTML Screen
 * (Only hit when users click top-up and PalmPay URL points here)
 */
app.get('/api/mock-palmpay-gateway', (req, res) => {
  const { ref, amount } = req.query;

  return res.send(`
    <html>
      <head>
        <title>PalmPay Sandbox Checkout</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: sans-serif;
            background-color: #0b0f19;
            color: #f3f4f6;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
          }
          .card {
            background-color: #111827;
            border: 1px solid #1f2937;
            padding: 2.5rem;
            border-radius: 16px;
            width: 100%;
            max-width: 420px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.7);
            text-align: center;
          }
          .logo {
            font-size: 1.75rem;
            font-weight: bold;
            color: #3b82f6;
            margin-bottom: 0.5rem;
          }
          .title {
            font-size: 1.25rem;
            color: #9ca3af;
            margin-bottom: 1.5rem;
          }
          .detail-box {
            background-color: #1f2937;
            padding: 1rem;
            border-radius: 8px;
            margin-bottom: 2rem;
            text-align: left;
          }
          .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 0.5rem;
            font-size: 0.95rem;
          }
          .amount {
            color: #10b981;
            font-size: 1.25rem;
            font-weight: 700;
          }
          .btn {
            display: block;
            width: 100%;
            padding: 0.85rem;
            border-radius: 8px;
            border: none;
            font-size: 1rem;
            font-weight: bold;
            cursor: pointer;
            margin-bottom: 0.75rem;
            transition: opacity 0.2s;
          }
          .btn-primary {
            background-color: #10b981;
            color: white;
          }
          .btn-danger {
            background-color: #ef4444;
            color: white;
          }
          .btn:hover {
            opacity: 0.9;
          }
          .footer {
            margin-top: 1.5rem;
            font-size: 0.8rem;
            color: #6b7280;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="logo">PalmPay Sandbox</div>
          <div class="title">Bia Verify Wallet Checkout</div>
          
          <div class="detail-box">
            <div class="detail-row">
              <span>Transaction Ref:</span>
              <span style="font-family: monospace;">${ref}</span>
            </div>
            <div class="detail-row" style="margin-top: 0.75rem;">
              <span>Amount:</span>
              <span class="amount">₦${parseFloat(amount as string).toFixed(2)}</span>
            </div>
          </div>

          <button class="btn btn-primary" onclick="simulateCallback('SUCCESS')">Approve Payment (Success)</button>
          <button class="btn btn-danger" onclick="simulateCallback('FAILED')">Reject Payment (Failed)</button>
          
          <div class="footer">Secure Sandbox Session &bull; Bia Verify Integration</div>
        </div>

        <script>
          async function simulateCallback(paymentStatus) {
            const bodyPayload = {
              merchantRef: "${ref}",
              amount: "${amount}",
              status: paymentStatus,
              palmpayRef: "PPMOCK" + Math.floor(Math.random() * 10000000)
            };

            // Calculate expected signature in JS for local testing
            // Using standard key concatenation match
            const signature = "mock-signature";

            try {
              const res = await fetch('/api/v1/webhooks/palmpay', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-palmpay-signature': signature
                },
                body: JSON.stringify(bodyPayload)
              });

              if (res.ok) {
                alert("Sandbox payment callback sent: " + paymentStatus);
                // Redirect user back to business dashboard wallets tab
                window.location.href = "http://localhost:5173/wallet";
              } else {
                alert("Error sending callback. Verify server is running.");
              }
            } catch (err) {
              alert("Network error calling back server.");
            }
          }
        </script>
      </body>
    </html>
  `);
});

// Global Error Handler
app.use(errorHandler);

export default app;
