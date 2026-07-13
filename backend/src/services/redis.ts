import { createClient } from 'redis';
import { config } from '../config';

let redisClient: ReturnType<typeof createClient> | null = null;
let isConnected = false;

// Custom in-memory fallback for local dev when Redis is not running
const mockStore = new Map<string, { count: number; expiresAt: number }>();

const mockRedisClient = {
  get: async (key: string): Promise<string | null> => {
    const data = mockStore.get(key);
    if (!data) return null;
    if (Date.now() > data.expiresAt) {
      mockStore.delete(key);
      return null;
    }
    return String(data.count);
  },
  set: async (key: string, value: string, options?: { EX?: number }): Promise<string> => {
    const ttl = options?.EX ? options.EX * 1000 : 60000;
    mockStore.set(key, {
      count: parseInt(value, 10),
      expiresAt: Date.now() + ttl,
    });
    return 'OK';
  },
  incr: async (key: string): Promise<number> => {
    const data = mockStore.get(key);
    if (!data || Date.now() > data.expiresAt) {
      mockStore.set(key, { count: 1, expiresAt: Date.now() + 60000 });
      return 1;
    }
    data.count += 1;
    return data.count;
  },
  del: async (key: string): Promise<number> => {
    return mockStore.delete(key) ? 1 : 0;
  },
  quit: async (): Promise<string> => {
    return 'OK';
  }
};

export const redis = {
  connect: async (): Promise<void> => {
    if (config.redisUrl === 'mock' || !config.redisUrl) {
      console.log('[Redis] Configured to use in-memory fallback.');
      return;
    }

    try {
      redisClient = createClient({
        url: config.redisUrl,
        socket: {
          reconnectStrategy: () => {
            // Disable connection retries
            return false;
          }
        }
      });
      
      redisClient.on('error', (err) => {
        if (isConnected) {
          console.warn('[Redis] Connection lost. Using in-memory fallback.', err.message);
        }
        isConnected = false;
      });

      await redisClient.connect();
      isConnected = true;
      console.log('[Redis] Connected successfully to server.');
    } catch (err: any) {
      console.warn('[Redis] Connection failed. Using in-memory fallback.');
      isConnected = false;
      redisClient = null;
    }
  },

  getClient: () => {
    if (isConnected && redisClient) {
      return redisClient;
    }
    return mockRedisClient as any;
  },

  /**
   * Safe wrapper to perform increment with expiration.
   */
  incrWithExpire: async (key: string, expirySeconds: number): Promise<number> => {
    const client = redis.getClient();
    const count = await client.incr(key);
    if (count === 1) {
      await client.set(key, '1', { EX: expirySeconds });
    }
    return count;
  }
};
