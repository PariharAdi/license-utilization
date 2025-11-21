import { logger } from '../utils/logger';
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
  filters?: Record<string, unknown>;
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
  data: Record<string, unknown>;
}

interface InMemoryJob {
  id: number;
  data: DataSyncJob | ReportGenerationJob | CleanupJob | NotificationJob;
  status: 'waiting' | 'active' | 'completed' | 'failed';
}

class JobQueueManager {
  private inMemoryJobs: Map<string, InMemoryJob[]> = new Map();

  constructor() {
    this.initializeQueues();
  }

  private initializeQueues(): void {
    logger.info('Job queues initialized in memory mode (Redis disabled)');

    // Initialize in-memory job arrays
    this.inMemoryJobs.set('data-sync', []);
    this.inMemoryJobs.set('report-generation', []);
    this.inMemoryJobs.set('cleanup', []);
    this.inMemoryJobs.set('notifications', []);
  }

  // Public methods for adding jobs
  async addDataSyncJob(data: DataSyncJob): Promise<void> {
    logger.info(`Data sync job added (in-memory): ${data.syncType}`, data);
    const jobs = this.inMemoryJobs.get('data-sync') || [];
    jobs.push({ id: Date.now(), data, status: 'waiting' });
    this.inMemoryJobs.set('data-sync', jobs);

    // Process immediately in development
    this.processDataSyncJob(data);
  }

  async addReportGenerationJob(data: ReportGenerationJob): Promise<void> {
    logger.info(`Report generation job added (in-memory): ${data.reportType}`, data);
    const jobs = this.inMemoryJobs.get('report-generation') || [];
    jobs.push({ id: Date.now(), data, status: 'waiting' });
    this.inMemoryJobs.set('report-generation', jobs);
  }

  async addCleanupJob(data: CleanupJob): Promise<void> {
    logger.info(`Cleanup job added (in-memory): ${data.type}`, data);
    const jobs = this.inMemoryJobs.get('cleanup') || [];
    jobs.push({ id: Date.now(), data, status: 'waiting' });
    this.inMemoryJobs.set('cleanup', jobs);
  }

  async addNotificationJob(data: NotificationJob): Promise<void> {
    logger.info(`Notification job added (in-memory): ${data.type}`, data);
    const jobs = this.inMemoryJobs.get('notifications') || [];
    jobs.push({ id: Date.now(), data, status: 'waiting' });
    this.inMemoryJobs.set('notifications', jobs);
  }

  // Queue management methods
  async getQueueStats(): Promise<Record<string, JobStats>> {
    const stats: Record<string, JobStats> = {};

    for (const [queueName, jobs] of this.inMemoryJobs.entries()) {
      stats[queueName] = {
        active: jobs.filter(j => j.status === 'active').length,
        waiting: jobs.filter(j => j.status === 'waiting').length,
        completed: jobs.filter(j => j.status === 'completed').length,
        failed: jobs.filter(j => j.status === 'failed').length,
      };
    }

    return stats;
  }

  // Simple job processing (placeholder implementations)
  private async processDataSyncJob(data: DataSyncJob): Promise<void> {
    try {
      logger.info(`Processing data sync job: ${data.syncType} for user ${data.userId}`);

      // Simulate async work
      await new Promise(resolve => setTimeout(resolve, 1000));

      logger.info(`Data sync job completed: ${data.syncType}`);
    } catch (error) {
      logger.error(`Data sync job failed: ${data.syncType}`, error);
    }
  }

  // Cleanup helper methods (placeholders)
  async pauseQueue(queueName: string): Promise<void> {
    logger.info(`Queue ${queueName} paused (in-memory mode)`);
  }

  async resumeQueue(queueName: string): Promise<void> {
    logger.info(`Queue ${queueName} resumed (in-memory mode)`);
  }

  // Graceful shutdown
  async close(): Promise<void> {
    logger.info('JobQueueManager shutting down (in-memory mode)');
    this.inMemoryJobs.clear();
  }
}

// Simple static wrapper for backwards compatibility
export class JobQueue {
  private static manager = new JobQueueManager();

  static async getQueueStats(): Promise<Record<string, JobStats>> {
    return this.manager.getQueueStats();
  }

  static async addDataSyncJob(data: DataSyncJob): Promise<void> {
    return this.manager.addDataSyncJob(data);
  }

  static async addReportGenerationJob(data: ReportGenerationJob): Promise<void> {
    return this.manager.addReportGenerationJob(data);
  }

  static async addCleanupJob(data: CleanupJob): Promise<void> {
    return this.manager.addCleanupJob(data);
  }

  static async addNotificationJob(data: NotificationJob): Promise<void> {
    return this.manager.addNotificationJob(data);
  }
}

// Export the manager instance
export const jobQueue = new JobQueueManager();