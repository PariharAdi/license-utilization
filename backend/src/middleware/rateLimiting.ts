import rateLimit from 'express-rate-limit';
import { logger } from '../utils/logger';

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      error: 'Too many requests from this IP, please try again later.',
    });
  },
});

// Keep rateLimiter for backward compatibility
export const rateLimiter = apiLimiter;

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
      // Ensure we always return a string
      return user && user.id ? `user:${user.id}` : req.ip || 'unknown';
    },
    message: {
      success: false,
      error: 'Request limit exceeded for your account. Please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};