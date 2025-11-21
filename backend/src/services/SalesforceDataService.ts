import SalesforceAuthService from './SalesforceAuthService';
import { logger } from '../utils/logger';
import { User } from '../types';

interface SalesforceUser {
  attributes: {
    type: string;
    url: string;
  };
  Id: string;
  Name: string;
  Username: string;
  Email: string;
  IsActive: boolean;
  ProfileId: string;
  Profile?: {
    attributes: {
      type: string;
      url: string;
    };
    Name: string;
  } | null;
  UserRole?: {
    attributes: {
      type: string;
      url: string;
    };
    Name: string;
  } | null;
}

interface SalesforceUserResponse {
  totalSize: number;
  done: boolean;
  records: SalesforceUser[];
}

class SalesforceDataService {
  private static instance: SalesforceDataService;
  private authService: SalesforceAuthService;

  private constructor() {
    this.authService = SalesforceAuthService.getInstance();
  }

  public static getInstance(): SalesforceDataService {
    if (!SalesforceDataService.instance) {
      SalesforceDataService.instance = new SalesforceDataService();
    }
    return SalesforceDataService.instance;
  }

  // Backwards-compatible static wrappers for older call sites
  static async fullSync(userId: string) {
    return SalesforceDataService.getInstance().getUsers();
  }

  static async syncUsers(userId: string) {
    return SalesforceDataService.getInstance().getUsers();
  }

  static async syncLicenseUtilization(userId: string) {
    // Placeholder - real implementation would call license-specific endpoints
    return [];
  }

  static async processEventLogFiles(userId: string) {
    // Placeholder - no-op for now
    return;
  }

  /**
   * Get all Salesforce users using the exact query you provided
   */
  async getUsers(): Promise<User[]> {
    try {
      logger.info('🔄 Fetching Salesforce users...');

      // Use the exact SOQL query from your curl command
      const query = `SELECT Id,Name,Username,Email,IsActive,ProfileId,Profile.Name,UserRole.Name FROM User ORDER BY Name`;
      const encodedQuery = encodeURIComponent(query);
      const endpoint = `/services/data/v61.0/query?q=${encodedQuery}`;

      const response: SalesforceUserResponse = await this.authService.makeApiCall(endpoint);

      logger.info(`✅ Successfully fetched ${response.totalSize} users from Salesforce`);

      // Transform Salesforce users to your application format
      const transformedUsers = this.transformUsers(response.records);

      return transformedUsers;
    } catch (error) {
      logger.error('❌ Error fetching Salesforce users:', error);
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User> {
    try {
      logger.info(`🔄 Fetching user with ID: ${userId}`);

      const query = `SELECT Id,Name,Username,Email,IsActive,ProfileId,Profile.Name,UserRole.Name FROM User WHERE Id = '${userId}'`;
      const encodedQuery = encodeURIComponent(query);
      const endpoint = `/services/data/v61.0/query?q=${encodedQuery}`;

      const response: SalesforceUserResponse = await this.authService.makeApiCall(endpoint);

      if (response.totalSize === 0) {
        throw new Error(`User with ID ${userId} not found`);
      }

      const transformedUsers = this.transformUsers(response.records);
      return transformedUsers[0];
    } catch (error) {
      logger.error(`❌ Error fetching user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get user summary statistics
   */
  async getUserSummary(): Promise<any> {
    try {
      logger.info('🔄 Fetching user summary...');

      // Get total user count
      const totalUsersQuery = `SELECT COUNT() FROM User`;
      const totalUsersResponse = await this.authService.makeApiCall(
        `/services/data/v61.0/query?q=${encodeURIComponent(totalUsersQuery)}`
      );

      // Get active user count
      const activeUsersQuery = `SELECT COUNT() FROM User WHERE IsActive = true`;
      const activeUsersResponse = await this.authService.makeApiCall(
        `/services/data/v61.0/query?q=${encodeURIComponent(activeUsersQuery)}`
      );

      // Get users by profile
      const profileQuery = `SELECT Profile.Name, COUNT(Id) FROM User WHERE IsActive = true GROUP BY Profile.Name`;
      const profileResponse = await this.authService.makeApiCall(
        `/services/data/v61.0/query?q=${encodeURIComponent(profileQuery)}`
      );

      const summary = {
        totalUsers: totalUsersResponse.totalSize,
        activeUsers: activeUsersResponse.totalSize,
        inactiveUsers: totalUsersResponse.totalSize - activeUsersResponse.totalSize,
        utilizationRate: totalUsersResponse.totalSize > 0
          ? (activeUsersResponse.totalSize / totalUsersResponse.totalSize) * 100
          : 0,
        profileDistribution: profileResponse.records || [],
      };

      logger.info('✅ User summary fetched successfully');
      return summary;
    } catch (error) {
      logger.error('❌ Error fetching user summary:', error);
      throw error;
    }
  }

  /**
   * Transform Salesforce users to application User format
   */
  private transformUsers(salesforceUsers: SalesforceUser[]): User[] {
    return salesforceUsers.map(sfUser => {
      // Determine license type based on profile
      const profileName = sfUser.Profile?.Name || 'Unknown';
      let license = 'Salesforce';

      if (profileName.includes('Chatter')) {
        license = 'Chatter Free';
      } else if (profileName.includes('Integration')) {
        license = 'Integration';
      } else if (profileName.includes('Analytics')) {
        license = 'Analytics';
      } else if (profileName.includes('System Administrator')) {
        license = 'Salesforce Platform';
      }

      return {
        id: sfUser.Id,
        name: sfUser.Name,
        username: sfUser.Username,
        email: sfUser.Email,
        status: sfUser.IsActive ? 'active' : 'inactive',
        license: license,
        profile: profileName,
        role: sfUser.UserRole?.Name || 'No Role',
        lastLogin: new Date().toISOString(), // You can enhance this with actual last login data
        loginCount: Math.floor(Math.random() * 100), // Mock data - you can enhance this
        objectsAccessed: Math.floor(Math.random() * 20), // Mock data - you can enhance this
      };
    });
  }

  /**
   * Get filter options for users
   */
  async getFilterOptions(): Promise<any> {
    try {
      logger.info('🔄 Fetching filter options...');

      const users = await this.getUsers();

      const licenses = [...new Set(users.map(u => u.license))];
      const profiles = [...new Set(users.map(u => u.profile))];
      const roles = [...new Set(users.map(u => u.role))];
      const statuses = [...new Set(users.map(u => u.status))];

      return {
        licenses,
        profiles,
        roles,
        statuses,
      };
    } catch (error) {
      logger.error('❌ Error fetching filter options:', error);
      throw error;
    }
  }

  /**
   * Get record counts for standard objects (Alternative to EventLogFile)
   */
  async getStandardObjectCounts(): Promise<Map<string, number>> {
    const objects = ['Account', 'Contact', 'Opportunity', 'Lead', 'Case', 'Task', 'Campaign', 'Product2'];
    const counts = new Map<string, number>();

    logger.info('🔄 Fetching record counts for standard objects...');

    // Run queries in parallel
    await Promise.all(objects.map(async (objName) => {
      try {
        // SOQL Count query is very fast
        const query = `SELECT COUNT() FROM ${objName}`;
        const endpoint = `/services/data/v61.0/query?q=${encodeURIComponent(query)}`;

        const response = await this.authService.makeApiCall(endpoint);
        counts.set(objName, response.totalSize || 0);
      } catch (err) {
        logger.warn(`⚠️ Could not count ${objName}`, err);
        counts.set(objName, 0);
      }
    }));

    return counts;
  }
}

export default SalesforceDataService;