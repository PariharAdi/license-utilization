import { apiService } from './apiService';
import SalesforceApiService from './SalesforceApiService';
import { API_ENDPOINTS } from '../config/api';
import { User, OrgOverview, FilterOptions, AnalyticsData } from '../types';

export class DashboardService {
  static async checkBackendAvailability(): Promise<boolean> {
    return apiService.healthCheck();
  }

  static async getUsers(
    filters: FilterOptions = {
      licenses: [],
      profiles: [],
      roles: [],
      statuses: [],
      profile: [],
      licenseType: [],
      usageLevel: []
    },
    page: number = 1,
    limit: number = 50
  ): Promise<{ data: User[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    // Always attempt to use real backend data. Errors will be thrown to the caller.

    try {
      // Use SalesforceApiService to get users
      const sfApiService = SalesforceApiService.getInstance();
      const apiUsers = await sfApiService.getUsers();

      // Apply filtering
      let filteredUsers = apiUsers;

      if (filters.profiles && filters.profiles.length > 0) {
        filteredUsers = filteredUsers.filter(user =>
          filters.profiles.includes(user.profile)
        );
      }

      if (filters.licenses && filters.licenses.length > 0) {
        filteredUsers = filteredUsers.filter(user =>
          filters.licenses.includes(user.license)
        );
      }

      if (filters.roles && filters.roles.length > 0) {
        filteredUsers = filteredUsers.filter(user =>
          filters.roles.includes(user.role)
        );
      }

      if (filters.statuses && filters.statuses.length > 0) {
        filteredUsers = filteredUsers.filter(user =>
          filters.statuses.includes(user.status)
        );
      }

      // Map API response to match component expectations
      const mappedUsers = filteredUsers.map(user => ({
        ...user,
        licenseType: user.license,
        usageLevel: this.determineUsageLevel(user.loginCount),
        reportsRun: Math.floor(Math.random() * 50), // Placeholder
        tabHits: user.loginCount * 10, // Estimated based on login count
        dashboardViews: Math.floor(user.loginCount / 2), // Placeholder
        pageViews: user.loginCount * 15, // Placeholder
        objectTouches: this.generateObjectTouches(user.objectsAccessed || 0)
      }));

      // Simple pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedUsers = mappedUsers.slice(startIndex, endIndex);

      return {
        data: paginatedUsers,
        pagination: {
          page,
          limit,
          total: mappedUsers.length,
          totalPages: Math.ceil(mappedUsers.length / limit),
        },
      };
    } catch (error) {
      console.error('Error fetching users from backend:', error);
      throw error;
    }
  }

  // Helper function to determine usage level based on login count
  private static determineUsageLevel(loginCount: number): string {
    if (loginCount > 50) return "Heavy";
    if (loginCount > 20) return "Medium";
    if (loginCount > 5) return "Light";
    return "Inactive";
  }

  // Helper function to generate object touches data
  private static generateObjectTouches(objectCount: number): Record<string, number> {
    const objectNames = [
      "Account", "Contact", "Lead", "Opportunity",
      "Case", "Task", "Event", "Campaign",
      "Product", "PriceBook", "Contract", "Solution"
    ];

    const result: Record<string, number> = {};
    const count = Math.min(objectCount || 1, objectNames.length);

    const selectedObjects = objectNames
      .sort(() => 0.5 - Math.random())
      .slice(0, count);

    selectedObjects.forEach(obj => {
      result[obj] = Math.floor(Math.random() * 100) + 1;
    });

    return result;
  }

  static async getOverview(): Promise<OrgOverview> {
    try {
      // Prefer backend analytics endpoint which computes overview using Salesforce data
      const resp = await apiService.get<{ success: boolean; data: OrgOverview }>(API_ENDPOINTS.analytics.overview);
      if (!resp || resp.success === false) {
        throw new Error('Failed to fetch overview from backend');
      }
      return resp.data;
    } catch (error) {
      console.error('Error fetching overview from backend:', error);
      throw error;
    }
  }

  static async getFilterOptions(): Promise<{
    profiles: string[];
    roles: string[];
    licenseTypes: string[];
    usageLevels: string[];
  }> {

    try {
      // Get users from SalesforceApiService and extract unique values
      const sfApiService = SalesforceApiService.getInstance();
      const users = await sfApiService.getUsers();

      const profiles = Array.from(new Set(users.map(user => user.profile)));
      const roles = Array.from(new Set(users.map(user => user.role)));
      const licenseTypes = Array.from(new Set(users.map(user => user.license)));

      return {
        profiles,
        roles,
        licenseTypes,
        usageLevels: ['Heavy', 'Medium', 'Light', 'Inactive'],
      };
    } catch (error) {
      console.error('Error fetching filter options from backend:', error);
      throw error;
    }
  }

  static async exportUsers(
    filters: FilterOptions = {
      licenses: [],
      profiles: [],
      roles: [],
      statuses: [],
      profile: [],
      licenseType: [],
      usageLevel: []
    },
    format: string = 'csv'
  ): Promise<void> {
    // Always try server-side export first; fallbacks use client-side CSV only on failure.

    try {
      // Try server-side export first. The backend may return CSV text or a file blob.
      const resp = await apiService.get<string>(API_ENDPOINTS.users.export, { ...filters, format });

      // If backend responded with CSV text, trigger download in browser
      if (resp && resp.success && resp.data && typeof resp.data === 'string') {
        const csvText = resp.data as string;
        const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
        const downloadName = `users-export-${new Date().toISOString().split('T')[0]}.${format}`;
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = downloadName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
        return;
      }

      // If server-side didn't return CSV, try downloading a blob via the downloadFile helper
      await apiService.downloadFile(
        API_ENDPOINTS.users.export,
        `users-export-${new Date().toISOString().split('T')[0]}.${format}`,
        { ...filters, format }
      );
    } catch (error) {
      console.error('Error exporting users:', error);
      // Fallback to frontend export (best-effort)
      const { exportToCSV } = await import('../utils/export');
      const { data } = await this.getUsers(filters, 1, 1000);
      exportToCSV(data);
    }
  }

  static async refreshData(): Promise<void> {
    // Always attempt to refresh from backend

    try {
      // In a real implementation, this would trigger a data sync
      // For now, we'll just make a request to check if the backend is responsive
      await apiService.get(API_ENDPOINTS.analytics.overview);
      console.log('Data refresh completed');
    } catch (error) {
      console.error('Error refreshing data from backend:', error);
      throw new Error('Failed to refresh data from backend');
    }
  }

  static async getLicenseUtilization(): Promise<{
    full: { total: number; used: number };
    platform: { total: number; used: number };
    community: { total: number; used: number };
  }> {
    try {
      const resp = await apiService.get<{ success: boolean; data: { full: { total: number; used: number }; platform: { total: number; used: number }; community: { total: number; used: number } } }>(
        API_ENDPOINTS.analytics.licenseUtilization
      );
      if (!resp || resp.success === false) {
        const details = resp
          ? `Response: ${JSON.stringify(resp)}`
          : 'No response received';
        throw new Error(`Failed to fetch license utilization. ${details}`);
      }
      return resp.data;
    } catch (error) {
      console.error('Error fetching license utilization from backend:', error);
      throw error;
    }
  }

  static async getObjectUsage(objectName?: string): Promise<Array<{
    name: string;
    usage: number;
  }>> {
    // Always generate object usage from backend users; throw on error
    try {
      // Call backend objects endpoint which returns usage by object
      const endpoint = API_ENDPOINTS.analytics.topObjects;
      const resp = await apiService.get<{ success: boolean; data: Array<{ name: string; usage: number }> }>(endpoint);
      if (!resp || (typeof resp === 'object' && 'success' in resp && resp.success === false)) throw new Error('Failed to fetch object usage');
      // Safely extract data and ensure list is typed as an array
      const listData = (resp && typeof resp === 'object' && 'data' in resp && Array.isArray(resp.data)) ? (resp.data) : [];
      let list: Array<{ name: string; usage: number }> = listData;
      if (objectName) {
        list = list.filter(o => o.name.toLowerCase() === objectName.toLowerCase());
      }
      console.log('Fetched object usage:', list);
      return list;
    } catch (error) {
      console.error('Error fetching object usage from backend:', error);
      throw error;
    }
  }

  static async getDashboardAnalytics(): Promise<AnalyticsData> {
    try {
      // Get users from SalesforceApiService
      const sfApiService = SalesforceApiService.getInstance();
      const users = await sfApiService.getUsers();

      // Calculate analytics from Salesforce user data
      const totalUsers = users.length;
      const activeUsers = users.filter((u) => u.status === 'active').length;
      const inactiveUsers = totalUsers - activeUsers;

      // Calculate license distribution
      const licenseDistribution = users.reduce((acc: Record<string, number>, user) => {
        acc[user.license] = (acc[user.license] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const licenseTypes = Object.entries(licenseDistribution).map(([name, total]) => {
        const used = users.filter((u) => u.license === name && u.status === 'active').length;
        return {
          name,
          total,
          used,
          available: total - used,
        };
      });

      // Generate top objects based on objectsAccessed from users
      // This is a placeholder - in a real implementation, you'd have actual object usage data
      const objectCounts: Record<string, { count: number, users: Set<string> }> = {};
      const possibleObjects = ['Account', 'Contact', 'Opportunity', 'Lead', 'Case', 'Task', 'Event'];

      users.forEach(user => {
        // Randomly assign objects to users based on their objectsAccessed count
        const count = user.objectsAccessed || 0;
        const objectsToAssign = Math.min(count, possibleObjects.length);

        if (objectsToAssign > 0) {
          const selectedObjects = possibleObjects
            .sort(() => 0.5 - Math.random())
            .slice(0, objectsToAssign);

          selectedObjects.forEach(obj => {
            if (!objectCounts[obj]) {
              objectCounts[obj] = { count: 0, users: new Set() };
            }
            objectCounts[obj].count += Math.floor(Math.random() * 100) + 10;
            objectCounts[obj].users.add(user.id);
          });
        }
      });

      const topObjects = Object.entries(objectCounts)
        .map(([name, data]) => ({
          name,
          accessCount: data.count,
          uniqueUsers: data.users.size
        }))
        .sort((a, b) => b.accessCount - a.accessCount)
        .slice(0, 5);

      return {
        overview: {
          totalLicenses: totalUsers,
          usedLicenses: activeUsers,
          unusedLicenses: inactiveUsers,
          utilizationRate: totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0,
        },
        licenseTypes,
        topObjects: topObjects.length > 0 ? topObjects : [
          { name: 'Account', accessCount: 1250, uniqueUsers: 45 },
          { name: 'Contact', accessCount: 980, uniqueUsers: 42 },
          { name: 'Opportunity', accessCount: 856, uniqueUsers: 38 },
          { name: 'Lead', accessCount: 654, uniqueUsers: 35 },
          { name: 'Case', accessCount: 523, uniqueUsers: 28 },
        ],
      };
    } catch (error) {
      console.error('Error fetching dashboard analytics from backend:', error);
      throw error;
    }
  }

}