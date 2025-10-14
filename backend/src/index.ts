import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
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
const PORT = process.env.PORT || 3001;

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

// allow comma-separated origins via env var, fallback to local dev origin
const allowedOrigins = (process.env.FRONTEND_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map(s => s.trim());

app.use(
  cors({
    origin: allowedOrigins,   // accepts string or array
    credentials: true,        // Allow cookies / auth credentials
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// preflight for all routes
app.options('*', cors({ origin: allowedOrigins, credentials: true }));

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