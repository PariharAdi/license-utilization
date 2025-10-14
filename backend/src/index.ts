import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

// Now import and validate Salesforce config
import { validateSalesforceConfig } from './config/salesforce';
import { logger } from './utils/logger';
import { connectDatabase } from './config/database';
import { connectRedis } from './config/redis';

// Import routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import analyticsRoutes from './routes/analytics';
import jobRoutes from './routes/jobs';
import notificationRoutes from './routes/notifications';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimiting';
import { securityMiddleware } from './middleware/security';
import { health } from './controllers/HealthController';

const app = express();

// read allowed origin(s) from env (set this in Render)
const rawOrigins = process.env.FRONTEND_URL || 'http://localhost:5173';
const allowedOrigins = rawOrigins.split(',').map(s => s.trim()).filter(Boolean);

/**
 * CORS options: - when credentials are used (cookies/auth), you must
 * return the exact origin (cannot use wildcard).
 */
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // allow non-browser requests (e.g. curl, server-to-server) that have no origin
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('CORS policy: origin not allowed'), false);
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Add this PORT definition
const PORT: number = Number(process.env.PORT && !isNaN(Number(process.env.PORT)) ? Number(process.env.PORT) : 3001);

// Validate Salesforce configuration
try {
  validateSalesforceConfig();
  logger.info('✅ Salesforce configuration validated');
} catch (error) {
  logger.error('❌ Salesforce configuration error:', error);
  process.exit(1);
}

// Initialize services (optional - won't fail if unavailable)
const initializeServices = async () => {
  try {
    await connectDatabase();
  } catch (error) {
    logger.warn('Database initialization failed, continuing without database', error);
  }

  try {
    await connectRedis();
  } catch (error) {
    logger.warn('Redis initialization failed, continuing without Redis', error);
  }
};

initializeServices();

// Middleware
app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security middleware
app.use(securityMiddleware);

// Rate limiting
app.use('/api/', apiLimiter);

// Health check
app.get('/api/health', health);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/notifications', notificationRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📊 Environment: ${process.env.NODE_ENV}`);
  logger.info(`🌐 Frontend URL: ${process.env.FRONTEND_URL}`);
  logger.info(`🔐 Salesforce configured: ${!!(process.env.SALESFORCE_CLIENT_ID && process.env.SALESFORCE_CLIENT_SECRET)}`);
});

export default app;