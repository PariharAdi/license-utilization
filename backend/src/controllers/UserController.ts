import { Request, Response } from 'express';
import { UserModel } from '../models/User';
import { ApiResponse, FilterOptions, PaginatedResponse, User } from '../types';

export class UserController {
  /**
   * Get all users for an organization
   * GET /api/users
   */
  static async getUsers(req: Request, res: Response): Promise<void> {
    try {
      const organization = req.organization;
      const {
        page = 1,
        limit = 50,
        profile,
        role,
        licenseType,
        usageLevel,
        dateRange,
        isActive,
        search,
      } = req.query as any;

      // Build filters
      const filters: FilterOptions = {};

      if (profile) {
        filters.profile = Array.isArray(profile) ? profile : [profile];
      }

      if (role) {
        filters.role = Array.isArray(role) ? role : [role];
      }

      if (licenseType) {
        filters.licenseType = Array.isArray(licenseType) ? licenseType : [licenseType];
      }

      if (usageLevel) {
        filters.usageLevel = Array.isArray(usageLevel) ? usageLevel : [usageLevel];
      }

      if (dateRange) {
        filters.dateRange = dateRange;
      }

      if (isActive !== undefined) {
        filters.isActive = isActive === 'true';
      }

      // Get paginated users
      const result = await UserModel.findByOrgId(
        organization.id,
        filters,
        parseInt(page),
        parseInt(limit)
      );

      const response: ApiResponse<PaginatedResponse<User>> = {
        success: true,
        data: result,
      };

      res.json(response);
    } catch (error) {
      console.error('Error getting users:', error);

      const response: ApiResponse = {
        success: false,
        error: 'Failed to retrieve users',
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get a specific user by ID
   * GET /api/users/:userId
   */
  static async getUser(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const organization = req.organization;

      const user = await UserModel.findById(userId);

      if (!user) {
        const response: ApiResponse = {
          success: false,
          error: 'User not found',
        };
        res.status(404).json(response);
        return;
      }

      // Verify user belongs to the same organization
      if (user.organizationId !== organization.id) {
        const response: ApiResponse = {
          success: false,
          error: 'Access denied',
        };
        res.status(403).json(response);
        return;
      }

      const response: ApiResponse<User> = {
        success: true,
        data: user,
      };

      res.json(response);
    } catch (error) {
      console.error('Error getting user:', error);

      const response: ApiResponse = {
        success: false,
        error: 'Failed to retrieve user',
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get user filter options
   * GET /api/users/filters
   */
  static async getFilterOptions(req: Request, res: Response): Promise<void> {
    try {
      const organization = req.organization;

      const [profiles, roles, licenseTypes] = await Promise.all([
        UserModel.getUniqueProfiles(organization.id),
        UserModel.getUniqueRoles(organization.id),
        UserModel.getUniqueLicenseTypes(organization.id),
      ]);

      const response: ApiResponse = {
        success: true,
        data: {
          profiles,
          roles,
          licenseTypes,
          usageLevels: ['Heavy', 'Medium', 'Light', 'Inactive'],
          dateRanges: [
            { value: '90', label: 'Last 90 days' },
            { value: '180', label: 'Last 180 days' },
            { value: '365', label: 'Last 365 days' },
          ],
        },
      };

      res.json(response);
    } catch (error) {
      console.error('Error getting filter options:', error);

      const response: ApiResponse = {
        success: false,
        error: 'Failed to retrieve filter options',
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get user counts summary
   * GET /api/users/summary
   */
  static async getUserSummary(req: Request, res: Response): Promise<void> {
    try {
      const organization = req.organization;

      const counts = await UserModel.getUserCounts(organization.id);

      const response: ApiResponse = {
        success: true,
        data: counts,
      };

      res.json(response);
    } catch (error) {
      console.error('Error getting user summary:', error);

      const response: ApiResponse = {
        success: false,
        error: 'Failed to retrieve user summary',
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
      const organization = req.organization;
      const { format = 'csv' } = req.query as any;

      // Build filters from query parameters
      const filters: FilterOptions = {};
      // ... (same filter building logic as getUsers)

      // Get all users (no pagination for export)
      const result = await UserModel.findByOrgId(
        organization.id,
        filters,
        1,
        10000 // Large limit for export
      );

      if (format === 'csv') {
        // Generate CSV
        const csvHeaders = [
          'Name',
          'Email',
          'Username',
          'Profile',
          'Role',
          'License Type',
          'Is Active',
          'Last Login',
          'Created At',
        ];

        const csvRows = result.data.map(user => [
          `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          user.email,
          user.username,
          user.profileName || '',
          user.userRoleName || '',
          user.licenseType || '',
          user.isActive ? 'Yes' : 'No',
          user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : '',
          new Date(user.createdAt).toLocaleDateString(),
        ]);

        const csvContent = [
          csvHeaders.join(','),
          ...csvRows.map(row =>
            row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
          ),
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="users-export.csv"');
        res.send(csvContent);
      } else {
        // Return JSON for other formats
        const response: ApiResponse = {
          success: true,
          data: result.data,
        };

        res.json(response);
      }
    } catch (error) {
      console.error('Error exporting users:', error);

      const response: ApiResponse = {
        success: false,
        error: 'Failed to export users',
      };

      res.status(500).json(response);
    }
  }
}