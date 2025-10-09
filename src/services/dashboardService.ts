import { apiService } from './apiService';
import { API_ENDPOINTS } from '../config/api';
import { User, OrgOverview, FilterOptions } from '../types';
import { mockUsers, mockOrgOverview } from '../data/mockData';

export class DashboardService {
  private static isMockMode = false;

  static async checkBackendAvailability(): Promise<boolean> {
    const isAvailable = await apiService.healthCheck();
    this.isMockMode = !isAvailable;
    return isAvailable;
  }

  static async getUsers(
    filters: FilterOptions = {},
    page: number = 1,
    limit: number = 50
  ): Promise<{ data: User[]; pagination: any }> {
    if (this.isMockMode) {
      console.log('Using mock data for users');
      // Apply basic filtering to mock data
      let filteredUsers = [...mockUsers];

      if (filters.profile && filters.profile.length > 0) {
        filteredUsers = filteredUsers.filter(user =>
          filters.profile!.includes(user.profile)
        );
      }

      if (filters.licenseType && filters.licenseType.length > 0) {
        filteredUsers = filteredUsers.filter(user =>
          filters.licenseType!.includes(user.licenseType)
        );
      }

      if (filters.usageLevel && filters.usageLevel.length > 0) {
        filteredUsers = filteredUsers.filter(user =>
          filters.usageLevel!.includes(user.usageLevel)
        );
      }

      // Simple pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

      return {
        data: paginatedUsers,
        pagination: {
          page,
          limit,
          total: filteredUsers.length,
          totalPages: Math.ceil(filteredUsers.length / limit),
        },
      };
    }

    try {
      const response = await apiService.get(API_ENDPOINTS.users.list, {
        ...filters,
        page,
        limit,
      });

      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to fetch users');
      }
    } catch (error) {
      console.error('Error fetching users, falling back to mock data:', error);
      return this.getUsers(filters, page, limit); // Fallback to mock
    }
  }

  static async getOverview(dateRange: string = '90'): Promise<OrgOverview> {
    if (this.isMockMode) {
      console.log('Using mock data for overview');
      return mockOrgOverview;
    }

    try {
      const response = await apiService.get(API_ENDPOINTS.analytics.overview, {
        dateRange,
      });

      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to fetch overview');
      }
    } catch (error) {
      console.error('Error fetching overview, falling back to mock data:', error);
      return mockOrgOverview; // Fallback to mock
    }
  }

  static async getFilterOptions(): Promise<{
    profiles: string[];
    roles: string[];
    licenseTypes: string[];
    usageLevels: string[];
  }> {
    if (this.isMockMode) {
      console.log('Using mock data for filter options');
      const profiles = Array.from(new Set(mockUsers.map(user => user.profile)));
      const roles = Array.from(new Set(mockUsers.map(user => user.role)));
      const licenseTypes = Array.from(new Set(mockUsers.map(user => user.licenseType)));

      return {
        profiles,
        roles,
        licenseTypes,
        usageLevels: ['Heavy', 'Medium', 'Light', 'Inactive'],
      };
    }

    try {
      const response = await apiService.get(API_ENDPOINTS.users.filters);

      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to fetch filter options');
      }
    } catch (error) {
      console.error('Error fetching filter options, falling back to mock data:', error);
      return this.getFilterOptions(); // Fallback to mock
    }
  }

  static async exportUsers(
    filters: FilterOptions = {},
    format: string = 'csv'
  ): Promise<void> {
    if (this.isMockMode) {
      console.log('Using mock data for export');
      // Use the existing frontend export functionality
      const { exportToCSV } = await import('../utils/export');
      const { data } = await this.getUsers(filters, 1, 1000);
      exportToCSV(data);
      return;
    }

    try {
      await apiService.downloadFile(
        API_ENDPOINTS.users.export,
        `users-export-${new Date().toISOString().split('T')[0]}.${format}`,
        { ...filters, format }
      );
    } catch (error) {
      console.error('Error exporting users:', error);
      // Fallback to frontend export
      const { exportToCSV } = await import('../utils/export');
      const { data } = await this.getUsers(filters, 1, 1000);
      exportToCSV(data);
    }
  }

  static async refreshData(): Promise<void> {
    if (this.isMockMode) {
      console.log('Mock mode - no data to refresh');
      return;
    }

    try {
      // In a real implementation, this would trigger a data sync
      // For now, we'll just make a request to check if the backend is responsive
      await apiService.get(API_ENDPOINTS.analytics.overview);
      console.log('Data refresh completed');
    } catch (error) {
      console.error('Error refreshing data:', error);
      throw new Error('Failed to refresh data from Salesforce');
    }
  }

  static async getLicenseUtilization(dateRange: string = '30'): Promise<any> {
    if (this.isMockMode) {
      console.log('Using mock data for license utilization');
      return mockOrgOverview.licenseUtilization;
    }

    try {
      const response = await apiService.get(API_ENDPOINTS.analytics.licenses, {
        dateRange,
      });

      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to fetch license utilization');
      }
    } catch (error) {
      console.error('Error fetching license utilization, falling back to mock data:', error);
      return mockOrgOverview.licenseUtilization;
    }
  }

  static async getObjectUsage(dateRange: string = '30', objectName?: string): Promise<any> {
    if (this.isMockMode) {
      console.log('Using mock data for object usage');
      return mockOrgOverview.topObjects;
    }

    try {
      const response = await apiService.get(API_ENDPOINTS.analytics.objects, {
        dateRange,
        objectName,
      });

      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to fetch object usage');
      }
    } catch (error) {
      console.error('Error fetching object usage, falling back to mock data:', error);
      return mockOrgOverview.topObjects;
    }
  }

  static isMockModeEnabled(): boolean {
    return this.isMockMode;
  }

  static setMockMode(enabled: boolean): void {
    this.isMockMode = enabled;
  }
}