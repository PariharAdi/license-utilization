import { Request, Response } from 'express';
import { jobQueue } from '../services/JobQueue';
import { scheduledJobs } from '../services/ScheduledJobs';
import { logger } from '../utils/logger';
import { ApiResponse } from '../types';

export class JobController {
  /**
   * Get job queue statistics
   * GET /api/jobs/stats
   */
  static async getJobStats(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      const organization = req.organization;

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

      logger.logUserActivity(user.id, organization.id, 'viewed job statistics', queueStats, req.ip);

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
      const user = req.user;
      const organization = req.organization;
      const { syncType = 'full' } = req.body;

      // Validate sync type
      const validSyncTypes = ['full', 'users', 'licenses', 'activity'];
      if (!validSyncTypes.includes(syncType)) {
        const response: ApiResponse = {
          success: false,
          error: `Invalid sync type. Must be one of: ${validSyncTypes.join(', ')}`,
        };
        res.status(400).json(response);
        return;
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

      logger.logUserActivity(
        user.id,
        organization.id,
        `triggered ${syncType} data sync`,
        { syncType },
        req.ip
      );

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
      const user = req.user;
      const organization = req.organization;
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
        res.status(400).json(response);
        return;
      }

      // Validate format
      const validFormats = ['csv', 'pdf', 'excel'];
      if (!validFormats.includes(format)) {
        const response: ApiResponse = {
          success: false,
          error: `Invalid format. Must be one of: ${validFormats.join(', ')}`,
        };
        res.status(400).json(response);
        return;
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

      logger.logUserActivity(
        user.id,
        organization.id,
        `triggered ${reportType} report generation`,
        { reportType, format, filters },
        req.ip
      );

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
      const user = req.user;
      const organization = req.organization;
      const { type, olderThanDays = 30 } = req.body;

      // Validate cleanup type
      const validCleanupTypes = ['logs', 'sessions', 'temp_files', 'old_data'];
      if (!validCleanupTypes.includes(type)) {
        const response: ApiResponse = {
          success: false,
          error: `Invalid cleanup type. Must be one of: ${validCleanupTypes.join(', ')}`,
        };
        res.status(400).json(response);
        return;
      }

      // Validate days
      if (typeof olderThanDays !== 'number' || olderThanDays < 1) {
        const response: ApiResponse = {
          success: false,
          error: 'olderThanDays must be a number greater than 0',
        };
        res.status(400).json(response);
        return;
      }

      // Trigger the cleanup job
      await scheduledJobs.triggerCleanup(type, olderThanDays);

      const response: ApiResponse = {
        success: true,
        message: `${type} cleanup has been queued (older than ${olderThanDays} days)`,
        data: {
          type,
          olderThanDays,
          timestamp: new Date(),
        },
      };

      logger.logUserActivity(
        user.id,
        organization.id,
        `triggered ${type} cleanup`,
        { type, olderThanDays },
        req.ip
      );

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
      const user = req.user;
      const organization = req.organization;
      const { jobName, action } = req.params;

      if (!['start', 'stop'].includes(action)) {
        const response: ApiResponse = {
          success: false,
          error: 'Action must be "start" or "stop"',
        };
        res.status(400).json(response);
        return;
      }

      let success = false;
      if (action === 'start') {
        success = scheduledJobs.startJob(jobName);
      } else {
        success = scheduledJobs.stopJob(jobName);
      }

      if (!success) {
        const response: ApiResponse = {
          success: false,
          error: `Job '${jobName}' not found`,
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: `Scheduled job '${jobName}' ${action}ed successfully`,
        data: {
          jobName,
          action,
          timestamp: new Date(),
        },
      };

      logger.logUserActivity(
        user.id,
        organization.id,
        `${action}ed scheduled job: ${jobName}`,
        { jobName, action },
        req.ip
      );

      res.json(response);
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
      const user = req.user;

      // Get basic health information
      const queueStats = await jobQueue.getQueueStats();
      const scheduledJobStatus = scheduledJobs.getJobStatus();

      // Calculate health metrics
      const totalActiveJobs = Object.values(queueStats).reduce((sum: number, queue: any) => sum + queue.active, 0);
      const totalFailedJobs = Object.values(queueStats).reduce((sum: number, queue: any) => sum + queue.failed, 0);
      const totalWaitingJobs = Object.values(queueStats).reduce((sum: number, queue: any) => sum + queue.waiting, 0);

      const runningScheduledJobs = Object.values(scheduledJobStatus).filter((job: any) => job.running).length;
      const totalScheduledJobs = Object.keys(scheduledJobStatus).length;

      const healthStatus = {
        overall: 'healthy' as 'healthy' | 'warning' | 'critical',
        queues: {
          active: totalActiveJobs,
          failed: totalFailedJobs,
          waiting: totalWaitingJobs,
          status: 'healthy' as 'healthy' | 'warning' | 'critical',
        },
        scheduledJobs: {
          running: runningScheduledJobs,
          total: totalScheduledJobs,
          status: 'healthy' as 'healthy' | 'warning' | 'critical',
        },
        timestamp: new Date(),
      };

      // Determine health status
      if (totalFailedJobs > 20) {
        healthStatus.queues.status = 'critical';
        healthStatus.overall = 'critical';
      } else if (totalFailedJobs > 10) {
        healthStatus.queues.status = 'warning';
        healthStatus.overall = 'warning';
      }

      if (runningScheduledJobs < totalScheduledJobs * 0.5) {
        healthStatus.scheduledJobs.status = 'warning';
        if (healthStatus.overall === 'healthy') {
          healthStatus.overall = 'warning';
        }
      }

      const response: ApiResponse = {
        success: true,
        data: {
          health: healthStatus,
          details: {
            queueStats,
            scheduledJobStatus,
          },
        },
      };

      if (user) {
        logger.logUserActivity(user.id, req.organization?.id, 'viewed system health', healthStatus, req.ip);
      }

      res.json(response);
    } catch (error) {
      logger.error('Error getting system health', error);

      const response: ApiResponse = {
        success: false,
        error: 'Failed to retrieve system health',
      };

      res.status(500).json(response);
    }
  }
}