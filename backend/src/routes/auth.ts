import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';

const router = Router();

// POST /api/auth/login - Authenticate with Salesforce
router.post('/login', AuthController.login);

// GET /api/auth/status - Check authentication status
router.get('/status', AuthController.getAuthStatus);

// POST /api/auth/logout - Logout
router.post('/logout', AuthController.logout);

export default router;