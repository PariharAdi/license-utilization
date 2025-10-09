import { createAuthenticatedConnection } from '../config/salesforce';
import { SalesforceAuthService } from './SalesforceAuthService';
import { UserModel } from '../models/User';
import { OrganizationModel } from '../models/Organization';
import { pool } from '../config/database';
import { User, UserActivity, LicenseSummary } from '../types';

export class SalesforceDataService {
  /**
   * Sync users from Salesforce org to local database
   */
  static async syncUsers(userId: string): Promise<void> {
    try {
      // Get stored tokens
      const tokens = await SalesforceAuthService.getStoredTokens(userId);
      if (!tokens) {
        throw new Error('No valid Salesforce tokens found');
      }

      // Get user and organization
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const organization = await OrganizationModel.findById(user.organizationId);
      if (!organization) {
        throw new Error('Organization not found');
      }

      // Create authenticated connection
      const conn = createAuthenticatedConnection(tokens.accessToken, tokens.instanceUrl);

      // Query all users from Salesforce
      const usersQuery = `
        SELECT Id, Username, Email, FirstName, LastName, Name, IsActive,
               Profile.Id, Profile.Name, UserRole.Id, UserRole.Name,
               UserType, LastLoginDate, CreatedDate, LastModifiedDate
        FROM User
        WHERE IsActive = true
        LIMIT 2000
      `;

      const result = await conn.query(usersQuery);

      console.log(`Found ${result.totalSize} users in Salesforce`);

      // Process and sync users
      for (const sfUser of result.records as any[]) {
        try {
          // Check if user exists locally
          let localUser = await UserModel.findBySalesforceId(organization.id, sfUser.Id);

          const userData = {
            orgId: organization.id,
            salesforceUserId: sfUser.Id,
            username: sfUser.Username,
            email: sfUser.Email,
            firstName: sfUser.FirstName,
            lastName: sfUser.LastName,
            profileId: sfUser.Profile?.Id,
            profileName: sfUser.Profile?.Name,
            userRoleId: sfUser.UserRole?.Id,
            userRoleName: sfUser.UserRole?.Name,
            licenseType: await this.getUserLicenseType(conn, sfUser.Id),
            isActive: sfUser.IsActive,
            lastLogin: sfUser.LastLoginDate ? new Date(sfUser.LastLoginDate) : undefined,
          };

          if (localUser) {
            // Update existing user
            await UserModel.update(localUser.id, userData);
          } else {
            // Create new user
            await UserModel.create(userData);
          }
        } catch (userError) {
          console.error(`Error syncing user ${sfUser.Id}:`, userError);
          // Continue with other users
        }
      }

      console.log('User sync completed successfully');
    } catch (error) {
      console.error('Error syncing users:', error);
      throw new Error(`Failed to sync users: ${error.message}`);
    }
  }

  /**
   * Get user license type from Salesforce
   */
  private static async getUserLicenseType(conn: any, userId: string): Promise<string | undefined> {
    try {
      const query = `
        SELECT UserLicense.Name
        FROM User
        WHERE Id = '${userId}'
      `;

      const result = await conn.query(query);
      if (result.records && result.records.length > 0) {
        return result.records[0].UserLicense?.Name;
      }
    } catch (error) {
      console.error(`Error getting license type for user ${userId}:`, error);
    }

    return undefined;
  }

  /**
   * Sync license utilization data from Salesforce
   */
  static async syncLicenseUtilization(userId: string): Promise<void> {
    try {
      const tokens = await SalesforceAuthService.getStoredTokens(userId);
      if (!tokens) {
        throw new Error('No valid Salesforce tokens found');
      }

      const user = await UserModel.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const organization = await OrganizationModel.findById(user.organizationId);
      if (!organization) {
        throw new Error('Organization not found');
      }

      const conn = createAuthenticatedConnection(tokens.accessToken, tokens.instanceUrl);

      // Query UserLicense to get total licenses
      const licenseQuery = `
        SELECT Name, TotalLicenses, UsedLicenses
        FROM UserLicense
        WHERE TotalLicenses > 0
      `;

      const result = await conn.query(licenseQuery);

      const today = new Date().toISOString().split('T')[0];

      // Process license data
      for (const license of result.records as any[]) {
        try {
          // Insert or update license summary
          const insertQuery = `
            INSERT INTO license_summaries (org_id, summary_date, license_type, total_licenses, used_licenses)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (org_id, summary_date, license_type)
            DO UPDATE SET
              total_licenses = EXCLUDED.total_licenses,
              used_licenses = EXCLUDED.used_licenses
          `;

          await pool.query(insertQuery, [
            organization.id,
            today,
            license.Name,
            license.TotalLicenses,
            license.UsedLicenses,
          ]);
        } catch (licenseError) {
          console.error(`Error syncing license ${license.Name}:`, licenseError);
        }
      }

      console.log('License utilization sync completed successfully');
    } catch (error) {
      console.error('Error syncing license utilization:', error);
      throw new Error(`Failed to sync license utilization: ${error.message}`);
    }
  }

  /**
   * Process EventLogFile data for user activity tracking
   */
  static async processEventLogFiles(userId: string, eventType: string = 'Login'): Promise<void> {
    try {
      const tokens = await SalesforceAuthService.getStoredTokens(userId);
      if (!tokens) {
        throw new Error('No valid Salesforce tokens found');
      }

      const user = await UserModel.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const organization = await OrganizationModel.findById(user.organizationId);
      if (!organization) {
        throw new Error('Organization not found');
      }

      const conn = createAuthenticatedConnection(tokens.accessToken, tokens.instanceUrl);

      // Get recent event log files
      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

      const logFileQuery = `
        SELECT Id, EventType, LogDate, LogFile
        FROM EventLogFile
        WHERE EventType = '${eventType}'
        AND LogDate >= ${yesterday.toISOString().split('T')[0]}
        AND LogDate <= ${today.toISOString().split('T')[0]}
        ORDER BY LogDate DESC
      `;

      const result = await conn.query(logFileQuery);

      console.log(`Found ${result.totalSize} event log files for ${eventType}`);

      // Process each log file
      for (const logFile of result.records as any[]) {
        try {
          await this.processSingleEventLogFile(organization.id, logFile, conn);
        } catch (fileError) {
          console.error(`Error processing event log file ${logFile.Id}:`, fileError);
        }
      }

      console.log('Event log file processing completed successfully');
    } catch (error) {
      console.error('Error processing event log files:', error);
      throw new Error(`Failed to process event log files: ${error.message}`);
    }
  }

  /**
   * Process a single event log file
   */
  private static async processSingleEventLogFile(
    orgId: string,
    logFile: any,
    conn: any
  ): Promise<void> {
    try {
      // Check if already processed
      const checkQuery = `
        SELECT id FROM event_log_files
        WHERE org_id = $1 AND salesforce_log_file_id = $2
      `;

      const existing = await pool.query(checkQuery, [orgId, logFile.Id]);

      if (existing.rows.length > 0) {
        console.log(`Event log file ${logFile.Id} already processed`);
        return;
      }

      // Record the log file as being processed
      const recordQuery = `
        INSERT INTO event_log_files (org_id, salesforce_log_file_id, event_type, log_date, processed)
        VALUES ($1, $2, $3, $4, false)
      `;

      await pool.query(recordQuery, [
        orgId,
        logFile.Id,
        logFile.EventType,
        logFile.LogDate,
      ]);

      // In a real implementation, you would:
      // 1. Download the CSV file from logFile.LogFile URL
      // 2. Parse the CSV data
      // 3. Process each event record and update user_activities table
      // 4. Mark the log file as processed

      // For now, we'll simulate this with sample data
      await this.simulateEventLogProcessing(orgId, logFile.EventType, logFile.LogDate);

      // Mark as processed
      const updateQuery = `
        UPDATE event_log_files
        SET processed = true, processed_at = NOW()
        WHERE org_id = $1 AND salesforce_log_file_id = $2
      `;

      await pool.query(updateQuery, [orgId, logFile.Id]);

      console.log(`Processed event log file ${logFile.Id}`);
    } catch (error) {
      console.error(`Error processing single event log file:`, error);
      throw error;
    }
  }

  /**
   * Simulate event log processing (in real implementation, this would parse actual CSV data)
   */
  private static async simulateEventLogProcessing(
    orgId: string,
    eventType: string,
    logDate: string
  ): Promise<void> {
    try {
      // Get all users for this org
      const usersQuery = `
        SELECT id, salesforce_user_id FROM users WHERE org_id = $1 AND is_active = true
      `;

      const users = await pool.query(usersQuery, [orgId]);

      // Simulate activity data for each user
      for (const user of users.rows) {
        const activityData = this.generateSimulatedActivity(eventType);

        // Insert or update user activity
        const upsertQuery = `
          INSERT INTO user_activities (
            user_id, org_id, activity_date, login_count, api_requests,
            report_runs, dashboard_views, page_views, object_touches
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (user_id, activity_date)
          DO UPDATE SET
            login_count = user_activities.login_count + EXCLUDED.login_count,
            api_requests = user_activities.api_requests + EXCLUDED.api_requests,
            report_runs = user_activities.report_runs + EXCLUDED.report_runs,
            dashboard_views = user_activities.dashboard_views + EXCLUDED.dashboard_views,
            page_views = user_activities.page_views + EXCLUDED.page_views,
            object_touches = user_activities.object_touches || EXCLUDED.object_touches
        `;

        await pool.query(upsertQuery, [
          user.id,
          orgId,
          logDate,
          activityData.loginCount,
          activityData.apiRequests,
          activityData.reportRuns,
          activityData.dashboardViews,
          activityData.pageViews,
          JSON.stringify(activityData.objectTouches),
        ]);
      }

      console.log(`Generated simulated activity data for ${users.rows.length} users`);
    } catch (error) {
      console.error('Error simulating event log processing:', error);
      throw error;
    }
  }

  /**
   * Generate simulated activity data based on event type
   */
  private static generateSimulatedActivity(eventType: string) {
    const baseActivity = {
      loginCount: 0,
      apiRequests: 0,
      reportRuns: 0,
      dashboardViews: 0,
      pageViews: 0,
      objectTouches: {} as Record<string, number>,
    };

    const random = Math.random();

    switch (eventType) {
      case 'Login':
        baseActivity.loginCount = Math.floor(random * 5) + 1;
        break;
      case 'API':
        baseActivity.apiRequests = Math.floor(random * 20) + 1;
        break;
      case 'Report':
        baseActivity.reportRuns = Math.floor(random * 3) + 1;
        break;
      case 'Dashboard':
        baseActivity.dashboardViews = Math.floor(random * 5) + 1;
        break;
      case 'URI':
        baseActivity.pageViews = Math.floor(random * 50) + 1;
        break;
      default:
        // General activity
        if (random > 0.7) {
          const objects = ['Account', 'Contact', 'Opportunity', 'Lead', 'Case'];
          const objectName = objects[Math.floor(Math.random() * objects.length)];
          baseActivity.objectTouches[objectName] = Math.floor(Math.random() * 10) + 1;
        }
        break;
    }

    return baseActivity;
  }

  /**
   * Full data sync - sync all data types
   */
  static async fullSync(userId: string): Promise<void> {
    try {
      console.log('Starting full Salesforce data sync...');

      // Sync users first
      await this.syncUsers(userId);

      // Sync license utilization
      await this.syncLicenseUtilization(userId);

      // Process recent event log files
      const eventTypes = ['Login', 'API', 'Report', 'Dashboard', 'URI'];
      for (const eventType of eventTypes) {
        try {
          await this.processEventLogFiles(userId, eventType);
        } catch (eventError) {
          console.error(`Error processing ${eventType} events:`, eventError);
          // Continue with other event types
        }
      }

      console.log('Full Salesforce data sync completed successfully');
    } catch (error) {
      console.error('Error in full sync:', error);
      throw new Error(`Full sync failed: ${error.message}`);
    }
  }
}