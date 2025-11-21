import { Router } from 'express';
import { AnalyticsController } from '../controllers/AnalyticsController';

const router = Router();

router.get('/overview', AnalyticsController.getOverview);
router.get('/top-objects', AnalyticsController.getTopObjects);
router.get('/license-utilization', AnalyticsController.getLicenseUtilization);
export default router;