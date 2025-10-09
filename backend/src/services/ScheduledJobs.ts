import cron from 'node-cron';
import { logger } from '../utils/logger';
import { jobQueue } from './JobQueue';
import { pool } from '../config/database';

class ScheduledJobsManager {
  private jobs: Map<string, cron.ScheduledTask> = new Map();

  constructor() {
    this.initializeJobs();
  }

  private initializeJobs(): void {
    // Daily data sync for all active organizations (runs at 2 AM)
    this.scheduleJob('daily-sync', '0 2 * * *', async () => {
      await this.scheduleDailySyncJobs();
    });

    // License utilization check (runs every 6 hours)
    this.scheduleJob('license-check', '0 */6 * * *', async () => {
      await this.scheduleLicenseChecks();
    });

    // Cleanup old data (runs weekly at Sunday 3 AM)
    this.scheduleJob('weekly-cleanup', '0 3 * * 0', async () => {
      await this.scheduleCleanupJobs();
    });

    // Generate daily reports (runs at 6 AM on weekdays)
    this.scheduleJob('daily-reports', '0 6 * * 1-5', async () => {
      await this.scheduleDailyReports();
    });

    // Health check and system monitoring (runs every 15 minutes)
    this.scheduleJob('health-check', '*/15 * * * *', async () => {
      await this.performHealthCheck();
    });

    // Inactive user notification (runs weekly on Monday at 9 AM)
    this.scheduleJob('inactive-users', '0 9 * * 1', async () => {
      await this.checkInactiveUsers();
    });

    // Session cleanup (runs every hour)
    this.scheduleJob('session-cleanup', '0 * * * *', async () => {
      await this.scheduleSessionCleanup();
    });
  }

  private scheduleJob(name: string, schedule: string, task: () => Promise<void>): void {
    const scheduledTask = cron.schedule(schedule, async () => {
      const startTime = Date.now();
      logger.info(`Starting scheduled job: ${name}`);

      try {
        await task();
        const duration = Date.now() - startTime;
        logger.info(`Scheduled job completed: ${name} (${duration}ms)`);
        logger.logPerformance(`Scheduled job: ${name}`, duration);
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.error(`Scheduled job failed: ${name} (${duration}ms)`, error);
      }
    }, {
      scheduled: false, // Don't start immediately
    });

    this.jobs.set(name, scheduledTask);
    logger.info(`Scheduled job registered: ${name} with schedule ${schedule}`);
  }

  private async scheduleDailySyncJobs(): Promise<void> {
    try {
      // Get all active organizations
      const query = `
        SELECT DISTINCT u.org_id, u.id as user_id
        FROM users u
        JOIN organizations o ON u.org_id = o.id
        WHERE u.is_active = true AND o.is_active = true
        ORDER BY o.created_at
      `;

      const result = await pool.query(query);

      for (const row of result.rows) {
        // Schedule full sync for each organization
        await jobQueue.addDataSyncJob({
          userId: row.user_id,
          organizationId: row.org_id,
          syncType: 'full',
          priority: 1,
        }, {
          delay: Math.random() * 60000, // Stagger jobs over 1 minute
        });

        logger.info(`Scheduled daily sync for organization: ${row.org_id}`);
      }

      logger.info(`Scheduled daily sync jobs for ${result.rows.length} organizations`);
    } catch (error) {
      logger.error('Failed to schedule daily sync jobs', error);
      throw error;
    }
  }

  private async scheduleLicenseChecks(): Promise<void> {
    try {
      // Get license utilization data and check thresholds
      const query = `
        SELECT
          ls.org_id,
          o.org_name,
          ls.license_type,
          ls.total_licenses,
          ls.used_licenses,
          ls.utilization_percent,
          u.id as admin_user_id
        FROM license_summaries ls
        JOIN organizations o ON ls.org_id = o.id
        JOIN users u ON u.org_id = o.id
        WHERE ls.summary_date = CURRENT_DATE
        AND ls.utilization_percent > 90
        AND u.profile_name LIKE '%Administrator%'
        AND u.is_active = true
        ORDER BY ls.utilization_percent DESC
      `;

      const result = await pool.query(query);

      for (const row of result.rows) {
        // Send notification for high license utilization
        await jobQueue.addNotificationJob({
          userId: row.admin_user_id,
          organizationId: row.org_id,
          type: 'license_threshold',
          data: {
            licenseType: row.license_type,
            utilization: row.utilization_percent,
            totalLicenses: row.total_licenses,
            usedLicenses: row.used_licenses,
            threshold: 90,
            orgName: row.org_name,
          },
        });

        logger.warn(`High license utilization detected: ${row.org_name} - ${row.license_type} (${row.utilization_percent}%)`);
      }

      logger.info(`Processed license checks for ${result.rows.length} high-utilization scenarios`);
    } catch (error) {
      logger.error('Failed to perform license checks', error);
      throw error;
    }
  }

  private async scheduleCleanupJobs(): Promise<void> {
    try {
      // Schedule various cleanup tasks
      const cleanupTasks = [
        { type: 'logs', olderThanDays: 30 },
        { type: 'sessions', olderThanDays: 7 },
        { type: 'temp_files', olderThanDays: 1 },
        { type: 'old_data', olderThanDays: 365 },
      ];

      for (const task of cleanupTasks) {
        await jobQueue.addCleanupJob(task as any, {
          delay: Math.random() * 300000, // Stagger over 5 minutes
        });

        logger.info(`Scheduled cleanup job: ${task.type} (older than ${task.olderThanDays} days)`);
      }

      logger.info(`Scheduled ${cleanupTasks.length} cleanup jobs`);
    } catch (error) {
      logger.error('Failed to schedule cleanup jobs', error);
      throw error;
    }
  }

  private async scheduleDailyReports(): Promise<void> {
    try {
      // Get organizations that have opted in for daily reports
      const query = `
        SELECT DISTINCT
          u.org_id,
          u.id as user_id,
          u.email,
          o.org_name
        FROM users u
        JOIN organizations o ON u.org_id = o.id
        WHERE u.is_active = true
        AND o.is_active = true
        AND u.profile_name LIKE '%Administrator%'
        ORDER BY o.created_at
      `;

      const result = await pool.query(query);

      for (const row of result.rows) {
        // Schedule usage report generation
        await jobQueue.addReportGenerationJob({
          userId: row.user_id,
          organizationId: row.org_id,
          reportType: 'usage',
          format: 'pdf',
          email: row.email,
        }, {
          delay: Math.random() * 120000, // Stagger over 2 minutes
        });

        logger.info(`Scheduled daily report for organization: ${row.org_name}`);
      }

      logger.info(`Scheduled daily reports for ${result.rows.length} organizations`);
    } catch (error) {
      logger.error('Failed to schedule daily reports', error);
      throw error;
    }
  }

  private async performHealthCheck(): Promise<void> {
    try {
      const healthData: any = {
        timestamp: new Date(),
        services: {},
        queues: {},
      };

      // Check database connection
      try {
        await pool.query('SELECT 1');
        healthData.services.database = 'healthy';
      } catch (error) {
        healthData.services.database = 'unhealthy';
        logger.error('Database health check failed', error);
      }

      // Check Redis connection
      try {
        const { redis } = await import('../config/database');
        await redis.ping();
        healthData.services.redis = 'healthy';
      } catch (error) {
        healthData.services.redis = 'unhealthy';
        logger.error('Redis health check failed', error);
      }

      // Check queue stats
      try {
        healthData.queues = await jobQueue.getQueueStats();
      } catch (error) {
        logger.error('Queue health check failed', error);
      }

      // Log performance metrics
      const totalActiveJobs = Object.values(healthData.queues).reduce((sum: number, queue: any) => sum + queue.active, 0);
      const totalFailedJobs = Object.values(healthData.queues).reduce((sum: number, queue: any) => sum + queue.failed, 0);

      logger.info('System health check completed', {
        ...healthData,
        totalActiveJobs,
        totalFailedJobs,
      });

      // Alert if there are issues
      if (healthData.services.database === 'unhealthy' || healthData.services.redis === 'unhealthy') {
        logger.error('Critical system health issues detected', healthData);
      }

      if (totalFailedJobs > 10) {
        logger.warn(`High number of failed jobs detected: ${totalFailedJobs}`, healthData.queues);
      }
    } catch (error) {
      logger.error('Health check failed', error);
      throw error;
    }
  }

  private async checkInactiveUsers(): Promise<void> {
    try {
      // Find users who haven't logged in for 30+ days
      const query = `
        SELECT
          u.id,
          u.org_id,
          u.username,
          u.email,
          u.last_login,
          o.org_name,
          admin.id as admin_user_id
        FROM users u
        JOIN organizations o ON u.org_id = o.id
        JOIN users admin ON admin.org_id = o.id
        WHERE u.is_active = true
        AND u.last_login < NOW() - INTERVAL '30 days'
        AND admin.profile_name LIKE '%Administrator%'
        AND admin.is_active = true
        ORDER BY u.last_login ASC
      `;

      const result = await pool.query(query);

      // Group by organization
      const orgInactiveUsers: { [key: string]: any[] } = {};

      for (const row of result.rows) {
        if (!orgInactiveUsers[row.org_id]) {
          orgInactiveUsers[row.org_id] = [];
        }

        orgInactiveUsers[row.org_id].push({
          username: row.username,
          email: row.email,
          lastLogin: row.last_login,
          inactiveDays: Math.floor((Date.now() - new Date(row.last_login).getTime()) / (1000 * 60 * 60 * 24)),
        });
      }

      // Send notifications to administrators
      for (const [orgId, inactiveUsers] of Object.entries(orgInactiveUsers)) {
        if (inactiveUsers.length > 0) {
          const adminRow = result.rows.find(row => row.org_id === orgId);

          await jobQueue.addNotificationJob({
            userId: adminRow.admin_user_id,
            organizationId: orgId,
            type: 'inactive_users',
            data: {
              orgName: adminRow.org_name,
              inactiveUsers: inactiveUsers.slice(0, 20), // Limit to 20 users in notification
              totalInactiveUsers: inactiveUsers.length,
            },
          });

          logger.info(`Inactive user notification scheduled for org: ${adminRow.org_name} (${inactiveUsers.length} users)`);
        }
      }

      logger.info(`Processed inactive user checks for ${Object.keys(orgInactiveUsers).length} organizations`);
    } catch (error) {
      logger.error('Failed to check inactive users', error);
      throw error;
    }
  }

  private async scheduleSessionCleanup(): Promise<void> {
    try {
      await jobQueue.addCleanupJob({
        type: 'sessions',
        olderThanDays: 1,
      });

      logger.debug('Scheduled session cleanup job');
    } catch (error) {
      logger.error('Failed to schedule session cleanup', error);
      throw error;
    }
  }

  // Public methods for job management
  startAllJobs(): void {
    for (const [name, job] of this.jobs) {
      job.start();
      logger.info(`Started scheduled job: ${name}`);
    }
  }

  stopAllJobs(): void {
    for (const [name, job] of this.jobs) {
      job.stop();
      logger.info(`Stopped scheduled job: ${name}`);
    }
  }

  startJob(name: string): boolean {
    const job = this.jobs.get(name);
    if (job) {
      job.start();
      logger.info(`Started scheduled job: ${name}`);
      return true;
    }
    return false;
  }

  stopJob(name: string): boolean {
    const job = this.jobs.get(name);
    if (job) {
      job.stop();
      logger.info(`Stopped scheduled job: ${name}`);
      return true;
    }
    return false;
  }

  getJobStatus(): { [key: string]: { running: boolean; nextRun: Date | null } } {
    const status: { [key: string]: { running: boolean; nextRun: Date | null } } = {};

    for (const [name, job] of this.jobs) {
      status[name] = {
        running: job.getStatus() === 'scheduled',
        nextRun: job.nextDate()?.toDate() || null,
      };
    }

    return status;
  }

  // Manual job triggers (for testing or admin operations)
  async triggerDataSync(userId: string, organizationId: string, syncType: 'full' | 'users' | 'licenses' | 'activity' = 'full'): Promise<void> {
    await jobQueue.addDataSyncJob({
      userId,
      organizationId,
      syncType,
      priority: 10, // High priority for manual triggers
    });

    logger.info(`Manual data sync triggered: ${syncType}`, { userId, organizationId });
  }

  async triggerReportGeneration(
    userId: string,
    organizationId: string,
    reportType: 'usage' | 'licenses' | 'activity' | 'compliance',
    format: 'csv' | 'pdf' | 'excel' = 'pdf',
    email?: string
  ): Promise<void> {
    await jobQueue.addReportGenerationJob({
      userId,
      organizationId,
      reportType,
      format,
      email,
    });

    logger.info(`Manual report generation triggered: ${reportType} (${format})`, { userId, organizationId });
  }

  async triggerCleanup(type: 'logs' | 'sessions' | 'temp_files' | 'old_data', olderThanDays: number): Promise<void> {
    await jobQueue.addCleanupJob({
      type,
      olderThanDays,
    });

    logger.info(`Manual cleanup triggered: ${type} (older than ${olderThanDays} days)`);
  }

  // Graceful shutdown
  async shutdown(): Promise<void> {
    logger.info('Shutting down scheduled jobs...');

    this.stopAllJobs();

    // Wait for any running jobs to complete
    await new Promise(resolve => setTimeout(resolve, 5000));

    await jobQueue.close();

    logger.info('All scheduled jobs shut down');
  }
}

export const scheduledJobs = new ScheduledJobsManager();