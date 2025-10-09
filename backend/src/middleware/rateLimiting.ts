import rateLimit from 'express-rate-limit';
import { redis } from '../config/database';

// Create Redis store for rate limiting
class RedisStore {
  private prefix: string;

  constructor(prefix = 'rl:') {
    this.prefix = prefix;
  }

  async incr(key: string): Promise<number> {
    const fullKey = `${this.prefix}${key}`;
    return await redis.incr(fullKey);
  }

  async expire(key: string, seconds: number): Promise<void> {
    const fullKey = `${this.prefix}${key}`;
    await redis.expire(fullKey, seconds);
  }

  async get(key: string): Promise<number | null> {
    const fullKey = `${this.prefix}${key}`;
    const value = await redis.get(fullKey);
    return value ? parseInt(value) : null;
  }

  async reset(key: string): Promise<void> {
    const fullKey = `${this.prefix}${key}`;
    await redis.del(fullKey);
  }
}

const redisStore = new RedisStore();

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    success: false,
    error: 'Too many requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: {
    incr: async (key) => {
      const count = await redisStore.incr(key);
      if (count === 1) {
        await redisStore.expire(key, 15 * 60); // 15 minutes
      }
      return { totalHits: count };
    },
    decrement: async (key) => {
      const count = await redisStore.get(key);
      return { totalHits: Math.max(0, (count || 0) - 1) };
    },
    resetKey: async (key) => {
      await redisStore.reset(key);
    },
  },
});

// Authentication rate limiter (stricter)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  message: {
    success: false,
    error: 'Too many authentication attempts. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Export rate limiter (more lenient but with longer window)
export const exportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 exports per hour
  message: {
    success: false,
    error: 'Export limit exceeded. Please wait before requesting another export.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Data sync rate limiter (very restrictive)
export const syncLimiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutes
  max: 5, // 5 sync operations per window
  message: {
    success: false,
    error: 'Data sync limit exceeded. Please wait before triggering another sync.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Per-user rate limiter
export const createUserLimiter = (maxRequests: number, windowMs: number) => {
  return rateLimit({
    windowMs,
    max: maxRequests,
    keyGenerator: (req) => {
      // Use user ID if authenticated, otherwise fall back to IP
      const user = (req as any).user;
      return user ? `user:${user.id}` : req.ip;
    },
    message: {
      success: false,
      error: 'Request limit exceeded for your account. Please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};