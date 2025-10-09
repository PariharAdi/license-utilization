import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { authenticate, optionalAuthenticate } from '../middleware/auth';

const router = Router();

// Public routes
router.get('/salesforce', AuthController.initiateSalesforceAuth);
router.get('/salesforce/callback', AuthController.handleSalesforceCallback);
router.get('/status', optionalAuthenticate, AuthController.checkAuthStatus);

// Protected routes
router.get('/me', authenticate, AuthController.getCurrentUser);
router.post('/refresh', authenticate, AuthController.refreshToken);
router.post('/logout', optionalAuthenticate, AuthController.logout);

export default router;