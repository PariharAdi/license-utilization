import { Request, Response } from 'express';
import { pool } from '../config/database';
import { ApiResponse } from '../types';

export class AnalyticsController {
  /**
   * Get organization overview analytics
   * GET /api/analytics/overview
   */
  static async getOverview(req: Request, res: Response): Promise<void> {
    try {
      const organization = req.organization;
      const { dateRange = '90' } = req.query as { dateRange?: string };

      // Calculate date range
      const daysBack = parseInt(dateRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      // Get user counts
      const userCountsQuery = `
        SELECT
          COUNT(*) as total_users,
          COUNT(*) FILTER (WHERE is_active = true) as active_users,
          COUNT(*) FILTER (WHERE is_active = false) as inactive_users
        FROM users
        WHERE org_id = $1
      `;

      // Get license utilization
      const licenseQuery = `
        SELECT
          license_type,
          total_licenses,
          used_licenses,
          utilization_percent
        FROM license_summaries
        WHERE org_id = $1 AND summary_date = (
          SELECT MAX(summary_date)
          FROM license_summaries
          WHERE org_id = $1
        )
        ORDER BY license_type
      `;

      // Get top objects
      const topObjectsQuery = `
        SELECT
          object_name,
          SUM(total_interactions) as usage
        FROM object_usage_summaries
        WHERE org_id = $1 AND summary_date >= $2
        GROUP BY object_name
        ORDER BY usage DESC
        LIMIT 10
      `;

      // Get recent activity trends
      const activityTrendsQuery = `
        SELECT
          activity_date,
          SUM(login_count) as logins,
          SUM(api_requests) as api_requests,
          SUM(report_runs) as reports,
          SUM(dashboard_views) as dashboards,
          COUNT(DISTINCT user_id) as active_users
        FROM user_activities
        WHERE org_id = $1 AND activity_date >= $2
        GROUP BY activity_date
        ORDER BY activity_date DESC
        LIMIT 30
      `;

      const [userCounts, licenses, topObjects, activityTrends] = await Promise.all([
        pool.query(userCountsQuery, [organization.id]),
        pool.query(licenseQuery, [organization.id]),
        pool.query(topObjectsQuery, [organization.id, startDate.toISOString().split('T')[0]]),
        pool.query(activityTrendsQuery, [organization.id, startDate.toISOString().split('T')[0]]),
      ]);

      // Process license utilization
      const licenseUtilization = licenses.rows.reduce((acc, row) => {
        const licenseType = row.license_type.toLowerCase().replace(/\s+/g, '');
        acc[licenseType] = {
          total: row.total_licenses,
          used: row.used_licenses,
          utilization: row.utilization_percent,
        };
        return acc;
      }, {} as any);

      // Calculate usage levels based on recent activity
      const usageLevelsQuery = `
        SELECT
          CASE
            WHEN total_activity >= 100 THEN 'Heavy'
            WHEN total_activity >= 50 THEN 'Medium'
            WHEN total_activity >= 10 THEN 'Light'
            ELSE 'Inactive'
          END as usage_level,
          COUNT(*) as user_count
        FROM (
          SELECT
            u.id,
            COALESCE(SUM(
              ua.login_count + ua.api_requests + ua.report_runs +
              ua.dashboard_views + ua.page_views
            ), 0) as total_activity
          FROM users u
          LEFT JOIN user_activities ua ON u.id = ua.user_id
            AND ua.activity_date >= $2
          WHERE u.org_id = $1 AND u.is_active = true
          GROUP BY u.id
        ) user_activity_summary
        GROUP BY usage_level
      `;

      const usageLevels = await pool.query(usageLevelsQuery, [
        organization.id,
        startDate.toISOString().split('T')[0],
      ]);

      const usageLevelCounts = usageLevels.rows.reduce((acc, row) => {
        acc[row.usage_level.toLowerCase() + 'Users'] = parseInt(row.user_count);
        return acc;
      }, {
        heavyUsers: 0,
        mediumUsers: 0,
        lightUsers: 0,
        inactiveUsers: 0,
      });

      const response: ApiResponse = {
        success: true,
        data: {
          totalUsers: parseInt(userCounts.rows[0].total_users),
          activeUsers: parseInt(userCounts.rows[0].active_users),
          inactiveUsers: parseInt(userCounts.rows[0].inactive_users),
          ...usageLevelCounts,
          licenseUtilization,
          topObjects: topObjects.rows.map(row => ({
            name: row.object_name,
            usage: parseInt(row.usage),
          })),
          activityTrends: activityTrends.rows.map(row => ({
            date: row.activity_date,
            logins: parseInt(row.logins),
            apiRequests: parseInt(row.api_requests),
            reports: parseInt(row.reports),
            dashboards: parseInt(row.dashboards),
            activeUsers: parseInt(row.active_users),
          })),
        },
      };

      res.json(response);
    } catch (error) {
      console.error('Error getting overview analytics:', error);

      const response: ApiResponse = {
        success: false,
        error: 'Failed to retrieve analytics overview',
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get license utilization details
   * GET /api/analytics/licenses
   */
  static async getLicenseUtilization(req: Request, res: Response): Promise<void> {
    try {
      const organization = req.organization;
      const { dateRange = '30' } = req.query as { dateRange?: string };

      const daysBack = parseInt(dateRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      const query = `
        SELECT
          summary_date,
          license_type,
          total_licenses,
          used_licenses,
          utilization_percent
        FROM license_summaries
        WHERE org_id = $1 AND summary_date >= $2
        ORDER BY summary_date DESC, license_type
      `;

      const result = await pool.query(query, [
        organization.id,
        startDate.toISOString().split('T')[0],
      ]);

      // Group by license type for trend analysis
      const licenseData = result.rows.reduce((acc, row) => {
        const licenseType = row.license_type;
        if (!acc[licenseType]) {
          acc[licenseType] = [];
        }
        acc[licenseType].push({
          date: row.summary_date,
          total: row.total_licenses,
          used: row.used_licenses,
          utilization: row.utilization_percent,
        });
        return acc;
      }, {} as any);

      const response: ApiResponse = {
        success: true,
        data: licenseData,
      };

      res.json(response);
    } catch (error) {
      console.error('Error getting license utilization:', error);

      const response: ApiResponse = {
        success: false,
        error: 'Failed to retrieve license utilization',
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get object usage analytics
   * GET /api/analytics/objects
   */
  static async getObjectUsage(req: Request, res: Response): Promise<void> {
    try {
      const organization = req.organization;
      const { dateRange = '30', objectName } = req.query as {
        dateRange?: string;
        objectName?: string;
      };

      const daysBack = parseInt(dateRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      let query = `
        SELECT
          object_name,
          summary_date,
          total_interactions,
          unique_users,
          create_operations,
          read_operations,
          update_operations,
          delete_operations,
          view_operations
        FROM object_usage_summaries
        WHERE org_id = $1 AND summary_date >= $2
      `;

      const queryParams = [organization.id, startDate.toISOString().split('T')[0]];

      if (objectName) {
        query += ' AND object_name = $3';
        queryParams.push(objectName);
      }

      query += ' ORDER BY summary_date DESC, total_interactions DESC';

      const result = await pool.query(query, queryParams);

      const response: ApiResponse = {
        success: true,
        data: result.rows.map(row => ({
          objectName: row.object_name,
          date: row.summary_date,
          totalInteractions: parseInt(row.total_interactions),
          uniqueUsers: parseInt(row.unique_users),
          operations: {
            create: parseInt(row.create_operations),
            read: parseInt(row.read_operations),
            update: parseInt(row.update_operations),
            delete: parseInt(row.delete_operations),
            view: parseInt(row.view_operations),
          },
        })),
      };

      res.json(response);
    } catch (error) {
      console.error('Error getting object usage:', error);

      const response: ApiResponse = {
        success: false,
        error: 'Failed to retrieve object usage',
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get user activity details
   * GET /api/analytics/users/:userId/activity
   */
  static async getUserActivity(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const organization = req.organization;
      const { dateRange = '30' } = req.query as { dateRange?: string };

      const daysBack = parseInt(dateRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      const query = `
        SELECT
          ua.activity_date,
          ua.login_count,
          ua.api_requests,
          ua.report_runs,
          ua.dashboard_views,
          ua.page_views,
          ua.object_touches,
          u.username,
          u.email
        FROM user_activities ua
        JOIN users u ON ua.user_id = u.id
        WHERE ua.user_id = $1 AND ua.org_id = $2 AND ua.activity_date >= $3
        ORDER BY ua.activity_date DESC
      `;

      const result = await pool.query(query, [
        userId,
        organization.id,
        startDate.toISOString().split('T')[0],
      ]);

      if (result.rows.length === 0) {
        const response: ApiResponse = {
          success: false,
          error: 'User not found or no activity data available',
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: {
          user: {
            username: result.rows[0].username,
            email: result.rows[0].email,
          },
          activities: result.rows.map(row => ({
            date: row.activity_date,
            loginCount: parseInt(row.login_count),
            apiRequests: parseInt(row.api_requests),
            reportRuns: parseInt(row.report_runs),
            dashboardViews: parseInt(row.dashboard_views),
            pageViews: parseInt(row.page_views),
            objectTouches: row.object_touches || {},
          })),
        },
      };

      res.json(response);
    } catch (error) {
      console.error('Error getting user activity:', error);

      const response: ApiResponse = {
        success: false,
        error: 'Failed to retrieve user activity',
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get advanced trend analysis with predictions
   * GET /api/analytics/trends
   */
  static async getTrendAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const organization = req.organization;
      const { dateRange = '90', metric = 'usage' } = req.query as {
        dateRange?: string;
        metric?: string;
      };

      const daysBack = parseInt(dateRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      // Get historical data for trend analysis
      const trendsQuery = `
        WITH daily_metrics AS (
          SELECT
            ua.activity_date,
            COUNT(DISTINCT ua.user_id) as active_users,
            SUM(ua.login_count) as total_logins,
            SUM(ua.api_requests) as total_api_requests,
            SUM(ua.report_runs) as total_reports,
            SUM(ua.dashboard_views) as total_dashboards,
            AVG(ua.login_count + ua.api_requests + ua.report_runs + ua.dashboard_views) as avg_activity_per_user
          FROM user_activities ua
          WHERE ua.org_id = $1 AND ua.activity_date >= $2
          GROUP BY ua.activity_date
          ORDER BY ua.activity_date
        )
        SELECT
          activity_date,
          active_users,
          total_logins,
          total_api_requests,
          total_reports,
          total_dashboards,
          avg_activity_per_user,
          LAG(active_users, 1) OVER (ORDER BY activity_date) as prev_active_users,
          LAG(total_logins, 1) OVER (ORDER BY activity_date) as prev_logins
        FROM daily_metrics
      `;

      const trendsResult = await pool.query(trendsQuery, [
        organization.id,
        startDate.toISOString().split('T')[0],
      ]);

      // Calculate growth rates and trends
      const trendsData = trendsResult.rows.map(row => {
        const activeUsersGrowth = row.prev_active_users
          ? ((row.active_users - row.prev_active_users) / row.prev_active_users) * 100
          : 0;

        const loginsGrowth = row.prev_logins
          ? ((row.total_logins - row.prev_logins) / row.prev_logins) * 100
          : 0;

        return {
          date: row.activity_date,
          activeUsers: parseInt(row.active_users),
          totalLogins: parseInt(row.total_logins),
          totalApiRequests: parseInt(row.total_api_requests),
          totalReports: parseInt(row.total_reports),
          totalDashboards: parseInt(row.total_dashboards),
          avgActivityPerUser: parseFloat(row.avg_activity_per_user) || 0,
          activeUsersGrowth: parseFloat(activeUsersGrowth.toFixed(2)),
          loginsGrowth: parseFloat(loginsGrowth.toFixed(2)),
        };
      });

      // Simple linear regression for prediction
      const predictFutureUsage = (data: any[], metric: string, days: number = 7) => {
        if (data.length < 3) return [];

        const xValues = data.map((_, index) => index);
        const yValues = data.map(item => item[metric] || 0);

        // Calculate linear regression
        const n = data.length;
        const sumX = xValues.reduce((a, b) => a + b, 0);
        const sumY = yValues.reduce((a, b) => a + b, 0);
        const sumXY = xValues.reduce((acc, x, i) => acc + x * yValues[i], 0);
        const sumX2 = xValues.reduce((acc, x) => acc + x * x, 0);

        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        // Generate predictions
        const predictions = [];
        for (let i = 1; i <= days; i++) {
          const futureDate = new Date();
          futureDate.setDate(futureDate.getDate() + i);
          const predictedValue = Math.max(0, slope * (n + i - 1) + intercept);

          predictions.push({
            date: futureDate.toISOString().split('T')[0],
            predicted: Math.round(predictedValue),
            confidence: Math.max(0.5, 1 - (i * 0.1)), // Decreasing confidence over time
          });
        }

        return predictions;
      };

      const predictions = predictFutureUsage(trendsData, 'activeUsers');

      const response: ApiResponse = {
        success: true,
        data: {
          historical: trendsData,
          predictions,
          summary: {
            totalDays: trendsData.length,
            avgActiveUsers: trendsData.reduce((sum, day) => sum + day.activeUsers, 0) / trendsData.length,
            avgGrowthRate: trendsData
              .filter(day => !isNaN(day.activeUsersGrowth))
              .reduce((sum, day) => sum + day.activeUsersGrowth, 0) /
              trendsData.filter(day => !isNaN(day.activeUsersGrowth)).length,
            peakActivityDay: trendsData.reduce((max, day) =>
              day.totalLogins > max.totalLogins ? day : max
            ),
          },
        },
      };

      res.json(response);
    } catch (error) {
      console.error('Error getting trend analysis:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve trend analysis',
      });
    }
  }

  /**
   * Get usage patterns and insights
   * GET /api/analytics/patterns
   */
  static async getUsagePatterns(req: Request, res: Response): Promise<void> {
    try {
      const organization = req.organization;
      const { dateRange = '30' } = req.query as { dateRange?: string };

      const daysBack = parseInt(dateRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      // Analyze usage patterns by day of week and hour
      const patternsQuery = `
        WITH activity_patterns AS (
          SELECT
            EXTRACT(DOW FROM ua.activity_date) as day_of_week,
            EXTRACT(HOUR FROM ua.created_at) as hour_of_day,
            SUM(ua.login_count) as logins,
            SUM(ua.api_requests) as api_requests,
            COUNT(DISTINCT ua.user_id) as active_users
          FROM user_activities ua
          WHERE ua.org_id = $1 AND ua.activity_date >= $2
          GROUP BY day_of_week, hour_of_day
        )
        SELECT
          day_of_week,
          hour_of_day,
          logins,
          api_requests,
          active_users
        FROM activity_patterns
        ORDER BY day_of_week, hour_of_day
      `;

      // Get user behavior segmentation
      const segmentationQuery = `
        WITH user_segments AS (
          SELECT
            u.id,
            u.username,
            u.license_type,
            COALESCE(SUM(ua.login_count), 0) as total_logins,
            COALESCE(SUM(ua.api_requests), 0) as total_api_requests,
            COALESCE(SUM(ua.report_runs), 0) as total_reports,
            COUNT(DISTINCT ua.activity_date) as active_days,
            CASE
              WHEN COALESCE(SUM(ua.login_count + ua.api_requests + ua.report_runs + ua.dashboard_views), 0) >= 500 THEN 'Power User'
              WHEN COALESCE(SUM(ua.login_count + ua.api_requests + ua.report_runs + ua.dashboard_views), 0) >= 100 THEN 'Regular User'
              WHEN COALESCE(SUM(ua.login_count + ua.api_requests + ua.report_runs + ua.dashboard_views), 0) >= 10 THEN 'Casual User'
              ELSE 'Inactive User'
            END as user_segment
          FROM users u
          LEFT JOIN user_activities ua ON u.id = ua.user_id
            AND ua.activity_date >= $2
          WHERE u.org_id = $1 AND u.is_active = true
          GROUP BY u.id, u.username, u.license_type
        )
        SELECT
          user_segment,
          license_type,
          COUNT(*) as user_count,
          AVG(total_logins) as avg_logins,
          AVG(total_api_requests) as avg_api_requests,
          AVG(active_days) as avg_active_days
        FROM user_segments
        GROUP BY user_segment, license_type
        ORDER BY user_segment, license_type
      `;

      // Get object usage patterns
      const objectPatternsQuery = `
        SELECT
          object_name,
          SUM(total_interactions) as total_usage,
          AVG(unique_users) as avg_unique_users,
          SUM(create_operations) as total_creates,
          SUM(read_operations) as total_reads,
          SUM(update_operations) as total_updates,
          SUM(delete_operations) as total_deletes,
          ROUND(
            SUM(read_operations)::numeric / NULLIF(SUM(total_interactions), 0) * 100, 2
          ) as read_percentage
        FROM object_usage_summaries
        WHERE org_id = $1 AND summary_date >= $2
        GROUP BY object_name
        HAVING SUM(total_interactions) > 0
        ORDER BY total_usage DESC
        LIMIT 20
      `;

      const [patternsResult, segmentationResult, objectPatternsResult] = await Promise.all([
        pool.query(patternsQuery, [organization.id, startDate.toISOString().split('T')[0]]),
        pool.query(segmentationQuery, [organization.id, startDate.toISOString().split('T')[0]]),
        pool.query(objectPatternsQuery, [organization.id, startDate.toISOString().split('T')[0]]),
      ]);

      // Process activity patterns by day of week
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dailyPatterns = Array.from({ length: 7 }, (_, i) => ({
        day: dayNames[i],
        dayOfWeek: i,
        totalLogins: 0,
        totalApiRequests: 0,
        activeUsers: 0,
      }));

      patternsResult.rows.forEach(row => {
        const dayIndex = parseInt(row.day_of_week);
        if (dailyPatterns[dayIndex]) {
          dailyPatterns[dayIndex].totalLogins += parseInt(row.logins);
          dailyPatterns[dayIndex].totalApiRequests += parseInt(row.api_requests);
          dailyPatterns[dayIndex].activeUsers += parseInt(row.active_users);
        }
      });

      // Process hourly patterns (aggregate across all days)
      const hourlyPatterns = Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        totalLogins: 0,
        totalApiRequests: 0,
        activeUsers: 0,
      }));

      patternsResult.rows.forEach(row => {
        const hour = parseInt(row.hour_of_day || 12); // Default to noon if null
        if (hourlyPatterns[hour]) {
          hourlyPatterns[hour].totalLogins += parseInt(row.logins);
          hourlyPatterns[hour].totalApiRequests += parseInt(row.api_requests);
          hourlyPatterns[hour].activeUsers += parseInt(row.active_users);
        }
      });

      const response: ApiResponse = {
        success: true,
        data: {
          dailyPatterns,
          hourlyPatterns,
          userSegmentation: segmentationResult.rows.map(row => ({
            segment: row.user_segment,
            licenseType: row.license_type,
            userCount: parseInt(row.user_count),
            avgLogins: parseFloat(row.avg_logins) || 0,
            avgApiRequests: parseFloat(row.avg_api_requests) || 0,
            avgActiveDays: parseFloat(row.avg_active_days) || 0,
          })),
          objectPatterns: objectPatternsResult.rows.map(row => ({
            objectName: row.object_name,
            totalUsage: parseInt(row.total_usage),
            avgUniqueUsers: parseFloat(row.avg_unique_users) || 0,
            operations: {
              creates: parseInt(row.total_creates),
              reads: parseInt(row.total_reads),
              updates: parseInt(row.total_updates),
              deletes: parseInt(row.total_deletes),
            },
            readPercentage: parseFloat(row.read_percentage) || 0,
          })),
        },
      };

      res.json(response);
    } catch (error) {
      console.error('Error getting usage patterns:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve usage patterns',
      });
    }
  }

  /**
   * Get optimization recommendations
   * GET /api/analytics/recommendations
   */
  static async getOptimizationRecommendations(req: Request, res: Response): Promise<void> {
    try {
      const organization = req.organization;
      const { dateRange = '90' } = req.query as { dateRange?: string };

      const daysBack = parseInt(dateRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      // Find inactive users with expensive licenses
      const inactiveUsersQuery = `
        SELECT
          u.id,
          u.username,
          u.email,
          u.license_type,
          u.last_login,
          COALESCE(SUM(ua.login_count + ua.api_requests + ua.report_runs + ua.dashboard_views), 0) as total_activity
        FROM users u
        LEFT JOIN user_activities ua ON u.id = ua.user_id
          AND ua.activity_date >= $2
        WHERE u.org_id = $1 AND u.is_active = true
        GROUP BY u.id, u.username, u.email, u.license_type, u.last_login
        HAVING COALESCE(SUM(ua.login_count + ua.api_requests + ua.report_runs + ua.dashboard_views), 0) < 5
        ORDER BY u.license_type DESC, u.last_login ASC
        LIMIT 50
      `;

      // Find underutilized objects
      const underutilizedObjectsQuery = `
        SELECT
          object_name,
          SUM(total_interactions) as total_usage,
          AVG(unique_users) as avg_users
        FROM object_usage_summaries
        WHERE org_id = $1 AND summary_date >= $2
        GROUP BY object_name
        HAVING SUM(total_interactions) < 10 AND AVG(unique_users) < 2
        ORDER BY total_usage ASC
        LIMIT 20
      `;

      // Calculate license optimization opportunities
      const licenseAnalysisQuery = `
        SELECT
          license_type,
          total_licenses,
          used_licenses,
          (total_licenses - used_licenses) as unused_licenses,
          utilization_percent
        FROM license_summaries
        WHERE org_id = $1 AND summary_date = (
          SELECT MAX(summary_date)
          FROM license_summaries
          WHERE org_id = $1
        )
      `;

      const [inactiveUsers, underutilizedObjects, licenseAnalysis] = await Promise.all([
        pool.query(inactiveUsersQuery, [organization.id, startDate.toISOString().split('T')[0]]),
        pool.query(underutilizedObjectsQuery, [organization.id, startDate.toISOString().split('T')[0]]),
        pool.query(licenseAnalysisQuery, [organization.id]),
      ]);

      // Generate recommendations
      const recommendations = [];

      // License optimization recommendations
      licenseAnalysis.rows.forEach(license => {
        const unusedCount = license.unused_licenses;
        const utilization = license.utilization_percent;

        if (unusedCount > 0) {
          recommendations.push({
            type: 'license_optimization',
            priority: unusedCount > 10 ? 'high' : 'medium',
            title: `${unusedCount} unused ${license.license_type} licenses`,
            description: `You have ${unusedCount} unused ${license.license_type} licenses that could be reallocated or cancelled to reduce costs.`,
            impact: 'cost_savings',
            action: 'Review and reallocate unused licenses',
            affectedCount: unusedCount,
          });
        }

        if (utilization > 90) {
          recommendations.push({
            type: 'capacity_planning',
            priority: 'medium',
            title: `${license.license_type} licenses at ${utilization}% capacity`,
            description: `Your ${license.license_type} licenses are highly utilized. Consider purchasing additional licenses to accommodate growth.`,
            impact: 'capacity_planning',
            action: 'Plan for additional license purchases',
            affectedCount: license.used_licenses,
          });
        }
      });

      // Inactive user recommendations
      if (inactiveUsers.rows.length > 0) {
        const highValueInactive = inactiveUsers.rows.filter(user =>
          ['Salesforce', 'Full'].includes(user.license_type)
        );

        if (highValueInactive.length > 0) {
          recommendations.push({
            type: 'inactive_users',
            priority: 'high',
            title: `${highValueInactive.length} inactive users with premium licenses`,
            description: `These users have expensive licenses but minimal activity. Consider deactivating or downgrading their licenses.`,
            impact: 'cost_savings',
            action: 'Review and deactivate inactive premium users',
            affectedCount: highValueInactive.length,
          });
        }
      }

      // Object utilization recommendations
      if (underutilizedObjects.rows.length > 0) {
        recommendations.push({
          type: 'object_cleanup',
          priority: 'low',
          title: `${underutilizedObjects.rows.length} underutilized custom objects`,
          description: `Several custom objects have minimal usage. Consider archiving or removing unused objects to improve performance.`,
          impact: 'performance',
          action: 'Review and archive unused custom objects',
          affectedCount: underutilizedObjects.rows.length,
        });
      }

      // Sort recommendations by priority
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      recommendations.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);

      const response: ApiResponse = {
        success: true,
        data: {
          recommendations,
          summary: {
            totalRecommendations: recommendations.length,
            highPriority: recommendations.filter(r => r.priority === 'high').length,
            mediumPriority: recommendations.filter(r => r.priority === 'medium').length,
            lowPriority: recommendations.filter(r => r.priority === 'low').length,
          },
          details: {
            inactiveUsers: inactiveUsers.rows.map(user => ({
              id: user.id,
              username: user.username,
              email: user.email,
              licenseType: user.license_type,
              lastLogin: user.last_login,
              totalActivity: parseInt(user.total_activity),
            })),
            underutilizedObjects: underutilizedObjects.rows.map(obj => ({
              objectName: obj.object_name,
              totalUsage: parseInt(obj.total_usage),
              avgUsers: parseFloat(obj.avg_users) || 0,
            })),
          },
        },
      };

      res.json(response);
    } catch (error) {
      console.error('Error getting optimization recommendations:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve optimization recommendations',
      });
    }
  }
}