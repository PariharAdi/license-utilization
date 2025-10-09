import { Router } from 'express';
import { JobController } from '../controllers/JobController';
import { authenticate, requireAdmin } from '../middleware/auth';
import { syncLimiter, createUserLimiter } from '../middleware/rateLimiting';

const router = Router();

// All job routes require authentication
router.use(authenticate);

// Get job statistics (admin only)
router.get('/stats', requireAdmin, JobController.getJobStats);

// Get system health (available to all authenticated users)
router.get('/health', JobController.getSystemHealth);

// Manual job triggers (admin only with rate limiting)
router.post('/sync', requireAdmin, syncLimiter, JobController.triggerSync);
router.post('/report', requireAdmin, createUserLimiter(5, 60 * 60 * 1000), JobController.triggerReport); // 5 reports per hour
router.post('/cleanup', requireAdmin, createUserLimiter(3, 60 * 60 * 1000), JobController.triggerCleanup); // 3 cleanups per hour

// Scheduled job management (admin only)
router.post('/schedule/:jobName/:action', requireAdmin, JobController.manageScheduledJob);

export default router;