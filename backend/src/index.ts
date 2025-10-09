import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { testDatabaseConnection, testRedisConnection, closeDatabaseConnections } from './config/database';
import { notificationService } from './services/NotificationService';
import { scheduledJobs } from './services/ScheduledJobs';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://login.salesforce.com", "https://*.salesforce.com"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL
    : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.API_RATE_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.API_RATE_LIMIT || '100'), // 100 requests per window
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', limiter);

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-super-secret-session-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 1000 * 60 * 60, // 1 hour
  },
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Health check endpoints (both /health and /api/health for flexibility)
const healthCheckHandler = async (req: express.Request, res: express.Response) => {
  try {
    const dbConnected = await testDatabaseConnection();
    const redisConnected = await testRedisConnection();

    const health = {
      success: true,
      message: 'Salesforce License Utilization API is running',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: dbConnected ? 'connected' : 'disconnected',
        redis: redisConnected ? 'connected' : 'disconnected',
        notifications: 'active',
        jobs: 'running'
      },
      uptime: process.uptime(),
      version: '1.0.0'
    };

    res.status(200).json(health);
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Health check failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
};

app.get('/health', healthCheckHandler);
app.get('/api/health', healthCheckHandler);

// API Routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import analyticsRoutes from './routes/analytics';
import jobRoutes from './routes/jobs';
import notificationRoutes from './routes/notifications';
import reportRoutes from './routes/reports';

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

// Global error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Global error handler:', error);

  res.status(error.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : error.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: error.stack }),
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await scheduledJobs.shutdown();
  await notificationService.shutdown();
  await closeDatabaseConnections();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await scheduledJobs.shutdown();
  await notificationService.shutdown();
  await closeDatabaseConnections();
  process.exit(0);
});

// Start server
const startServer = async () => {
  try {
    // Test database connections
    const dbConnected = await testDatabaseConnection();
    const redisConnected = await testRedisConnection();

    if (!dbConnected) {
      console.warn('⚠️  Starting without PostgreSQL connection');
    }

    if (!redisConnected) {
      console.warn('⚠️  Starting without Redis connection');
    }

    // Initialize notification service
    notificationService.initialize(httpServer);

    // Start scheduled jobs
    scheduledJobs.startAllJobs();

    httpServer.listen(PORT, () => {
      console.log(`
🚀 Salesforce License Utilization API Server Started
📍 Port: ${PORT}
🌍 Environment: ${process.env.NODE_ENV || 'development'}
📊 Health Check: http://localhost:${PORT}/health
🔧 Database: ${dbConnected ? 'Connected' : 'Disconnected'}
⚡ Redis: ${redisConnected ? 'Connected' : 'Disconnected'}
🔔 Notifications: Enabled (WebSocket + Email)
⏰ Scheduled Jobs: Running
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();