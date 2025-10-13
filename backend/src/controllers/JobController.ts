import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { ApiResponse } from '../types';
import { jobQueue } from '../services/JobQueue';
import { scheduledJobs } from '../services/ScheduledJobs';


export class JobController {
  /**
   * Get job queue statistics
   * GET /api/jobs/stats
   */
  static async getJobStats(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user || { id: 'mock-user' };

      // Get queue statistics
      const queueStats = await jobQueue.getQueueStats();

      // Get scheduled job status
      const scheduledJobStatus = scheduledJobs.getJobStatus();

      const response: ApiResponse = {
        success: true,
        data: {
          queues: queueStats,
          scheduledJobs: scheduledJobStatus,
          timestamp: new Date(),
        },
      };

      logger.info(`User ${user.id} viewed job statistics`);

      res.json(response);
    } catch (error) {
      logger.error('Error getting job stats', error);

      const response: ApiResponse = {
        success: false,
        error: 'Failed to retrieve job statistics',
      };

      res.status(500).json(response);
    }
  }

  /**
   * Trigger manual data sync
   * POST /api/jobs/sync
   */
  static async triggerSync(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user || { id: 'mock-user' };
      const organization = (req as any).organization || { id: 'mock-org' };
      const { syncType = 'full' } = req.body;

      // Validate sync type
      const validSyncTypes = ['full', 'users', 'licenses', 'activity'];
      if (!validSyncTypes.includes(syncType)) {
        const response: ApiResponse = {
          success: false,
          error: `Invalid sync type. Must be one of: ${validSyncTypes.join(', ')}`,
        };
        return res.status(400).json(response);
      }

      // Trigger the sync job
      await scheduledJobs.triggerDataSync(user.id, organization.id, syncType);

      const response: ApiResponse = {
        success: true,
        message: `${syncType} sync has been queued and will start shortly`,
        data: {
          syncType,
          userId: user.id,
          organizationId: organization.id,
          timestamp: new Date(),
        },
      };

      logger.info(`User ${user.id} triggered ${syncType} data sync`);

      res.json(response);
    } catch (error) {
      logger.error('Error triggering sync', error);

      const response: ApiResponse = {
        success: false,
        error: 'Failed to trigger data sync',
      };

      res.status(500).json(response);
    }
  }

  /**
   * Trigger manual report generation
   * POST /api/jobs/report
   */
  static async triggerReport(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user || { id: 'mock-user', email: 'user@example.com' };
      const organization = (req as any).organization || { id: 'mock-org' };
      const {
        reportType = 'usage',
        format = 'pdf',
        email,
        filters
      } = req.body;

      // Validate report type
      const validReportTypes = ['usage', 'licenses', 'activity', 'compliance'];
      if (!validReportTypes.includes(reportType)) {
        const response: ApiResponse = {
          success: false,
          error: `Invalid report type. Must be one of: ${validReportTypes.join(', ')}`,
        };
        return res.status(400).json(response);
      }

      // Validate format
      const validFormats = ['csv', 'pdf', 'excel'];
      if (!validFormats.includes(format)) {
        const response: ApiResponse = {
          success: false,
          error: `Invalid format. Must be one of: ${validFormats.join(', ')}`,
        };
        return res.status(400).json(response);
      }

      // Trigger the report generation job
      await scheduledJobs.triggerReportGeneration(
        user.id,
        organization.id,
        reportType,
        format,
        email || user.email
      );

      const response: ApiResponse = {
        success: true,
        message: `${reportType} report generation has been queued`,
        data: {
          reportType,
          format,
          email: email || user.email,
          timestamp: new Date(),
        },
      };

      logger.info(`User ${user.id} triggered ${reportType} report generation`);

      res.json(response);
    } catch (error) {
      logger.error('Error triggering report generation', error);

      const response: ApiResponse = {
        success: false,
        error: 'Failed to trigger report generation',
      };

      res.status(500).json(response);
    }
  }

  /**
   * Trigger manual cleanup
   * POST /api/jobs/cleanup
   */
  static async triggerCleanup(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user || { id: 'mock-user' };
      const organization = (req as any).organization || { id: 'mock-org' };
      const { type = 'logs', olderThanDays = 30 } = req.body;

      // Validate cleanup type
      const validTypes = ['logs', 'temp_files', 'old_reports', 'cache'];
      if (!validTypes.includes(type)) {
        const response: ApiResponse = {
          success: false,
          error: `Invalid cleanup type. Must be one of: ${validTypes.join(', ')}`,
        };
        return res.status(400).json(response);
      }

      // Trigger the cleanup job
      await scheduledJobs.triggerCleanup(type, olderThanDays);

      const response: ApiResponse = {
        success: true,
        message: `${type} cleanup has been queued for data older than ${olderThanDays} days`,
        data: {
          type,
          olderThanDays,
          timestamp: new Date(),
        },
      };

      logger.info(`User ${user.id} triggered ${type} cleanup`);

      res.json(response);
    } catch (error) {
      logger.error('Error triggering cleanup', error);

      const response: ApiResponse = {
        success: false,
        error: 'Failed to trigger cleanup',
      };

      res.status(500).json(response);
    }
  }

  /**
   * Pause/Resume scheduled job
   * POST /api/jobs/schedule/:jobName/:action
   */
  static async manageScheduledJob(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user || { id: 'mock-user' };
      const { jobName, action } = req.params;

      // Validate action
      const validActions = ['start', 'stop', 'pause', 'resume'];
      if (!validActions.includes(action)) {
        const response: ApiResponse = {
          success: false,
          error: `Invalid action. Must be one of: ${validActions.join(', ')}`,
        };
        return res.status(400).json(response);
      }

      let result = false;
      switch (action) {
        case 'start':
        case 'resume':
          result = scheduledJobs.startJob(jobName);
          break;
        case 'stop':
        case 'pause':
          result = scheduledJobs.stopJob(jobName);
          break;
      }

      const response: ApiResponse = {
        success: result,
        message: result
          ? `Job ${jobName} ${action}ed successfully`
          : `Failed to ${action} job ${jobName}`,
        data: {
          jobName,
          action,
          timestamp: new Date(),
        },
      };

      logger.info(`User ${user.id} ${action}ed job ${jobName}`);

      res.status(result ? 200 : 400).json(response);
    } catch (error) {
      logger.error('Error managing scheduled job', error);

      const response: ApiResponse = {
        success: false,
        error: 'Failed to manage scheduled job',
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get system health status
   * GET /api/jobs/health
   */
  static async getSystemHealth(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user || { id: 'mock-user' };

      // Get system health metrics
      const queueStats = await jobQueue.getQueueStats();
      const scheduledJobStatus = scheduledJobs.getJobStatus();

      // Check memory usage
      const memoryUsage = process.memoryUsage();
      const uptime = process.uptime();

      const response: ApiResponse = {
        success: true,
        data: {
          status: 'healthy',
          uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
          memory: {
            used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
            total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
            external: Math.round(memoryUsage.external / 1024 / 1024),
          },
          queues: queueStats,
          scheduledJobs: scheduledJobStatus,
          timestamp: new Date(),
        },
      };

      logger.info(`User ${user.id} checked system health`);

      res.json(response);
    } catch (error) {
      logger.error('Error getting system health', error);

      const response: ApiResponse = {
        success: false,
        error: 'Failed to retrieve system health status',
      };

      res.status(500).json(response);
    }
  }
}