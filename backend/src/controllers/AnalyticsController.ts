import { Request, Response } from 'express';
import SalesforceDataService from '../services/SalesforceDataService';
import { logger } from '../utils/logger';

export class AnalyticsController {
  /**
   * GET /api/analytics/overview
   */
  static async getOverview(req: Request, res: Response): Promise<void> {
    try {
      const sfService = SalesforceDataService.getInstance();
      logger.info('🔄 Generating org overview');

      const users = await sfService.getUsers();

      // calculated same as the example previously added
      const overview = AnalyticsController.computeOverviewFromUsers(users);

      res.json({ success: true, data: overview });
    } catch (err) {
      logger.error('❌ Error generating org overview', err);
      res.status(500).json({ success: false, error: (err as Error)?.message || 'Unexpected error' });
    }
  }

  /**
   * GET /api/analytics/top-objects
   * Returns top objects list using Record Counts (works in all orgs)
   */
  static async getTopObjects(req: Request, res: Response): Promise<void> {
    try {
      const sfService = SalesforceDataService.getInstance();

      logger.info(`🔄 Fetching top objects by record count`);

      // Use Record Counts (Works in all orgs) instead of Event Logs
      const objectCounts = await sfService.getStandardObjectCounts();

      const topObjects = Array.from(objectCounts.entries())
        .map(([name, usage]) => ({ name, usage }))
        .sort((a, b) => b.usage - a.usage)
        .slice(0, 10);

      res.json({
        success: true,
        data: topObjects,
        isRealData: true 
      });
    } catch (err) {
      logger.error('❌ Error generating top objects', err);
      res.status(500).json({ success: false, error: (err as Error)?.message || 'Unexpected error' });
    }
  }

  /**
   * GET /api/analytics/license-utilization
   */
  static async getLicenseUtilization(req: Request, res: Response): Promise<void> {
    try {
      const sfService = SalesforceDataService.getInstance();
      const users = await sfService.getUsers();

      const licenseUtilization = {
        full: { total: 0, used: 0 },
        platform: { total: 0, used: 0 },
        community: { total: 0, used: 0 },
      };

      users.forEach(u => {
        const license = u.license || 'Salesforce';
        if (license.includes('Chatter') || license.includes('Community')) { 
          licenseUtilization.community.total += 1;
          if (u.status === 'active') licenseUtilization.community.used += 1;
        } else if (license.includes('Platform')) {
          licenseUtilization.platform.total += 1;
          if (u.status === 'active') licenseUtilization.platform.used += 1;
        } else {
          licenseUtilization.full.total += 1;
          if (u.status === 'active') licenseUtilization.full.used += 1;
        }
      });

      res.json({ success: true, data: licenseUtilization });
    } catch (err) {
      logger.error('❌ Error generating license utilization', err);
      res.status(500).json({ success: false, error: (err as Error)?.message || 'Unexpected error' });
    }
  }

  /**
   * Compute overview helper - now uses real login counts
   */
  private static computeOverviewFromUsers(users: any[]) {
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.status === 'active').length;

    // ✅ Now using real loginCount from LoginHistory
    const heavyUsers = users.filter(u => (u.loginCount || 0) > 50).length;
    const mediumUsers = users.filter(u => (u.loginCount || 0) > 20 && (u.loginCount || 0) <= 50).length;
    const lightUsers = users.filter(u => (u.loginCount || 0) > 5 && (u.loginCount || 0) <= 20).length;
    const inactiveUsers = users.filter(u => (u.loginCount || 0) <= 5).length;

    // License calculations (unchanged)
    const fullLicenseCount = users.filter(u => u.license === 'Salesforce').length;
    const platformLicenseCount = users.filter(u => u.license === 'Salesforce Platform').length;
    const communityLicenseCount = users.filter(u => u.license === 'Chatter Free' || u.license === 'Community').length;

    const fullLicenseActive = users.filter(u => u.license === 'Salesforce' && u.status === 'active').length;
    const platformLicenseActive = users.filter(u => u.license === 'Salesforce Platform' && u.status === 'active').length;
    const communityLicenseActive = users.filter(u => (u.license === 'Chatter Free' || u.license === 'Community') && u.status === 'active').length;

    // Top objects - simplified since getTopObjects handles this separately now
    const topObjects = users
      .map(u => ({
        name: u.username || 'Unknown',
        usage: u.objectsAccessed || 0
      }))
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 5);

    logger.info(`📊 Overview computed: ${totalUsers} total, ${activeUsers} active, ${heavyUsers} heavy users`);

    return {
      totalUsers,
      activeUsers,
      heavyUsers,
      mediumUsers,
      lightUsers,
      inactiveUsers,
      topObjects,
      licenseUtilization: {
        full: { total: fullLicenseCount, used: fullLicenseActive },
        platform: { total: platformLicenseCount, used: platformLicenseActive },
        community: { total: communityLicenseCount, used: communityLicenseActive },
      },
    };
  }
}