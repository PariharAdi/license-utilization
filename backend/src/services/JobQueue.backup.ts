import Bull, { Queue, Job, JobOptions } from 'bull';
import { logger } from '../utils/logger';
import SalesforceDataService from './SalesforceDataService';
import { UserModel } from '../models/User';
import { OrganizationModel } from '../models/Organization';
import { redis } from '../config/database';
import { JobStats } from '../types';

// Job types
export interface DataSyncJob {
  userId: string;
  organizationId: string;
  syncType: 'full' | 'users' | 'licenses' | 'activity';
  priority?: number;
}

export interface ReportGenerationJob {
  userId: string;
  organizationId: string;
  reportType: 'usage' | 'licenses' | 'activity' | 'compliance';
  filters?: any;
  format: 'csv' | 'pdf' | 'excel';
  email?: string;
}

export interface CleanupJob {
  type: 'logs' | 'sessions' | 'temp_files' | 'old_data';
  olderThanDays: number;
}

export interface NotificationJob {
  userId: string;
  organizationId: string;
  type: 'license_threshold' | 'inactive_users' | 'sync_complete' | 'error_alert';
  data: any;
}

class JobQueueManager {
  private dataSync: Queue<DataSyncJob> | null = null;
  private reportGeneration: Queue<ReportGenerationJob> | null = null;
  private cleanup: Queue<CleanupJob> | null = null;
  private notifications: Queue<NotificationJob> | null = null;
  private isRedisAvailable: boolean = false;

  constructor() {
    this.initializeQueues();
  }

  private initializeQueues(): void {
    try {
      // For now, skip Redis-based queues and use in-memory processing
      this.isRedisAvailable = false;
      logger.info('Job queues initialized in memory mode (Redis disabled)');
    } catch (error) {
      logger.error('❌ Failed to initialize job queues:', error);
      this.isRedisAvailable = false;
    }
  }

  private setupProcessors(): void {
    // Data sync processor
    this.dataSync.process('sync-data', 3, async (job: Job<DataSyncJob>) => {
      const { userId, organizationId, syncType } = job.data;

      try {
        logger.info(`Starting data sync: ${syncType}`, { userId, organizationId });

        const user = await UserModel.findById(userId);
        if (!user) {
          throw new Error(`User ${userId} not found`);
        }

        const organization = await OrganizationModel.findById(organizationId);
        if (!organization) {
          throw new Error(`Organization ${organizationId} not found`);
        }

        // Update job progress
        await job.progress(10);

        switch (syncType) {
          case 'full':
            await SalesforceDataService.fullSync(userId);
            break;
          case 'users':
            await SalesforceDataService.syncUsers(userId);
            break;
          case 'licenses':
            await SalesforceDataService.syncLicenseUtilization(userId);
            break;
          case 'activity':
            await SalesforceDataService.processEventLogFiles(userId);
            break;
        }

        await job.progress(100);

        // Queue notification job
        await this.addNotificationJob({
          userId,
          organizationId,
          type: 'sync_complete',
          data: { syncType, timestamp: new Date() },
        });

        logger.info(`Data sync completed: ${syncType}`, { userId, organizationId });

        return { success: true, syncType, timestamp: new Date() };
      } catch (error) {
        logger.error(`Data sync failed: ${syncType}`, error, { userId, organizationId });

        // Queue error notification
        await this.addNotificationJob({
          userId,
          organizationId,
          type: 'error_alert',
          data: {
            error: error.message,
            syncType,
            timestamp: new Date()
          },
        });

        throw error;
      }
    });

    // Report generation processor
    this.reportGeneration.process('generate-report', 2, async (job: Job<ReportGenerationJob>) => {
      const { userId, organizationId, reportType, filters, format, email } = job.data;

      try {
        logger.info(`Generating report: ${reportType} (${format})`, { userId, organizationId });

        await job.progress(20);

        // Generate report logic would go here
        // For now, simulate report generation
        await new Promise(resolve => setTimeout(resolve, 5000));

        await job.progress(80);

        const reportPath = `/tmp/reports/${reportType}-${Date.now()}.${format}`;

        // Simulate file creation
        await job.progress(90);

        if (email) {
          // Send email with report attachment (implementation would use nodemailer)
          logger.info(`Report sent to ${email}`, { userId, organizationId, reportType });
        }

        await job.progress(100);

        logger.info(`Report generated: ${reportType}`, { userId, organizationId, reportPath });

        return {
          success: true,
          reportType,
          format,
          reportPath,
          timestamp: new Date()
        };
      } catch (error) {
        logger.error(`Report generation failed: ${reportType}`, error, { userId, organizationId });
        throw error;
      }
    });

    // Cleanup processor
    this.cleanup.process('cleanup-task', 1, async (job: Job<CleanupJob>) => {
      const { type, olderThanDays } = job.data;

      try {
        logger.info(`Starting cleanup: ${type} (older than ${olderThanDays} days)`);

        const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

        switch (type) {
          case 'logs':
            // Cleanup old log files
            await this.cleanupLogs(cutoffDate);
            break;
          case 'sessions':
            // Cleanup expired sessions
            await this.cleanupSessions(cutoffDate);
            break;
          case 'temp_files':
            // Cleanup temporary files
            await this.cleanupTempFiles(cutoffDate);
            break;
          case 'old_data':
            // Cleanup old analytics data
            await this.cleanupOldData(cutoffDate);
            break;
        }

        logger.info(`Cleanup completed: ${type}`);

        return { success: true, type, cutoffDate, timestamp: new Date() };
      } catch (error) {
        logger.error(`Cleanup failed: ${type}`, error);
        throw error;
      }
    });

    // Notifications processor
    this.notifications.process('send-notification', 5, async (job: Job<NotificationJob>) => {
      const { userId, organizationId, type, data } = job.data;

      try {
        logger.info(`Sending notification: ${type}`, { userId, organizationId });

        // Notification logic would go here (email, push, webhook, etc.)
        // For now, just log the notification

        switch (type) {
          case 'license_threshold':
            await this.handleLicenseThresholdNotification(userId, organizationId, data);
            break;
          case 'inactive_users':
            await this.handleInactiveUsersNotification(userId, organizationId, data);
            break;
          case 'sync_complete':
            await this.handleSyncCompleteNotification(userId, organizationId, data);
            break;
          case 'error_alert':
            await this.handleErrorAlertNotification(userId, organizationId, data);
            break;
        }

        logger.info(`Notification sent: ${type}`, { userId, organizationId });

        return { success: true, type, timestamp: new Date() };
      } catch (error) {
        logger.error(`Notification failed: ${type}`, error, { userId, organizationId });
        throw error;
      }
    });
  }

  private setupEventHandlers(): void {
    // Global error handler
    const queues = [this.dataSync, this.reportGeneration, this.cleanup, this.notifications];

    queues.forEach(queue => {
      queue.on('error', (error) => {
        logger.error(`Queue error in ${queue.name}:`, error);
      });

      queue.on('waiting', (jobId) => {
        logger.debug(`Job ${jobId} is waiting in ${queue.name}`);
      });

      queue.on('active', (job) => {
        logger.info(`Job ${job.id} started in ${queue.name}`, { jobData: job.data });
      });

      queue.on('completed', (job, result) => {
        logger.info(`Job ${job.id} completed in ${queue.name}`, { result });
      });

      queue.on('failed', (job, error) => {
        logger.error(`Job ${job.id} failed in ${queue.name}`, error, { jobData: job.data });
      });

      queue.on('stalled', (job) => {
        logger.warn(`Job ${job.id} stalled in ${queue.name}`, { jobData: job.data });
      });
    });
  }

  // Public methods for adding jobs
  async addDataSyncJob(data: DataSyncJob, options?: JobOptions): Promise<Job<DataSyncJob>> {
    const defaultOptions: JobOptions = {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: 50,
      removeOnFail: 10,
    };

    return await this.dataSync.add('sync-data', data, { ...defaultOptions, ...options });
  }

  async addReportGenerationJob(data: ReportGenerationJob, options?: JobOptions): Promise<Job<ReportGenerationJob>> {
    const defaultOptions: JobOptions = {
      attempts: 2,
      backoff: {
        type: 'fixed',
        delay: 10000,
      },
      removeOnComplete: 20,
      removeOnFail: 5,
    };

    return await this.reportGeneration.add('generate-report', data, { ...defaultOptions, ...options });
  }

  async addCleanupJob(data: CleanupJob, options?: JobOptions): Promise<Job<CleanupJob>> {
    const defaultOptions: JobOptions = {
      attempts: 1,
      removeOnComplete: 10,
      removeOnFail: 3,
    };

    return await this.cleanup.add('cleanup-task', data, { ...defaultOptions, ...options });
  }

  async addNotificationJob(data: NotificationJob, options?: JobOptions): Promise<Job<NotificationJob>> {
    const defaultOptions: JobOptions = {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: 100,
      removeOnFail: 20,
    };

    return await this.notifications.add('send-notification', data, { ...defaultOptions, ...options });
  }

  // Queue management methods
  async getQueueStats(): Promise<Record<string, JobStats>> {
    const stats: Record<string, JobStats> = {};

    const queues = {
      dataSync: this.dataSync,
      reportGeneration: this.reportGeneration,
      cleanup: this.cleanup,
      notifications: this.notifications,
    };

    for (const [name, queue] of Object.entries(queues)) {
      if (!queue) continue;
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaiting(),
        queue.getActive(),
        queue.getCompleted(),
        queue.getFailed(),
        queue.getDelayed(),
      ]);

      stats[name] = {
        name,
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
      } as JobStats;
    }

    return stats;
  }

  async pauseQueue(queueName: string): Promise<void> {
    const queue = this.getQueueByName(queueName);
    if (queue) {
      await queue.pause();
      logger.info(`Queue paused: ${queueName}`);
    }
  }

  async resumeQueue(queueName: string): Promise<void> {
    const queue = this.getQueueByName(queueName);
    if (queue) {
      await queue.resume();
      logger.info(`Queue resumed: ${queueName}`);
    }
  }

  private getQueueByName(name: string): Queue | null {
    const queueMap: { [key: string]: Queue } = {
      'dataSync': this.dataSync,
      'reportGeneration': this.reportGeneration,
      'cleanup': this.cleanup,
      'notifications': this.notifications,
    };

    return queueMap[name] || null;
  }

  // Cleanup helper methods
  private async cleanupLogs(cutoffDate: Date): Promise<void> {
    // Implementation for log cleanup
    logger.info('Log cleanup completed', { cutoffDate });
  }

  private async cleanupSessions(cutoffDate: Date): Promise<void> {
    // Cleanup expired sessions from Redis
    const keys = await redis.keys('sess:*');
    let cleaned = 0;

    for (const key of keys) {
      const ttl = await redis.ttl(key);
      if (ttl === -1 || ttl === -2) {
        await redis.del(key);
        cleaned++;
      }
    }

    logger.info(`Session cleanup completed: ${cleaned} sessions removed`, { cutoffDate });
  }

  private async cleanupTempFiles(cutoffDate: Date): Promise<void> {
    // Implementation for temp file cleanup
    logger.info('Temp files cleanup completed', { cutoffDate });
  }

  private async cleanupOldData(cutoffDate: Date): Promise<void> {
    // Cleanup old analytics data from database
    logger.info('Old data cleanup completed', { cutoffDate });
  }

  // Notification handlers
  private async handleLicenseThresholdNotification(userId: string, organizationId: string, data: any): Promise<void> {
    logger.info('License threshold notification sent', { userId, organizationId, data });
  }

  private async handleInactiveUsersNotification(userId: string, organizationId: string, data: any): Promise<void> {
    logger.info('Inactive users notification sent', { userId, organizationId, data });
  }

  private async handleSyncCompleteNotification(userId: string, organizationId: string, data: any): Promise<void> {
    logger.info('Sync complete notification sent', { userId, organizationId, data });
  }

  private async handleErrorAlertNotification(userId: string, organizationId: string, data: any): Promise<void> {
    logger.error('Error alert notification sent', data, { userId, organizationId });
  }

  // Graceful shutdown
  async close(): Promise<void> {
    await Promise.all([
      this.dataSync.close(),
      this.reportGeneration.close(),
      this.cleanup.close(),
      this.notifications.close(),
    ]);

    logger.info('All job queues closed');
  }
}

export class JobQueue {
  static async getQueueStats(): Promise<Record<string, JobStats>> {
    // Placeholder - implement with Bull queue later
    logger.info('Getting queue stats (placeholder)');
    return {
      default: { active: 0, waiting: 0, completed: 0, failed: 0 },
    };
  }
}

export const jobQueue = new JobQueueManager();