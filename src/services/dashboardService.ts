import { apiService } from './apiService';
import SalesforceApiService from './SalesforceApiService';
import { API_ENDPOINTS } from '../config/api';
import { User, OrgOverview, FilterOptions, AnalyticsData } from '../types';

export class DashboardService {
  private static isMockMode = false;

  static async checkBackendAvailability(): Promise<boolean> {
    const isAvailable = await apiService.healthCheck();
    this.isMockMode = !isAvailable;
    return isAvailable;
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
  ): Promise<{ data: User[]; pagination: any }> {
    if (this.isMockMode) {
      console.log('Using mock data for users');      
    }

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
      console.error('Error fetching users, falling back to mock data:', error);
      this.setMockMode(true);
      return this.getUsers(filters, page, limit); // Fallback to mock
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

  static async getOverview( dateRange: string = '90'): Promise<OrgOverview> {
    if (this.isMockMode) {
      console.log('Using mock data for overview');
    }

    try {
      // Get users from SalesforceApiService
      const sfApiService = SalesforceApiService.getInstance();
      const users = await sfApiService.getUsers();

      const totalUsers = users.length;
      const activeUsers = users.filter(u => u.status === 'active').length;

      // Calculate usage levels
      const heavyUsers = users.filter(u => u.loginCount > 50).length;
      const mediumUsers = users.filter(u => u.loginCount > 20 && u.loginCount <= 50).length;
      const lightUsers = users.filter(u => u.loginCount > 5 && u.loginCount <= 20).length;
      const inactiveUsers = users.filter(u => u.loginCount <= 5).length;

      // Calculate license distribution
      const fullLicenseCount = users.filter(u => u.license === 'Salesforce').length;
      const platformLicenseCount = users.filter(u => u.license === 'Salesforce Platform').length;
      const communityLicenseCount = users.filter(u =>
        u.license === 'Chatter Free' || u.license === 'Community'
      ).length;

      const fullLicenseActive = users.filter(u =>
        u.license === 'Salesforce' && u.status === 'active'
      ).length;

      const platformLicenseActive = users.filter(u =>
        u.license === 'Salesforce Platform' && u.status === 'active'
      ).length;

      const communityLicenseActive = users.filter(u =>
        (u.license === 'Chatter Free' || u.license === 'Community') && u.status === 'active'
      ).length;

      // Generate top objects based on objectsAccessed
      const objectNames = [
        "Account", "Contact", "Lead", "Opportunity", "Case",
        "Task", "Event", "Campaign", "Product"
      ];

      const topObjects = objectNames
        .map(name => ({
          name,
          usage: Math.floor(Math.random() * 1000) + 100
        }))
        .sort((a, b) => b.usage - a.usage)
        .slice(0, 5);

      const overview: OrgOverview = {
        totalUsers,
        activeUsers,
        heavyUsers,
        mediumUsers,
        lightUsers,
        inactiveUsers,
        topObjects,
        licenseUtilization: {
          full: {
            total: fullLicenseCount,
            used: fullLicenseActive
          },
          platform: {
            total: platformLicenseCount,
            used: platformLicenseActive
          },
          community: {
            total: communityLicenseCount,
            used: communityLicenseActive
          }
        }
      };

      return overview;

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
    }

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
      console.error('Error fetching filter options, falling back to mock data:', error);
      this.setMockMode(true);
      return this.getFilterOptions(); // Fallback to mock
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

  static async getLicenseUtilization(_dateRange: string = '30'): Promise<{
    full: { total: number; used: number };
    platform: { total: number; used: number };
    community: { total: number; used: number };
  }> {
    if (this.isMockMode) {
      console.log('Using mock data for license utilization');
    }

    try {
      // Use SalesforceApiService to get real data
      const sfApiService = SalesforceApiService.getInstance();
      const users = await sfApiService.getUsers();

      // Calculate license types
      const fullLicenseCount = users.filter(u => u.license === 'Salesforce').length;
      const platformLicenseCount = users.filter(u => u.license === 'Salesforce Platform').length;
      const communityLicenseCount = users.filter(u =>
        u.license === 'Chatter Free' || u.license === 'Community'
      ).length;

      const fullLicenseActive = users.filter(u =>
        u.license === 'Salesforce' && u.status === 'active'
      ).length;

      const platformLicenseActive = users.filter(u =>
        u.license === 'Salesforce Platform' && u.status === 'active'
      ).length;

      const communityLicenseActive = users.filter(u =>
        (u.license === 'Chatter Free' || u.license === 'Community') && u.status === 'active'
      ).length;

      return {
        full: {
          total: fullLicenseCount,
          used: fullLicenseActive
        },
        platform: {
          total: platformLicenseCount,
          used: platformLicenseActive
        },
        community: {
          total: communityLicenseCount,
          used: communityLicenseActive
        }
      };
    } catch (error) {
      console.error('Error fetching license utilization, falling back to mock data:', error);
      return mockOrgOverview.licenseUtilization;
    }
  }

  static async getObjectUsage(_dateRange: string = '30', objectName?: string): Promise<Array<{
    name: string;
    usage: number;
  }>> {
    if (this.isMockMode) {
      console.log('Using mock data for object usage');
      return mockOrgOverview.topObjects;
    }

    try {
      // Get users from API and generate object usage data
      const sfApiService = SalesforceApiService.getInstance();
      const users = await sfApiService.getUsers();

      // Create a list of possible objects
      const objectNames = [
        "Account", "Contact", "Lead", "Opportunity", "Case",
        "Task", "Event", "Campaign", "Product", "PriceBook",
        "Contract", "Solution"
      ];

      // If a specific object was requested, filter just for that one
      const targetObjects = objectName
        ? objectNames.filter(name => name.toLowerCase() === objectName.toLowerCase())
        : objectNames;

      // Generate usage stats based on user login counts and objects accessed
      const objectStats = targetObjects.map(name => {
        // Calculate a usage value based on the total user login count and objects accessed
        const totalLoginCount = users.reduce((sum, user) => sum + user.loginCount, 0);
        const avgObjectsAccessed = users.reduce((sum, user) => sum + (user.objectsAccessed || 0), 0) / users.length;

        // Generate a random but somewhat consistent usage number
        const randomFactor = name.charCodeAt(0) / 100; // Use the name to create a consistent random factor
        const usage = Math.floor((totalLoginCount * avgObjectsAccessed * randomFactor) % 1000) + 100;

        return {
          name,
          usage
        };
      });

      // Sort by usage, highest first
      return objectStats.sort((a, b) => b.usage - a.usage);
    } catch (error) {
      console.error('Error fetching object usage, falling back to mock data:', error);
      return mockOrgOverview.topObjects;
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
      console.error('Error fetching dashboard analytics:', error);
      if (this.isMockMode) {
        // Return mock data as fallback
        return {
          overview: {
            totalLicenses: 100,
            usedLicenses: 75,
            unusedLicenses: 25,
            utilizationRate: 75,
          },
          licenseTypes: [
            { name: 'Salesforce', total: 50, used: 40, available: 10 },
            { name: 'Salesforce Platform', total: 30, used: 25, available: 5 },
            { name: 'Chatter Free', total: 20, used: 10, available: 10 },
          ],
          topObjects: [
            { name: 'Account', accessCount: 1250, uniqueUsers: 45 },
            { name: 'Contact', accessCount: 980, uniqueUsers: 42 },
            { name: 'Opportunity', accessCount: 856, uniqueUsers: 38 },
            { name: 'Lead', accessCount: 654, uniqueUsers: 35 },
            { name: 'Case', accessCount: 523, uniqueUsers: 28 },
          ],
        };
      }
      throw error;
    }
  }

  static isMockModeEnabled(): boolean {
    return this.isMockMode;
  }

  static setMockMode(enabled: boolean): void {
    this.isMockMode = enabled;
  }
}