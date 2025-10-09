import { Router } from 'express';
import { NotificationController } from '../controllers/NotificationController';
import { authenticate, requireAdmin } from '../middleware/auth';
import { createUserLimiter } from '../middleware/rateLimiting';

const router = Router();

// All notification routes require authentication
router.use(authenticate);

// Get user notifications
router.get('/', NotificationController.getNotifications);

// Mark notification as read
router.patch('/:id/read', NotificationController.markAsRead);

// Update notification preferences
router.put(
  '/preferences',
  NotificationController.validateNotificationPreferences,
  NotificationController.updatePreferences
);

// Send test notification
router.post(
  '/test',
  createUserLimiter(5, 60 * 1000), // 5 tests per minute
  NotificationController.sendTestNotification
);

// Webhook management (admin only)
router.post(
  '/webhooks',
  requireAdmin,
  createUserLimiter(10, 60 * 60 * 1000), // 10 webhook operations per hour
  NotificationController.validateWebhook,
  NotificationController.registerWebhook
);

router.delete(
  '/webhooks',
  requireAdmin,
  NotificationController.removeWebhook
);

router.post(
  '/webhooks/test',
  requireAdmin,
  createUserLimiter(5, 60 * 1000), // 5 webhook tests per minute
  NotificationController.testWebhook
);

// Notification statistics (admin only)
router.get(
  '/stats',
  requireAdmin,
  NotificationController.getNotificationStats
);

export default router;