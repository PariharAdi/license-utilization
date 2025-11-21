import { Router } from 'express';
import { UserController } from '../controllers/UserController';

const router = Router();

// GET /api/users - Get all users with optional filtering
router.get('/', UserController.getUsers);

// GET /api/users/summary - Get user summary
router.get('/summary', UserController.getUserSummary);

// GET /api/users/filters - Get filter options
router.get('/filters', UserController.getFilterOptions);

// GET /api/users/export - Export users to CSV
router.get('/export', UserController.exportUsers);

// GET /api/users/:userId - Get user by ID
router.get('/:userId', UserController.getUserById);

export default router;