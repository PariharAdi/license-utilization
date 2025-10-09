import fs from 'fs';
import path from 'path';

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  meta?: any;
  userId?: string;
  organizationId?: string;
  requestId?: string;
  ip?: string;
}

class Logger {
  private logDir: string;
  private maxFileSize: number = 10 * 1024 * 1024; // 10MB
  private maxFiles: number = 5;

  constructor() {
    this.logDir = path.join(process.cwd(), 'logs');
    this.ensureLogDirectory();
  }

  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private formatLogEntry(entry: LogEntry): string {
    const { timestamp, level, message, meta, userId, organizationId, requestId, ip } = entry;

    const baseLog = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...(userId && { userId }),
      ...(organizationId && { organizationId }),
      ...(requestId && { requestId }),
      ...(ip && { ip }),
      ...(meta && { meta }),
    };

    return JSON.stringify(baseLog) + '\n';
  }

  private writeToFile(filename: string, content: string): void {
    const filePath = path.join(this.logDir, filename);

    // Check file size and rotate if necessary
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      if (stats.size > this.maxFileSize) {
        this.rotateLogFile(filename);
      }
    }

    fs.appendFileSync(filePath, content);
  }

  private rotateLogFile(filename: string): void {
    const baseName = filename.replace('.log', '');

    // Rotate existing files
    for (let i = this.maxFiles - 1; i >= 1; i--) {
      const oldFile = path.join(this.logDir, `${baseName}.${i}.log`);
      const newFile = path.join(this.logDir, `${baseName}.${i + 1}.log`);

      if (fs.existsSync(oldFile)) {
        if (i === this.maxFiles - 1) {
          fs.unlinkSync(oldFile); // Delete oldest file
        } else {
          fs.renameSync(oldFile, newFile);
        }
      }
    }

    // Move current file to .1
    const currentFile = path.join(this.logDir, filename);
    const rotatedFile = path.join(this.logDir, `${baseName}.1.log`);

    if (fs.existsSync(currentFile)) {
      fs.renameSync(currentFile, rotatedFile);
    }
  }

  private log(level: LogEntry['level'], message: string, meta?: any, context?: Partial<LogEntry>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      meta,
      ...context,
    };

    // Console output in development
    if (process.env.NODE_ENV === 'development') {
      const colorMap = {
        info: '\x1b[36m',    // Cyan
        warn: '\x1b[33m',    // Yellow
        error: '\x1b[31m',   // Red
        debug: '\x1b[90m',   // Gray
      };

      const resetColor = '\x1b[0m';
      const color = colorMap[level];

      console.log(`${color}[${entry.timestamp}] ${level.toUpperCase()}: ${message}${resetColor}`);
      if (meta) {
        console.log(`${color}Meta:${resetColor}`, meta);
      }
    }

    // Write to files
    this.writeToFile('application.log', this.formatLogEntry(entry));

    // Write errors to separate file
    if (level === 'error') {
      this.writeToFile('errors.log', this.formatLogEntry(entry));
    }
  }

  info(message: string, meta?: any, context?: Partial<LogEntry>): void {
    this.log('info', message, meta, context);
  }

  warn(message: string, meta?: any, context?: Partial<LogEntry>): void {
    this.log('warn', message, meta, context);
  }

  error(message: string, meta?: any, context?: Partial<LogEntry>): void {
    this.log('error', message, meta, context);
  }

  debug(message: string, meta?: any, context?: Partial<LogEntry>): void {
    if (process.env.NODE_ENV === 'development' || process.env.LOG_LEVEL === 'debug') {
      this.log('debug', message, meta, context);
    }
  }

  // Specialized logging methods
  logUserActivity(userId: string, organizationId: string, activity: string, meta?: any, ip?: string): void {
    this.info(`User activity: ${activity}`, meta, {
      userId,
      organizationId,
      ip,
    });

    // Write to dedicated user activity log
    this.writeToFile('user-activity.log', this.formatLogEntry({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: `User activity: ${activity}`,
      meta,
      userId,
      organizationId,
      ip,
    }));
  }

  logSalesforceAPI(
    userId: string,
    organizationId: string,
    endpoint: string,
    method: string,
    responseTime: number,
    status: number,
    meta?: any
  ): void {
    const message = `Salesforce API: ${method} ${endpoint} - ${status} (${responseTime}ms)`;

    this.info(message, meta, {
      userId,
      organizationId,
    });

    // Write to dedicated API log
    this.writeToFile('salesforce-api.log', this.formatLogEntry({
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      meta: {
        endpoint,
        method,
        responseTime,
        status,
        ...meta,
      },
      userId,
      organizationId,
    }));
  }

  logSecurityEvent(event: string, ip?: string, userId?: string, meta?: any): void {
    this.warn(`Security event: ${event}`, meta, {
      userId,
      ip,
    });

    // Write to dedicated security log
    this.writeToFile('security.log', this.formatLogEntry({
      timestamp: new Date().toISOString(),
      level: 'warn',
      message: `Security event: ${event}`,
      meta,
      userId,
      ip,
    }));
  }

  logPerformance(operation: string, duration: number, meta?: any): void {
    const level = duration > 5000 ? 'warn' : 'info'; // Warn if operation takes more than 5 seconds

    this.log(level, `Performance: ${operation} took ${duration}ms`, meta);

    // Write to dedicated performance log
    this.writeToFile('performance.log', this.formatLogEntry({
      timestamp: new Date().toISOString(),
      level,
      message: `Performance: ${operation} took ${duration}ms`,
      meta: {
        operation,
        duration,
        ...meta,
      },
    }));
  }

  // Log analysis helpers
  async getLogStats(days: number = 7): Promise<any> {
    const logFile = path.join(this.logDir, 'application.log');

    if (!fs.existsSync(logFile)) {
      return { error: 'Log file not found' };
    }

    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const logContent = fs.readFileSync(logFile, 'utf-8');
    const lines = logContent.split('\n').filter(line => line.trim());

    const stats = {
      totalEntries: 0,
      errorCount: 0,
      warnCount: 0,
      infoCount: 0,
      userActivities: 0,
      apiCalls: 0,
      securityEvents: 0,
    };

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        const entryDate = new Date(entry.timestamp);

        if (entryDate >= cutoffDate) {
          stats.totalEntries++;

          switch (entry.level) {
            case 'ERROR':
              stats.errorCount++;
              break;
            case 'WARN':
              stats.warnCount++;
              break;
            case 'INFO':
              stats.infoCount++;
              break;
          }

          if (entry.message.includes('User activity')) {
            stats.userActivities++;
          }

          if (entry.message.includes('Salesforce API')) {
            stats.apiCalls++;
          }

          if (entry.message.includes('Security event')) {
            stats.securityEvents++;
          }
        }
      } catch (error) {
        // Skip malformed log entries
      }
    }

    return stats;
  }
}

export const logger = new Logger();

// Express middleware for request logging
export const requestLogger = (req: any, res: any, next: any): void => {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);

  req.requestId = requestId;

  // Log request
  logger.info(`${req.method} ${req.path}`, {
    method: req.method,
    path: req.path,
    query: req.query,
    userAgent: req.get('User-Agent'),
  }, {
    requestId,
    ip: req.ip,
    userId: req.user?.id,
    organizationId: req.organization?.id,
  });

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;

    logger.info(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`, {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
    }, {
      requestId,
      ip: req.ip,
      userId: req.user?.id,
      organizationId: req.organization?.id,
    });

    // Log slow requests as performance issues
    if (duration > 2000) {
      logger.logPerformance(`${req.method} ${req.path}`, duration, {
        statusCode: res.statusCode,
        requestId,
      });
    }
  });

  next();
};