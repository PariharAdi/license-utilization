import { Router } from 'express';
import { AnalyticsController } from '../controllers/AnalyticsController';

const router = Router();

// GET /api/analytics/overview - Get analytics overview
router.get('/overview', AnalyticsController.getOverview);

// GET /api/analytics/licenses - Get license utilization
router.get('/licenses', AnalyticsController.getLicenseUtilization);

// GET /api/analytics/objects - Get object usage
router.get('/objects', AnalyticsController.getObjectUsage);

export default router;