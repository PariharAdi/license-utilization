import { Router } from 'express';
import { ReportController } from '../controllers/ReportController';
import { authenticate, validateSalesforceToken } from '../middleware/auth';

const router = Router();

// All routes require authentication and valid Salesforce tokens
router.use(authenticate);
router.use(validateSalesforceToken);

// Report generation routes
router.get('/pdf', ReportController.generatePDFReport);
router.get('/excel', ReportController.generateExcelReport);

export default router;