import winston from 'winston';
import path from 'path';
import fs from 'fs';

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const baseLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({
      filename: process.env.LOG_FILE || 'logs/app.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  ]
});

// Create logs directory if it doesn't exist
const logDir = path.dirname(process.env.LOG_FILE || 'logs/app.log');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Define extended logger interface including backward-compatible helpers
export interface ExtendedLogger extends winston.Logger {
  // Compatible with existing call sites which pass several positional args
  logUserActivity(...args: unknown[]): void;
  logPerformance(message: string, duration?: number): void;
}

// Create exported logger that includes helper methods
const logger: ExtendedLogger = baseLogger as unknown as ExtendedLogger;

logger.logUserActivity = function (...args: unknown[]) {
  // Expected usage in codebase: (userId, organizationId, action, details?, ip?)
  try {
    const [userId, organizationId, actionOrMsg, details, ip] = args;
    const message = typeof actionOrMsg === 'string' ? actionOrMsg : 'user activity';
    const meta: any = {};
    if (userId) meta.userId = userId;
    if (organizationId) meta.organizationId = organizationId;
    if (details) meta.details = details;
    if (ip) meta.ip = ip;
    baseLogger.info(message as string, meta);
  } catch (e) {
    baseLogger.info('user activity', { args });
  }
};

logger.logPerformance = function (message: string, duration?: number) {
  baseLogger.info(message + (duration ? ` (${duration}ms)` : ''));
};

export { logger };