import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { notificationService } from '../services/NotificationService';
import { logger } from '../utils/logger';
import { ApiResponse } from '../types';

export class NotificationController {
  // Validation middleware
  static validateWebhook = [
    body('url')
      .isURL({ protocols: ['http', 'https'] })
      .withMessage('Valid webhook URL is required'),
    body('events')
      .optional()
      .isArray()
      .withMessage('Events must be an array'),
  ];

  static validateNotificationPreferences = [
    body('email')
      .optional()
      .isBoolean()
      .withMessage('Email preference must be boolean'),
    body('websocket')
      .optional()
      .isBoolean()
      .withMessage('WebSocket preference must be boolean'),
    body('webhook')
      .optional()
      .isBoolean()
      .withMessage('Webhook preference must be boolean'),
  ];

  /**
   * Get user notifications
   * GET /api/notifications
   */
  static async getNotifications(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      const { limit = '50', unread_only = 'false' } = req.query;

      const notifications = await notificationService.getNotifications(
        user.id,
        parseInt(limit as string)
      );

      const filteredNotifications = unread_only === 'true'
        ? notifications.filter(n => !n.is_read)
        : notifications;

      const response: ApiResponse = {
        success: true,
        data: {
          notifications: filteredNotifications,
          total: filteredNotifications.length,
          unreadCount: notifications.filter(n => !n.is_read).length,
        },
      };

      logger.logUserActivity(
        user.id,
        req.organization?.id,
        'retrieved notifications',
        { count: filteredNotifications.length, unreadCount: response.data.unreadCount },
        req.ip
      );

      res.json(response);
    } catch (error) {
      logger.error('Error retrieving notifications', error);

      const response: ApiResponse = {
        success: false,
        error: 'Failed to retrieve notifications',
      };

      res.status(500).json(response);
    }
  }

  /**
   * Mark notification as read
   * PATCH /api/notifications/:id/read
   */
  static async markAsRead(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      const { id } = req.params;

      // Update notification status
      await notificationService['markNotificationAsRead'](user.id, id);

      const response: ApiResponse = {
        success: true,
        message: 'Notification marked as read',
      };

      logger.logUserActivity(
        user.id,
        req.organization?.id,
        'marked notification as read',
        { notificationId: id },
        req.ip
      );

      res.json(response);
    } catch (error) {
      logger.error('Error marking notification as read', error);

      const response: ApiResponse = {
        success: false,
        error: 'Failed to mark notification as read',
      };

      res.status(500).json(response);
    }
  }

  /**
   * Update notification preferences
   * PUT /api/notifications/preferences
   */
  static async updatePreferences(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const response: ApiResponse = {
          success: false,
          error: 'Validation failed',
          details: errors.array(),
        };
        res.status(400).json(response);
        return;
      }

      const user = req.user;
      const preferences = req.body;

      await notificationService['updateNotificationPreferences'](user.id, preferences);

      const response: ApiResponse = {
        success: true,
        message: 'Notification preferences updated',
        data: { preferences },
      };

      logger.logUserActivity(
        user.id,
        req.organization?.id,
        'updated notification preferences',
        preferences,
        req.ip
      );

      res.json(response);
    } catch (error) {
      logger.error('Error updating notification preferences', error);

      const response: ApiResponse = {
        success: false,
        error: 'Failed to update notification preferences',
      };

      res.status(500).json(response);
    }
  }

  /**
   * Send test notification
   * POST /api/notifications/test
   */
  static async sendTestNotification(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      const organization = req.organization;

      await notificationService.sendNotification({
        userId: user.id,
        organizationId: organization.id,
        type: 'system_alert',
        title: 'Test Notification',
        message: 'This is a test notification to verify your notification settings.',
        priority: 'low',
        channels: ['websocket', 'email'],
        data: {
          testData: true,
          timestamp: new Date().toISOString(),
        },
      });

      const response: ApiResponse = {
        success: true,
        message: 'Test notification sent',
      };

      logger.logUserActivity(
        user.id,
        organization.id,
        'sent test notification',
        {},
        req.ip
      );

      res.json(response);
    } catch (error) {
      logger.error('Error sending test notification', error);

      const response: ApiResponse = {
        success: false,
        error: 'Failed to send test notification',
      };

      res.status(500).json(response);
    }
  }

  /**
   * Register webhook (admin only)
   * POST /api/notifications/webhooks
   */
  static async registerWebhook(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const response: ApiResponse = {
          success: false,
          error: 'Validation failed',
          details: errors.array(),
        };
        res.status(400).json(response);
        return;
      }

      const user = req.user;
      const organization = req.organization;
      const { url, events } = req.body;

      await notificationService.registerWebhook(organization.id, url);

      const response: ApiResponse = {
        success: true,
        message: 'Webhook registered successfully',
        data: {
          url,
          events: events || ['all'],
          organizationId: organization.id,
        },
      };

      logger.logUserActivity(
        user.id,
        organization.id,
        'registered webhook',
        { url, events },
        req.ip
      );

      res.json(response);
    } catch (error) {
      logger.error('Error registering webhook', error);

      const response: ApiResponse = {
        success: false,
        error: 'Failed to register webhook',
      };

      res.status(500).json(response);
    }
  }

  /**
   * Remove webhook (admin only)
   * DELETE /api/notifications/webhooks
   */
  static async removeWebhook(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      const organization = req.organization;
      const { url } = req.body;

      if (!url) {
        const response: ApiResponse = {
          success: false,
          error: 'Webhook URL is required',
        };
        res.status(400).json(response);
        return;
      }

      await notificationService.removeWebhook(organization.id, url);

      const response: ApiResponse = {
        success: true,
        message: 'Webhook removed successfully',
      };

      logger.logUserActivity(
        user.id,
        organization.id,
        'removed webhook',
        { url },
        req.ip
      );

      res.json(response);
    } catch (error) {
      logger.error('Error removing webhook', error);

      const response: ApiResponse = {
        success: false,
        error: 'Failed to remove webhook',
      };

      res.status(500).json(response);
    }
  }

  /**
   * Test webhook endpoint
   * POST /api/notifications/webhooks/test
   */
  static async testWebhook(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      const organization = req.organization;

      await notificationService.sendNotification({
        organizationId: organization.id,
        type: 'system_alert',
        title: 'Webhook Test',
        message: 'This is a test webhook notification to verify your webhook endpoint.',
        priority: 'low',
        channels: ['webhook'],
        data: {
          test: true,
          timestamp: new Date().toISOString(),
          organizationId: organization.id,
        },
      });

      const response: ApiResponse = {
        success: true,
        message: 'Test webhook sent',
      };

      logger.logUserActivity(
        user.id,
        organization.id,
        'sent test webhook',
        {},
        req.ip
      );

      res.json(response);
    } catch (error) {
      logger.error('Error sending test webhook', error);

      const response: ApiResponse = {
        success: false,
        error: 'Failed to send test webhook',
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get notification statistics (admin only)
   * GET /api/notifications/stats
   */
  static async getNotificationStats(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      const organization = req.organization;
      const { days = '30' } = req.query;

      const daysBack = parseInt(days as string);
      const cutoffDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

      // Get notification statistics
      const statsQuery = `
        SELECT
          type,
          priority,
          COUNT(*) as count,
          COUNT(CASE WHEN is_read = true THEN 1 END) as read_count,
          AVG(EXTRACT(EPOCH FROM (read_at - created_at))::int) as avg_read_time_seconds
        FROM notifications
        WHERE org_id = $1 AND created_at >= $2
        GROUP BY type, priority
        ORDER BY count DESC
      `;

      const channelStatsQuery = `
        SELECT
          jsonb_array_elements_text(channels) as channel,
          COUNT(*) as count
        FROM notifications
        WHERE org_id = $1 AND created_at >= $2
        GROUP BY channel
        ORDER BY count DESC
      `;

      const [statsResult, channelStatsResult] = await Promise.all([
        req.pool.query(statsQuery, [organization.id, cutoffDate]),
        req.pool.query(channelStatsQuery, [organization.id, cutoffDate]),
      ]);

      const response: ApiResponse = {
        success: true,
        data: {
          period: `Last ${daysBack} days`,
          statistics: statsResult.rows,
          channelStats: channelStatsResult.rows,
          summary: {
            totalNotifications: statsResult.rows.reduce((sum, row) => sum + parseInt(row.count), 0),
            readRate: statsResult.rows.length > 0
              ? (statsResult.rows.reduce((sum, row) => sum + parseInt(row.read_count), 0) /
                 statsResult.rows.reduce((sum, row) => sum + parseInt(row.count), 0) * 100).toFixed(2) + '%'
              : '0%',
            avgReadTime: statsResult.rows.length > 0
              ? Math.round(statsResult.rows.reduce((sum, row) => sum + (parseFloat(row.avg_read_time_seconds) || 0), 0) / statsResult.rows.length) + 's'
              : '0s',
          },
        },
      };

      logger.logUserActivity(
        user.id,
        organization.id,
        'viewed notification statistics',
        { period: daysBack },
        req.ip
      );

      res.json(response);
    } catch (error) {
      logger.error('Error getting notification statistics', error);

      const response: ApiResponse = {
        success: false,
        error: 'Failed to retrieve notification statistics',
      };

      res.status(500).json(response);
    }
  }
}