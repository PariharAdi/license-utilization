import { Request, Response } from 'express';
import SalesforceDataService from '../services/SalesforceDataService';
import ExportCsv from '../services/ExportCsv';
import { logger } from '../utils/logger';
import { ApiResponse } from '../types';

const salesforceService = SalesforceDataService.getInstance();

export class UserController {
  /**
   * Get all users with optional filtering
   * GET /api/users
   */
  static async getUsers(req: Request, res: Response): Promise<void> {
    try {
      const { license, status, profile, role, limit, offset } = req.query;

      logger.info('🔄 Fetching users from Salesforce...');

      let users = await salesforceService.getUsers();

      // Apply filters
      if (license) {
        users = users.filter(user => user.license === license);
      }
      if (status) {
        users = users.filter(user => user.status === status);
      }
      if (profile) {
        users = users.filter(user => user.profile === profile);
      }
      if (role) {
        users = users.filter(user => user.role === role);
      }

      // Apply pagination
      const startIndex = offset ? parseInt(offset as string) : 0;
      const endIndex = limit ? startIndex + parseInt(limit as string) : users.length;
      const paginatedUsers = users.slice(startIndex, endIndex);

      const response: ApiResponse = {
        success: true,
        data: {
          data: paginatedUsers,
          total: users.length,
          filtered: paginatedUsers.length,
          pagination: {
            offset: startIndex,
            limit: endIndex - startIndex,
            hasMore: endIndex < users.length,
          }
        }
      };

      logger.info(`✅ Successfully returned ${paginatedUsers.length} users (${users.length} total)`);
      res.json(response);
    } catch (error) {
      logger.error('❌ Error fetching users:', error);

      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch users',
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get user by ID
   * GET /api/users/:userId
   */
  static async getUserById(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      logger.info(`🔄 Fetching user: ${userId}`);

      const user = await salesforceService.getUserById(userId);

      const response: ApiResponse = {
        success: true,
        data: user,
      };

      logger.info(`✅ Successfully returned user: ${user.name}`);
      res.json(response);
    } catch (error) {
      logger.error(`❌ Error fetching user ${req.params.userId}:`, error);

      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch user',
      };

      res.status(404).json(response);
    }
  }

  /**
   * Get user summary statistics
   * GET /api/users/summary
   */
  static async getUserSummary(req: Request, res: Response): Promise<void> {
    try {
      logger.info('🔄 Fetching user summary...');

      const summary = await salesforceService.getUserSummary();

      const response: ApiResponse = {
        success: true,
        data: summary,
      };

      logger.info('✅ Successfully returned user summary');
      res.json(response);
    } catch (error) {
      logger.error('❌ Error fetching user summary:', error);

      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch user summary',
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get filter options
   * GET /api/users/filters
   */
  static async getFilterOptions(req: Request, res: Response): Promise<void> {
    try {
      logger.info('🔄 Fetching filter options...');

      const options = await salesforceService.getFilterOptions();

      const response: ApiResponse = {
        success: true,
        data: options,
      };

      logger.info('✅ Successfully returned filter options');
      res.json(response);
    } catch (error) {
      logger.error('❌ Error fetching filter options:', error);

      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch filter options',
      };

      res.status(500).json(response);
    }
  }

  /**
   * Export users to CSV
   * GET /api/users/export
   */
  static async exportUsers(req: Request, res: Response): Promise<void> {
    try {
      logger.info('🔄 Exporting users to CSV...');
      const users = await salesforceService.getUsers();

      // Use ExportCsv service to stream CSV to response
      ExportCsv.sendToResponse(res, users, 'salesforce_users.csv');

      logger.info(`✅ Successfully exported ${users.length} users to CSV`);
    } catch (error) {
      logger.error('❌ Error exporting users:', error);

      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export users',
      };

      res.status(500).json(response);
    }
  }
}