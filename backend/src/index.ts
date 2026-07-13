import app from './app';
import { config } from './config';
import { db } from './db';
import { redis } from './services/redis';

async function startServer() {
  console.log('Starting Bia Verify Platform Backend...');

  try {
    // 1. Establish Database Connection check
    const dbTest = await db.query('SELECT NOW()');
    console.log(`[Database] PostgreSQL connection successful: ${dbTest.rows[0].now}`);

    // 2. Establish Redis Cache Connection
    await redis.connect();

    // 3. Start Listening
    app.listen(config.port, () => {
      console.log(`----------------------------------------------------`);
      console.log(`  Bia Verify Server successfully started!`);
      console.log(`  Port: ${config.port}`);
      console.log(`  Mode: ${config.nodeEnv}`);
      console.log(`----------------------------------------------------`);
    });
  } catch (error: any) {
    console.error('CRITICAL: Server initialization failed:', error.message);
    process.exit(1);
  }
}

startServer();
