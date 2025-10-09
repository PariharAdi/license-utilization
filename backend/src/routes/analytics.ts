import { Router } from 'express';
import { AnalyticsController } from '../controllers/AnalyticsController';
import { authenticate, validateSalesforceToken } from '../middleware/auth';

const router = Router();

// All routes require authentication and valid Salesforce tokens
router.use(authenticate);
router.use(validateSalesforceToken);

// Basic analytics routes
router.get('/overview', AnalyticsController.getOverview);
router.get('/licenses', AnalyticsController.getLicenseUtilization);
router.get('/objects', AnalyticsController.getObjectUsage);
router.get('/users/:userId/activity', AnalyticsController.getUserActivity);

// Advanced analytics routes
router.get('/trends', AnalyticsController.getTrendAnalysis);
router.get('/patterns', AnalyticsController.getUsagePatterns);
router.get('/recommendations', AnalyticsController.getOptimizationRecommendations);

export default router;