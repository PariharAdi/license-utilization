import { Request, Response } from 'express';
import SalesforceAuthService from '../services/SalesforceAuthService';
import SalesforceDataService from '../services/SalesforceDataService';
import { logger } from '../utils/logger';
import { ApiResponse } from '../types';

const authService = SalesforceAuthService.getInstance();
const salesforceService = SalesforceDataService.getInstance();

export class AuthController {
  /**
   * Authenticate with Salesforce and return user data
   * POST /api/auth/login
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Starting Salesforce authentication...');

      // Force authentication by getting user data
      const users = await salesforceService.getUsers();

      logger.info(`Successfully authenticated and fetched ${users.length} users`);

      const response: ApiResponse = {
        success: true,
        message: 'Successfully authenticated with Salesforce',
        data: {
          authenticated: true,
          userCount: users.length,
          timestamp: new Date(),
        }
      };

      res.json(response);
    } catch (error) {
      logger.error('Salesforce authentication failed:', error);

      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to authenticate with Salesforce',
      };

      res.status(401).json(response);
    }
  }

  /**
   * Health check for authentication
   * GET /api/auth/status
   */
  static async getAuthStatus(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Checking authentication status...');

      const isTokenValid = authService.isTokenValid();

      logger.info(`Authentication status: ${isTokenValid}`);

      const response: ApiResponse = {
        success: true,
        data: {
          authenticated: isTokenValid,
          timestamp: new Date(),
        }
      };

      res.json(response);
    } catch (error) {
      logger.error('Error checking auth status:', error);

      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check authentication status',
      };

      res.status(500).json(response);
    }
  }

  /**
   * Logout - clear Salesforce token
   * POST /api/auth/logout
   */
  static async logout(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Logging out...');

      authService.clearToken();

      logger.info('Logout successful');

      const response: ApiResponse = {
        success: true,
        message: 'Logged out successfully',
      };

      res.json(response);
    } catch (error) {
      logger.error('Error during logout:', error);

      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to logout',
      };

      res.status(500).json(response);
    }
  }
}