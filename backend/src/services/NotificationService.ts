import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';
import { pool } from '../config/database';
import { redis } from '../config/database';

export interface NotificationPayload {
  userId?: string;
  organizationId: string;
  type: 'license_threshold' | 'inactive_users' | 'sync_complete' | 'error_alert' | 'system_alert';
  title: string;
  message: string;
  data?: any;
  priority: 'low' | 'medium' | 'high' | 'critical';
  channels: ('email' | 'websocket' | 'webhook')[];
}

export interface WebhookPayload {
  event: string;
  timestamp: string;
  organizationId: string;
  data: any;
}

class NotificationServiceManager {
  private io: SocketIOServer | null = null;
  private emailTransporter: nodemailer.Transporter | null = null;
  private webhooks: Map<string, string[]> = new Map(); // orgId -> webhook URLs

  initialize(httpServer: HTTPServer): void {
    // Initialize Socket.IO
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    this.setupSocketHandlers();
    this.initializeEmailService();
    this.loadWebhooks();

    logger.info('Notification service initialized');
  }

  private setupSocketHandlers(): void {
    if (!this.io) return;

    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        // Verify JWT token and get user info
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.data.userId = decoded.userId;
        socket.data.organizationId = decoded.organizationId;

        logger.info(`WebSocket client authenticated: ${decoded.userId}`);
        next();
      } catch (error) {
        logger.error('WebSocket authentication failed', error);
        next(new Error('Authentication failed'));
      }
    });

    this.io.on('connection', (socket) => {
      const { userId, organizationId } = socket.data;

      // Join organization room for targeted notifications
      socket.join(`org:${organizationId}`);
      socket.join(`user:${userId}`);

      logger.info(`WebSocket client connected: ${userId} (org: ${organizationId})`);

      // Handle client events
      socket.on('subscribe_notifications', async (preferences) => {
        try {
          await this.updateNotificationPreferences(userId, preferences);
          socket.emit('subscription_updated', { success: true });
        } catch (error) {
          logger.error('Failed to update notification preferences', error);
          socket.emit('subscription_updated', { success: false, error: error.message });
        }
      });

      socket.on('mark_notification_read', async (notificationId) => {
        try {
          await this.markNotificationAsRead(userId, notificationId);
          socket.emit('notification_marked_read', { notificationId, success: true });
        } catch (error) {
          logger.error('Failed to mark notification as read', error);
          socket.emit('notification_marked_read', { notificationId, success: false });
        }
      });

      socket.on('disconnect', (reason) => {
        logger.info(`WebSocket client disconnected: ${userId} (reason: ${reason})`);
      });
    });
  }

  private async initializeEmailService(): Promise<void> {
    try {
      this.emailTransporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'localhost',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      // Test email configuration
      if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        await this.emailTransporter.verify();
        logger.info('Email service initialized and verified');
      } else {
        logger.warn('Email service not configured - email notifications disabled');
      }
    } catch (error) {
      logger.error('Failed to initialize email service', error);
      this.emailTransporter = null;
    }
  }

  private async loadWebhooks(): Promise<void> {
    try {
      const query = `
        SELECT org_id, webhook_urls
        FROM organization_webhooks
        WHERE is_active = true
      `;
      const result = await pool.query(query);

      for (const row of result.rows) {
        this.webhooks.set(row.org_id, JSON.parse(row.webhook_urls));
      }

      logger.info(`Loaded webhooks for ${this.webhooks.size} organizations`);
    } catch (error) {
      logger.error('Failed to load webhooks', error);
    }
  }

  async sendNotification(payload: NotificationPayload): Promise<void> {
    try {
      // Store notification in database
      const notificationId = await this.storeNotification(payload);

      // Send through requested channels
      const promises = payload.channels.map(async (channel) => {
        switch (channel) {
          case 'websocket':
            return this.sendWebSocketNotification(payload);
          case 'email':
            return this.sendEmailNotification(payload);
          case 'webhook':
            return this.sendWebhookNotification(payload);
        }
      });

      await Promise.allSettled(promises);

      logger.info(`Notification sent: ${payload.type}`, {
        organizationId: payload.organizationId,
        userId: payload.userId,
        channels: payload.channels,
        notificationId,
      });
    } catch (error) {
      logger.error('Failed to send notification', error, { payload });
      throw error;
    }
  }

  private async storeNotification(payload: NotificationPayload): Promise<string> {
    const query = `
      INSERT INTO notifications (
        user_id, org_id, type, title, message,
        data, priority, channels, created_at, is_read
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), false)
      RETURNING id
    `;

    const result = await pool.query(query, [
      payload.userId,
      payload.organizationId,
      payload.type,
      payload.title,
      payload.message,
      JSON.stringify(payload.data || {}),
      payload.priority,
      JSON.stringify(payload.channels),
    ]);

    return result.rows[0].id;
  }

  private async sendWebSocketNotification(payload: NotificationPayload): Promise<void> {
    if (!this.io) return;

    const notification = {
      id: Date.now().toString(),
      type: payload.type,
      title: payload.title,
      message: payload.message,
      data: payload.data,
      priority: payload.priority,
      timestamp: new Date().toISOString(),
    };

    if (payload.userId) {
      // Send to specific user
      this.io.to(`user:${payload.userId}`).emit('notification', notification);
    } else {
      // Send to all users in organization
      this.io.to(`org:${payload.organizationId}`).emit('notification', notification);
    }

    // Store in Redis for offline users
    await this.storeOfflineNotification(payload.userId || payload.organizationId, notification);
  }

  private async sendEmailNotification(payload: NotificationPayload): Promise<void> {
    if (!this.emailTransporter) {
      logger.warn('Email transporter not available');
      return;
    }

    try {
      const recipients = await this.getEmailRecipients(payload.userId, payload.organizationId);

      for (const recipient of recipients) {
        const emailContent = this.generateEmailContent(payload, recipient);

        await this.emailTransporter.sendMail({
          from: process.env.SMTP_FROM || 'noreply@licensetracker.com',
          to: recipient.email,
          subject: `[License Tracker] ${payload.title}`,
          html: emailContent.html,
          text: emailContent.text,
        });

        logger.info(`Email notification sent to ${recipient.email}`);
      }
    } catch (error) {
      logger.error('Failed to send email notification', error);
      throw error;
    }
  }

  private async sendWebhookNotification(payload: NotificationPayload): Promise<void> {
    const webhookUrls = this.webhooks.get(payload.organizationId);
    if (!webhookUrls || webhookUrls.length === 0) {
      return;
    }

    const webhookPayload: WebhookPayload = {
      event: payload.type,
      timestamp: new Date().toISOString(),
      organizationId: payload.organizationId,
      data: {
        title: payload.title,
        message: payload.message,
        priority: payload.priority,
        ...payload.data,
      },
    };

    const promises = webhookUrls.map(async (url) => {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'LicenseTracker-Webhooks/1.0',
          },
          body: JSON.stringify(webhookPayload),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        logger.info(`Webhook notification sent to ${url}`);
      } catch (error) {
        logger.error(`Failed to send webhook to ${url}`, error);
        // Don't throw - we want to try other webhooks
      }
    });

    await Promise.allSettled(promises);
  }

  private async getEmailRecipients(userId?: string, organizationId?: string): Promise<any[]> {
    let query: string;
    let params: any[];

    if (userId) {
      query = `
        SELECT email, username
        FROM users
        WHERE id = $1 AND is_active = true AND email_notifications = true
      `;
      params = [userId];
    } else {
      query = `
        SELECT email, username
        FROM users
        WHERE org_id = $1 AND is_active = true AND email_notifications = true
        AND (profile_name LIKE '%Administrator%' OR profile_name LIKE '%Manager%')
      `;
      params = [organizationId];
    }

    const result = await pool.query(query, params);
    return result.rows;
  }

  private generateEmailContent(payload: NotificationPayload, recipient: any): { html: string; text: string } {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .priority-${payload.priority} { border-left: 4px solid ${this.getPriorityColor(payload.priority)}; padding-left: 15px; }
            .footer { background: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #666; }
            .button { display: inline-block; background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Salesforce License Tracker</h1>
          </div>
          <div class="content">
            <h2>Hello ${recipient.username},</h2>
            <div class="priority-${payload.priority}">
              <h3>${payload.title}</h3>
              <p>${payload.message}</p>
            </div>
            <p>
              <a href="${baseUrl}/dashboard" class="button">View Dashboard</a>
            </p>
          </div>
          <div class="footer">
            <p>This is an automated notification from Salesforce License Tracker.</p>
            <p>To modify your notification preferences, visit your account settings.</p>
          </div>
        </body>
      </html>
    `;

    const text = `
      Salesforce License Tracker Notification

      Hello ${recipient.username},

      ${payload.title}
      ${payload.message}

      View your dashboard: ${baseUrl}/dashboard

      ---
      This is an automated notification from Salesforce License Tracker.
      To modify your notification preferences, visit your account settings.
    `;

    return { html, text };
  }

  private getPriorityColor(priority: string): string {
    switch (priority) {
      case 'critical': return '#dc2626';
      case 'high': return '#ea580c';
      case 'medium': return '#ca8a04';
      case 'low': return '#16a34a';
      default: return '#6b7280';
    }
  }

  private async storeOfflineNotification(key: string, notification: any): Promise<void> {
    try {
      const redisKey = `offline_notifications:${key}`;
      await redis.lpush(redisKey, JSON.stringify(notification));
      await redis.ltrim(redisKey, 0, 99); // Keep last 100 notifications
      await redis.expire(redisKey, 7 * 24 * 60 * 60); // Expire after 7 days
    } catch (error) {
      logger.error('Failed to store offline notification', error);
    }
  }

  private async updateNotificationPreferences(userId: string, preferences: any): Promise<void> {
    const query = `
      UPDATE users
      SET notification_preferences = $1
      WHERE id = $2
    `;
    await pool.query(query, [JSON.stringify(preferences), userId]);
  }

  private async markNotificationAsRead(userId: string, notificationId: string): Promise<void> {
    const query = `
      UPDATE notifications
      SET is_read = true, read_at = NOW()
      WHERE id = $1 AND user_id = $2
    `;
    await pool.query(query, [notificationId, userId]);
  }

  // Public methods for webhook management
  async registerWebhook(organizationId: string, webhookUrl: string): Promise<void> {
    try {
      const query = `
        INSERT INTO organization_webhooks (org_id, webhook_urls, is_active, created_at)
        VALUES ($1, $2, true, NOW())
        ON CONFLICT (org_id)
        DO UPDATE SET webhook_urls = $2, updated_at = NOW()
      `;

      const existingUrls = this.webhooks.get(organizationId) || [];
      const updatedUrls = [...new Set([...existingUrls, webhookUrl])];

      await pool.query(query, [organizationId, JSON.stringify(updatedUrls)]);
      this.webhooks.set(organizationId, updatedUrls);

      logger.info(`Webhook registered for organization: ${organizationId}`);
    } catch (error) {
      logger.error('Failed to register webhook', error);
      throw error;
    }
  }

  async removeWebhook(organizationId: string, webhookUrl: string): Promise<void> {
    try {
      const existingUrls = this.webhooks.get(organizationId) || [];
      const updatedUrls = existingUrls.filter(url => url !== webhookUrl);

      if (updatedUrls.length === 0) {
        await pool.query('DELETE FROM organization_webhooks WHERE org_id = $1', [organizationId]);
        this.webhooks.delete(organizationId);
      } else {
        const query = `
          UPDATE organization_webhooks
          SET webhook_urls = $1, updated_at = NOW()
          WHERE org_id = $2
        `;
        await pool.query(query, [JSON.stringify(updatedUrls), organizationId]);
        this.webhooks.set(organizationId, updatedUrls);
      }

      logger.info(`Webhook removed for organization: ${organizationId}`);
    } catch (error) {
      logger.error('Failed to remove webhook', error);
      throw error;
    }
  }

  async getNotifications(userId: string, limit: number = 50): Promise<any[]> {
    const query = `
      SELECT id, type, title, message, data, priority, created_at, is_read
      FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;

    const result = await pool.query(query, [userId, limit]);
    return result.rows.map(row => ({
      ...row,
      data: JSON.parse(row.data),
    }));
  }

  // Graceful shutdown
  async shutdown(): Promise<void> {
    if (this.io) {
      this.io.close();
    }

    if (this.emailTransporter) {
      this.emailTransporter.close();
    }

    logger.info('Notification service shut down');
  }
}

export const notificationService = new NotificationServiceManager();