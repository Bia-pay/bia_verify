import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authMiddleware';
import { redis } from '../services/redis';

// Default: 60 requests per minute per business API Key
const LIMIT_WINDOW_SECONDS = 60;
const MAX_REQUESTS = parseInt(process.env.API_RATE_LIMIT || '60', 10);

/**
 * Rate limit middleware based on business ID.
 * Expects verifyApiKey middleware to have executed first.
 */
export async function apiRateLimiter(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.business) {
    return res.status(401).json({ error: 'Unauthorized: Authentication required before rate limiting' });
  }

  const businessId = req.business.id;
  const key = `ratelimit:${businessId}`;

  try {
    const currentRequests = await redis.incrWithExpire(key, LIMIT_WINDOW_SECONDS);

    res.setHeader('X-RateLimit-Limit', MAX_REQUESTS);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, MAX_REQUESTS - currentRequests));

    if (currentRequests > MAX_REQUESTS) {
      return res.status(429).json({
        error: 'Too Many Requests',
        message: `API rate limit exceeded. You are allowed up to ${MAX_REQUESTS} requests per minute.`,
      });
    }

    next();
  } catch (error) {
    console.error('[Rate Limiter Error]:', error);
    // Fail-open: continue request processing if cache fails to avoid blocking customer verifications
    next();
  }
}
