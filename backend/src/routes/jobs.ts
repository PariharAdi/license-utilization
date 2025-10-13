import { Router } from 'express';
import { JobController } from '../controllers/JobController';

const router = Router();

// GET /api/jobs/stats - Get job queue statistics
router.get('/stats', JobController.getJobStats);

// POST /api/jobs/sync - Trigger manual data sync
router.post('/sync', JobController.triggerSync);

// POST /api/jobs/report - Trigger manual report generation
router.post('/report', JobController.triggerReport);

// POST /api/jobs/cleanup - Trigger manual cleanup
router.post('/cleanup', JobController.triggerCleanup);

// POST /api/jobs/schedule/:jobName/:action - Manage scheduled jobs
router.post('/schedule/:jobName/:action', JobController.manageScheduledJob);

// GET /api/jobs/health - Get system health status
router.get('/health', JobController.getSystemHealth);

export default router;