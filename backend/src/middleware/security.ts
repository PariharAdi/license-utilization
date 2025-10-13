import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { ApiResponse } from '../types';

// Security middleware
export const securityMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Remove sensitive headers
  res.removeHeader('X-Powered-By');

  // Set security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Trust proxy for IP logging
  req.app.set('trust proxy', 1);

  next();
};

// Request sanitization middleware
export const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
  // Sanitize query parameters
  if (req.query) {
    for (const [key, value] of Object.entries(req.query)) {
      if (typeof value === 'string') {
        // Remove potential XSS characters
        req.query[key] = value.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      }
    }
  }

  // Sanitize request body
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body);
  }

  next();
};

// Recursive object sanitization
function sanitizeObject(obj: any): void {
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      obj[key] = value.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    } else if (typeof value === 'object' && value !== null) {
      sanitizeObject(value);
    }
  }
}

// CSRF protection middleware
export const csrfProtection = (req: Request, res: Response, next: NextFunction): void => {
  // Skip CSRF for GET requests and authentication endpoints
  if (req.method === 'GET' || req.path.includes('/auth/')) {
    return next();
  }

  // Check for CSRF token in headers
  const token = req.headers['x-csrf-token'] as string;
  const sessionToken = req.session?.csrfToken;

  if (!token || !sessionToken || token !== sessionToken) {
    const response: ApiResponse = {
      success: false,
      error: 'Invalid CSRF token',
    };
    res.status(403).json(response);
    return;
  }

  next();
};

// Generate CSRF token for session
export const generateCSRFToken = (req: Request): string => {
  const token = crypto.randomBytes(32).toString('hex');
  if (req.session) {
    req.session.csrfToken = token;
  }
  return token;
};

// IP whitelist middleware (for admin operations)
export const ipWhitelist = (allowedIPs: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const clientIP = req.ip || req.connection.remoteAddress || '';

    // In development, allow localhost
    if (process.env.NODE_ENV === 'development' &&
      (clientIP.includes('127.0.0.1') || clientIP.includes('::1'))) {
      return next();
    }

    if (!allowedIPs.includes(clientIP)) {
      const response: ApiResponse = {
        success: false,
        error: 'Access denied from this IP address',
      };
      res.status(403).json(response);
      return;
    }

    next();
  };
};

// Request size limiter
export const requestSizeLimiter = (maxSizeInMB: number) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;

    if (contentLength > maxSizeInBytes) {
      const response: ApiResponse = {
        success: false,
        error: `Request too large. Maximum size allowed: ${maxSizeInMB}MB`,
      };
      res.status(413).json(response);
      return;
    }

    next();
  };
};

// Request timeout middleware
export const requestTimeout = (timeoutMs: number) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        const response: ApiResponse = {
          success: false,
          error: 'Request timeout',
        };
        res.status(408).json(response);
      }
    }, timeoutMs);

    res.on('finish', () => {
      clearTimeout(timeout);
    });

    next();
  };
};

// API key validation (for external integrations)
export const validateApiKey = (req: Request, res: Response, next: NextFunction): void => {
  const apiKey = req.headers['x-api-key'] as string;
  const validApiKeys = process.env.VALID_API_KEYS?.split(',') || [];

  if (!apiKey || !validApiKeys.includes(apiKey)) {
    const response: ApiResponse = {
      success: false,
      error: 'Invalid or missing API key',
    };
    res.status(401).json(response);
    return;
  }

  next();
};