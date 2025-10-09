import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { authenticate, validateOrgAccess } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// User routes
router.get('/', UserController.getUsers);
router.get('/summary', UserController.getUserSummary);
router.get('/filters', UserController.getFilterOptions);
router.get('/export', UserController.exportUsers);
router.get('/:userId', validateOrgAccess, UserController.getUser);

export default router;