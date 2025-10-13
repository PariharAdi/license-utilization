import { Request, Response } from 'express';
import SalesforceDataService from '../services/SalesforceDataService';
import { logger } from '../utils/logger';
import { ApiResponse } from '../types';

const salesforceService = SalesforceDataService.getInstance();

export class AnalyticsController {
  /**
   * Get analytics overview
   * GET /api/analytics/overview
   */
  static async getOverview(req: Request, res: Response): Promise<void> {
    try {
      const users = await salesforceService.getUsers();

      const totalUsers = users.length;
      const activeUsers = users.filter(u => u.status === 'active').length;
      const inactiveUsers = totalUsers - activeUsers;

      const licenseDistribution = users.reduce((acc, user) => {
        acc[user.license] = (acc[user.license] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const licenseTypes = Object.entries(licenseDistribution).map(([name, total]) => {
        const used = users.filter(u => u.license === name && u.status === 'active').length;
        return {
          name,
          total,
          used,
          available: total - used,
        };
      });

      // Mock data for top objects (enhance with actual Salesforce object tracking)
      const topObjects = [
        { name: 'Account', accessCount: 1250, uniqueUsers: 45 },
        { name: 'Contact', accessCount: 980, uniqueUsers: 42 },
        { name: 'Opportunity', accessCount: 856, uniqueUsers: 38 },
        { name: 'Lead', accessCount: 654, uniqueUsers: 35 },
        { name: 'Case', accessCount: 523, uniqueUsers: 28 },
      ];

      const response: ApiResponse = {
        success: true,
        data: {
          totalLicenses: totalUsers,
          activeLicenses: activeUsers,
          inactiveLicenses: inactiveUsers,
          utilizationRate: totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0,
          licenseUtilization: {
            salesforce: { total: totalUsers, used: activeUsers, available: inactiveUsers },
          },
          topObjects,
          licenseTypes,
        }
      };

      res.json(response);
    } catch (error) {
      logger.error('Error fetching analytics overview:', error);

      const response: ApiResponse = {
        success: false,
        error: 'Failed to retrieve analytics overview',
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get license utilization data
   * GET /api/analytics/licenses
   */
  static async getLicenseUtilization(req: Request, res: Response): Promise<void> {
    try {
      const users = await salesforceService.getUsers();

      const licenseDistribution = users.reduce((acc, user) => {
        acc[user.license] = (acc[user.license] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const response: ApiResponse = {
        success: true,
        data: licenseDistribution
      };

      res.json(response);
    } catch (error) {
      logger.error('Error fetching license utilization:', error);

      const response: ApiResponse = {
        success: false,
        error: 'Failed to retrieve license utilization data',
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get object usage data
   * GET /api/analytics/objects
   */
  static async getObjectUsage(req: Request, res: Response): Promise<void> {
    try {
      // Mock data for now (you can enhance this with actual Salesforce object tracking)
      const topObjects = [
        { name: 'Account', accessCount: 1250, uniqueUsers: 45 },
        { name: 'Contact', accessCount: 980, uniqueUsers: 42 },
        { name: 'Opportunity', accessCount: 856, uniqueUsers: 38 },
        { name: 'Lead', accessCount: 654, uniqueUsers: 35 },
        { name: 'Case', accessCount: 523, uniqueUsers: 28 },
      ];

      const response: ApiResponse = {
        success: true,
        data: topObjects
      };

      res.json(response);
    } catch (error) {
      logger.error('Error fetching object usage:', error);

      const response: ApiResponse = {
        success: false,
        error: 'Failed to retrieve object usage data',
      };

      res.status(500).json(response);
    }
  }
}